const mongoose = require('mongoose');
const Activity = require('../models/Activity');
const { CATEGORIES } = require('../models/Activity');

/**
 * Get the start and end of a given date (UTC midnight to midnight)
 */
function getDayBounds(date = new Date()) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/**
 * Get activities for a user within a time range
 */
async function getActivitiesInRange(userId, startDate, endDate) {
  return Activity.find({
    user: userId,
    $or: [
      { startTime: { $gte: startDate, $lte: endDate } },
      { endTime: null, startTime: { $lte: endDate } },
      { startTime: { $lt: startDate }, endTime: { $gte: startDate } },
    ],
  }).sort({ startTime: 1 });
}

/**
 * Compute time breakdown by category for a set of activities
 */
function computeCategoryBreakdown(activities, rangeStart, rangeEnd) {
  const now = new Date();
  const breakdown = {};

  Object.keys(CATEGORIES).forEach(cat => {
    breakdown[cat] = { ...CATEGORIES[cat], seconds: 0, sessions: 0 };
  });

  for (const activity of activities) {
    const start = activity.startTime < rangeStart ? rangeStart : activity.startTime;
    const end = activity.endTime
      ? (activity.endTime > rangeEnd ? rangeEnd : activity.endTime)
      : (now > rangeEnd ? rangeEnd : now);

    const seconds = Math.max(0, Math.floor((end - start) / 1000));
    if (seconds > 0 && breakdown[activity.category]) {
      breakdown[activity.category].seconds += seconds;
      breakdown[activity.category].sessions += 1;
    }
  }
  return breakdown;
}

/**
 * Get daily analytics for a user (single DB query)
 */
async function getDayAnalytics(userId, date = new Date()) {
  const { start, end } = getDayBounds(date);
  const activities = await getActivitiesInRange(userId, start, end);
  const breakdown = computeCategoryBreakdown(activities, start, end);

  const totalTrackedSeconds = Object.values(breakdown).reduce((sum, c) => sum + c.seconds, 0);
  const productiveSeconds = Object.values(breakdown)
    .filter(c => c.isProductive)
    .reduce((sum, c) => sum + c.seconds, 0);
  const nonProductiveSeconds = totalTrackedSeconds - productiveSeconds;

  const studySeconds = (breakdown.study?.seconds || 0) + (breakdown.coding?.seconds || 0) + (breakdown.reading?.seconds || 0);

  const completedActivities = activities.filter(a => a.endTime);
  const longestSession = completedActivities.reduce((max, a) => Math.max(max, a.duration || 0), 0);
  const studySessions = activities.filter(a => ['study', 'coding', 'reading'].includes(a.category)).length;

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
 * Get weekly analytics using a SINGLE aggregate query (replaces 7 sequential queries)
 */
async function getWeeklyAnalytics(userId) {
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  // Build the 7-day date range
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 6);
  weekAgo.setHours(0, 0, 0, 0);

  // One aggregate for all 7 days grouped by date string
  const agg = await Activity.aggregate([
    {
      $match: {
        user: userObjId,
        startTime: { $gte: weekAgo, $lte: today },
        endTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: '%Y-%m-%d', date: '$startTime' },
        },
        totalSeconds: { $sum: '$duration' },
        studySeconds: {
          $sum: {
            $cond: [{ $in: ['$category', ['study', 'coding', 'reading']] }, '$duration', 0],
          },
        },
        productiveSeconds: {
          $sum: {
            $cond: [{ $in: ['$category', ['study', 'coding', 'reading', 'exercise']] }, '$duration', 0],
          },
        },
        sessions: { $sum: 1 },
      },
    },
  ]);

  // Build a map of date → data
  const dataMap = {};
  agg.forEach(d => { dataMap[d._id] = d; });

  // Build 7-day array (filling in zeros for missing days)
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const d = dataMap[dateStr] || { totalSeconds: 0, studySeconds: 0, productiveSeconds: 0, sessions: 0 };

    days.push({
      date: new Date(dateStr),
      dayLabel: date.toLocaleDateString('en-US', { weekday: 'short' }),
      dateStr,
      studySeconds: d.studySeconds,
      productiveSeconds: d.productiveSeconds,
      totalTrackedSeconds: d.totalSeconds,
      studySessions: d.sessions,
    });
  }

  const totalStudySeconds = days.reduce((sum, d) => sum + d.studySeconds, 0);
  const avgStudySeconds = Math.floor(totalStudySeconds / 7);
  const totalProductiveSeconds = days.reduce((sum, d) => sum + d.productiveSeconds, 0);

  return { days, totalStudySeconds, avgStudySeconds, totalProductiveSeconds };
}

