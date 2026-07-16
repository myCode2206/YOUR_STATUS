const Activity = require('../models/Activity');
const { CATEGORIES } = require('../models/Activity');

/**
 * Get the start and end of a given date (local midnight to midnight)
 */
function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get activities for a user within a time range, including the ongoing one
 */
async function getActivitiesInRange(userId, startDate, endDate) {
  return Activity.find({
    user: userId,
    $or: [
      // Activities that started within range
      { startTime: { $gte: startDate, $lte: endDate } },
      // Ongoing activity (no endTime) that started before range end
      { endTime: null, startTime: { $lte: endDate } },
      // Activities that started before range but ended within range
      { startTime: { $lt: startDate }, endTime: { $gte: startDate } },
    ],
  }).sort({ startTime: 1 });
}

/**
 * Compute time breakdown by category for a set of activities
 * Handles partial activities at range boundaries
 */
function computeCategoryBreakdown(activities, rangeStart, rangeEnd) {
  const now = new Date();
  const breakdown = {};

  // Initialize all categories
  Object.keys(CATEGORIES).forEach(cat => {
    breakdown[cat] = {
      ...CATEGORIES[cat],
      seconds: 0,
      sessions: 0,
    };
  });

  for (const activity of activities) {
    const start = activity.startTime < rangeStart ? rangeStart : activity.startTime;
    const end = activity.endTime
      ? (activity.endTime > rangeEnd ? rangeEnd : activity.endTime)
      : (now > rangeEnd ? rangeEnd : now); // ongoing — use now or rangeEnd

    const seconds = Math.max(0, Math.floor((end - start) / 1000));
    if (seconds > 0 && breakdown[activity.category]) {
      breakdown[activity.category].seconds += seconds;
      breakdown[activity.category].sessions += 1;
    }
  }

  return breakdown;
}

/**
 * Get daily analytics for a user
 */
async function getDayAnalytics(userId, date = new Date()) {
  const { start, end } = getDayBounds(date);
  const activities = await getActivitiesInRange(userId, start, end);
  const breakdown = computeCategoryBreakdown(activities, start, end);

  const now = new Date();
  const totalTrackedSeconds = Object.values(breakdown).reduce((sum, c) => sum + c.seconds, 0);
  const productiveSeconds = Object.values(breakdown)
    .filter(c => c.isProductive)
    .reduce((sum, c) => sum + c.seconds, 0);
  const nonProductiveSeconds = totalTrackedSeconds - productiveSeconds;

  // Study-specific stats
  const studySeconds = (breakdown.study?.seconds || 0) + (breakdown.coding?.seconds || 0) + (breakdown.reading?.seconds || 0);

  // Find longest session
  const completedActivities = activities.filter(a => a.endTime);
  const longestSession = completedActivities.reduce((max, a) => {
    return (a.duration || 0) > max ? (a.duration || 0) : max;
  }, 0);

  const studySessions = activities.filter(a =>
    ['study', 'coding', 'reading'].includes(a.category)
  ).length;

  return {
    date: start,
    breakdown,
    totalTrackedSeconds,
    productiveSeconds,
    nonProductiveSeconds,
    studySeconds,
    longestSession,
    studySessions,
    averageSessionSeconds: studySessions > 0 ? Math.floor(studySeconds / studySessions) : 0,
    activities: activities.length,
  };
}

/**
 * Get weekly analytics (last 7 days)
 */
async function getWeeklyAnalytics(userId) {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const analytics = await getDayAnalytics(userId, date);
    days.push({
      ...analytics,
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr: date.toISOString().split('T')[0],
    });
  }

  const totalStudySeconds = days.reduce((sum, d) => sum + d.studySeconds, 0);
  const avgStudySeconds = Math.floor(totalStudySeconds / 7);
  const totalProductiveSeconds = days.reduce((sum, d) => sum + d.productiveSeconds, 0);

  return { days, totalStudySeconds, avgStudySeconds, totalProductiveSeconds };
}

/**
 * Get monthly analytics (last 30 days)
 */
async function getMonthlyAnalytics(userId) {
  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const analytics = await getDayAnalytics(userId, date);
    days.push({
      ...analytics,
      dateStr: date.toISOString().split('T')[0],
    });
  }

  const totalStudySeconds = days.reduce((sum, d) => sum + d.studySeconds, 0);
  const avgStudySeconds = Math.floor(totalStudySeconds / 30);
  const totalProductiveSeconds = days.reduce((sum, d) => sum + d.productiveSeconds, 0);
  const activeDays = days.filter(d => d.studySeconds > 0).length;

  return { days, totalStudySeconds, avgStudySeconds, totalProductiveSeconds, activeDays };
}

/**
 * Compute a user's current streak (consecutive days with study > 0)
 */
async function computeStreak(userId) {
  let streak = 0;
  let longestStreak = 0;
  let tempStreak = 0;
  let checking = true;
  let i = 0;

  while (checking && i < 365) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const { start, end } = getDayBounds(date);

    const activities = await Activity.find({
      user: userId,
      category: { $in: ['study', 'coding', 'reading'] },
      $or: [
        { startTime: { $gte: start, $lte: end } },
        { startTime: { $lt: start }, endTime: { $gte: start } },
      ],
    }).select('duration startTime endTime');

    const totalStudy = activities.reduce((sum, a) => sum + (a.duration || 0), 0);

    if (totalStudy >= 60) { // At least 1 minute of study to count for a streak day
      tempStreak++;
      if (i === 0 || streak > 0) streak = tempStreak; // Only count current streak
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else if (i === 0) {
      // Today's data: don't break streak yet (day isn't over)
      tempStreak++;
    } else {
      checking = false;
    }
    i++;
  }

  return { streak: tempStreak > 1 ? tempStreak - 1 : 0, longestStreak };
}

/**
 * Compute XP points from study time
 */
function computeXP(studySeconds, productive, streak) {
  let xp = Math.floor(studySeconds / 60); // 1 XP per minute of study
  if (productive) xp += Math.floor(xp * 0.5); // 50% bonus for productive time
  xp += streak * 10; // 10 XP per streak day
  return xp;
}

/**
 * Get heatmap data (last 90 days)
 */
async function getHeatmapData(userId) {
  const result = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const { start, end } = getDayBounds(date);

    const agg = await Activity.aggregate([
      {
        $match: {
          user: userId,
          category: { $in: ['study', 'coding', 'reading'] },
          startTime: { $gte: start, $lte: end },
          endTime: { $ne: null },
        },
      },
      { $group: { _id: null, total: { $sum: '$duration' } } },
    ]);

    const seconds = agg[0]?.total || 0;
    result.push({
      date: date.toISOString().split('T')[0],
      seconds,
      level: seconds === 0 ? 0 : seconds < 1800 ? 1 : seconds < 3600 ? 2 : seconds < 7200 ? 3 : 4,
    });
  }
  return result;
}

/**
 * Format seconds to human readable
 */
function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0m';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0 && m > 0) return `${h}h ${m}m`;
  if (h > 0) return `${h}h`;
  return `${m}m`;
}

module.exports = {
  getDayAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  computeStreak,
  computeXP,
  getHeatmapData,
  formatDuration,
  getDayBounds,
  getActivitiesInRange,
};
