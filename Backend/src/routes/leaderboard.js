const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');
const { getDayBounds, getWeeklyAnalytics, getMonthlyAnalytics } = require('../utils/analytics');

const BADGES = {
  top_performer: { id: 'top_performer', name: 'Top Performer', emoji: '🥇', color: '#f59e0b' },
  on_fire: { id: 'on_fire', name: 'On Fire', emoji: '🔥', color: '#ef4444' },
  study_master: { id: 'study_master', name: 'Study Master', emoji: '📚', color: '#6366f1' },
  consistent: { id: 'consistent', name: 'Consistent', emoji: '⚡', color: '#10b981' },
  weekly_winner: { id: 'weekly_winner', name: 'Weekly Winner', emoji: '🏆', color: '#8b5cf6' },
};

async function getMemberStats(userId, period = 'daily') {
  const now = new Date();

  // Fetch current ongoing study activity if any
  const activeActivity = await Activity.findOne({
    user: userId,
    endTime: null,
    category: { $in: ['study', 'coding', 'reading'] },
  });

  if (period === 'daily') {
    const { start, end } = getDayBounds(now);
    const result = await Activity.aggregate([
      {
        $match: {
          user: userId,
          category: { $in: ['study', 'coding', 'reading'] },
          startTime: { $gte: start },
          endTime: { $ne: null },
        },
      },
      { $group: { _id: null, totalSeconds: { $sum: '$duration' }, sessions: { $sum: 1 } } },
    ]);

    let activeSeconds = 0;
    let activeSessionCount = 0;
    if (activeActivity) {
      const effectiveStart = activeActivity.startTime < start ? start : activeActivity.startTime;
      if (effectiveStart < now) {
        activeSeconds = Math.floor((now - effectiveStart) / 1000);
        activeSessionCount = 1;
      }
    }

    return {
      totalSeconds: (result[0]?.totalSeconds || 0) + activeSeconds,
      sessions: (result[0]?.sessions || 0) + activeSessionCount,
    };
  }

  if (period === 'weekly') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const result = await Activity.aggregate([
      {
        $match: {
          user: userId,
          category: { $in: ['study', 'coding', 'reading'] },
          startTime: { $gte: startOfWeek },
          endTime: { $ne: null },
        },
      },
      { $group: { _id: null, totalSeconds: { $sum: '$duration' }, sessions: { $sum: 1 } } },
    ]);

    let activeSeconds = 0;
    let activeSessionCount = 0;
    if (activeActivity) {
      const effectiveStart = activeActivity.startTime < startOfWeek ? startOfWeek : activeActivity.startTime;
      if (effectiveStart < now) {
        activeSeconds = Math.floor((now - effectiveStart) / 1000);
        activeSessionCount = 1;
      }
    }

    return {
      totalSeconds: (result[0]?.totalSeconds || 0) + activeSeconds,
      sessions: (result[0]?.sessions || 0) + activeSessionCount,
    };
  }

  if (period === 'monthly') {
    const monthAgo = new Date(now);
    monthAgo.setDate(monthAgo.getDate() - 30);
    monthAgo.setHours(0, 0, 0, 0);

    const result = await Activity.aggregate([
      {
        $match: {
          user: userId,
          category: { $in: ['study', 'coding', 'reading'] },
          startTime: { $gte: monthAgo },
          endTime: { $ne: null },
        },
      },
      { $group: { _id: null, totalSeconds: { $sum: '$duration' }, sessions: { $sum: 1 } } },
    ]);

    let activeSeconds = 0;
    let activeSessionCount = 0;
    if (activeActivity) {
      const effectiveStart = activeActivity.startTime < monthAgo ? monthAgo : activeActivity.startTime;
      if (effectiveStart < now) {
        activeSeconds = Math.floor((now - effectiveStart) / 1000);
        activeSessionCount = 1;
      }
    }

    return {
      totalSeconds: (result[0]?.totalSeconds || 0) + activeSeconds,
      sessions: (result[0]?.sessions || 0) + activeSessionCount,
    };
  }

  if (period === 'allTime') {
    const result = await Activity.aggregate([
      {
        $match: {
          user: userId,
          category: { $in: ['study', 'coding', 'reading'] },
          endTime: { $ne: null },
        },
      },
      { $group: { _id: null, totalSeconds: { $sum: '$duration' }, sessions: { $sum: 1 } } },
    ]);

    let activeSeconds = 0;
    let activeSessionCount = 0;
    if (activeActivity) {
      activeSeconds = Math.floor((now - activeActivity.startTime) / 1000);
      activeSessionCount = 1;
    }

    return {
      totalSeconds: (result[0]?.totalSeconds || 0) + activeSeconds,
      sessions: (result[0]?.sessions || 0) + activeSessionCount,
    };
  }

  return { totalSeconds: 0, sessions: 0 };
}

// @route   GET /api/leaderboard/:groupId
// @desc    Get group leaderboard with rankings
router.get('/:groupId', protect, async (req, res) => {
  try {
    const period = req.query.period || 'daily'; // daily | weekly | monthly

    const group = await Group.findById(req.params.groupId).populate({
      path: 'members',
      select: 'username displayName avatar streak longestStreak xp level currentActivity isOnline',
      populate: { path: 'currentActivity', select: 'name emoji category startTime' },
    });

    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member' });

    // Compute stats for each member in parallel
    const now = new Date();
    const memberStats = await Promise.all(
      group.members.map(async (member) => {
        const stats = await getMemberStats(member._id, period);
        const memberObj = member.toJSON();

        // Add elapsed time to current activity if ongoing
        if (memberObj.currentActivity?.startTime) {
          memberObj.currentActivity.elapsed = Math.floor(
            (now - new Date(memberObj.currentActivity.startTime)) / 1000
          );
        }

        return {
          ...memberObj,
          stats,
          score: stats.totalSeconds, // Primary ranking metric
        };
      })
    );

    // Sort by score descending
    memberStats.sort((a, b) => b.score - a.score);

    // Assign ranks and badges
    const rankedMembers = memberStats.map((member, index) => {
      const rank = index + 1;
      const badges = [];

      if (rank === 1 && member.score > 0) badges.push(BADGES.top_performer);
      if (member.streak >= 7) badges.push(BADGES.on_fire);
      if (member.stats.totalSeconds >= 6 * 3600) badges.push(BADGES.study_master);
      if (member.streak >= 3) badges.push(BADGES.consistent);

      return { ...member, rank, badges };
    });

    // Stats for context
    const totalGroupStudy = memberStats.reduce((sum, m) => sum + m.score, 0);
    const mostActive = memberStats[0] || null;

    res.json({
      success: true,
      leaderboard: rankedMembers,
      period,
      meta: {
        totalGroupStudySeconds: totalGroupStudy,
        mostActiveUserId: mostActive?._id,
        memberCount: group.members.length,
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