/**
 * Get monthly analytics using a SINGLE aggregate query (replaces 30 sequential queries)
 */
async function getMonthlyAnalytics(userId) {
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const today = new Date();
  today.setHours(23, 59, 59, 999);
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 29);
  monthAgo.setHours(0, 0, 0, 0);

  const agg = await Activity.aggregate([
    {
      $match: {
        user: userObjId,
        startTime: { $gte: monthAgo, $lte: today },
        endTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        studySeconds: {
          $sum: {
            $cond: [{ $in: ['$category', ['study', 'coding', 'reading']] }, '$duration', 0],
          },
        },
        productiveSeconds: {
          $sum: {
            $cond: [{ $in: ['$category', ['study', 'coding', 'reading', 'exercise']] }, '$duration', 0],
          },
        },
      },
    },
  ]);

  const dataMap = {};
  agg.forEach(d => { dataMap[d._id] = d; });

  const days = [];
  for (let i = 29; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const d = dataMap[dateStr] || { studySeconds: 0, productiveSeconds: 0 };
    days.push({ date: new Date(dateStr), dateStr, studySeconds: d.studySeconds, productiveSeconds: d.productiveSeconds });
  }

  const totalStudySeconds = days.reduce((sum, d) => sum + d.studySeconds, 0);
  const avgStudySeconds = Math.floor(totalStudySeconds / 30);
  const totalProductiveSeconds = days.reduce((sum, d) => sum + d.productiveSeconds, 0);
  const activeDays = days.filter(d => d.studySeconds > 0).length;

  return { days, totalStudySeconds, avgStudySeconds, totalProductiveSeconds, activeDays };
}

/**
 * Compute streak using a SINGLE aggregate query (replaces up to 365 sequential queries)
 */
async function computeStreak(userId) {
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  // ONE aggregate: get all days with >= 60s of study, sorted descending
  const agg = await Activity.aggregate([
    {
      $match: {
        user: userObjId,
        category: { $in: ['study', 'coding', 'reading'] },
        endTime: { $ne: null },
        duration: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        totalSeconds: { $sum: '$duration' },
      },
    },
    { $match: { totalSeconds: { $gte: 60 } } },
    { $sort: { _id: -1 } }, // most recent first
  ]);

  if (agg.length === 0) return { streak: 0, longestStreak: 0 };

  const activeDays = new Set(agg.map(d => d._id));
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  // Current streak: walk backwards from today
  let streak = 0;
  let checkDate = activeDays.has(today) ? today : (activeDays.has(yesterday) ? yesterday : null);
  if (checkDate) {
    const d = new Date(checkDate);
    while (true) {
      const dateStr = d.toISOString().split('T')[0];
      if (activeDays.has(dateStr)) {
        streak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest streak: walk through sorted days and find max consecutive
  const sortedDays = [...activeDays].sort();
  let longestStreak = 0;
  let tempStreak = 1;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const curr = new Date(sortedDays[i]);
    const diffDays = Math.round((curr - prev) / 86400000);
    if (diffDays === 1) {
      tempStreak++;
      if (tempStreak > longestStreak) longestStreak = tempStreak;
    } else {
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, streak, sortedDays.length > 0 ? 1 : 0);

  return { streak, longestStreak };
}

/**
 * Compute XP points from study time
 */
function computeXP(studySeconds, productive, streak) {
  let xp = Math.floor(studySeconds / 60);
  if (productive) xp += Math.floor(xp * 0.5);
  xp += streak * 10;
  return xp;
}

/**
 * Get heatmap data using a SINGLE aggregate query (replaces 90 sequential queries)
 */
async function getHeatmapData(userId) {
  const userObjId = typeof userId === 'string' ? new mongoose.Types.ObjectId(userId) : userId;

  const ninetyDaysAgo = new Date();
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 89);
  ninetyDaysAgo.setHours(0, 0, 0, 0);

  const agg = await Activity.aggregate([
    {
      $match: {
        user: userObjId,
        category: { $in: ['study', 'coding', 'reading'] },
        startTime: { $gte: ninetyDaysAgo },
        endTime: { $ne: null },
      },
    },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$startTime' } },
        seconds: { $sum: '$duration' },
      },
    },
  ]);

  const dataMap = {};
  agg.forEach(d => { dataMap[d._id] = d.seconds; });

  const result = [];
  for (let i = 89; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const seconds = dataMap[dateStr] || 0;
    result.push({
      date: dateStr,
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
