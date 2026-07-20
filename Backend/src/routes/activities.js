const express = require('express');
const router = express.Router();
const Activity = require('../models/Activity');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const {
  getDayAnalytics,
  getWeeklyAnalytics,
  getMonthlyAnalytics,
  computeStreak,
  getHeatmapData,
  getDayBounds,
  getActivitiesInRange,
} = require('../utils/analytics');

// @route   POST /api/activities/start
// @desc    Start a new activity (auto-ends previous)
router.post('/start', protect, async (req, res) => {
  try {
    const { name, emoji, category, notes, groupId } = req.body;

    if (!name || !category) {
      return res.status(400).json({ success: false, message: 'Name and category are required' });
    }

    const now = new Date(); // Server timestamp — NEVER use client time

    // End the current ongoing activity
    const previousActivity = await Activity.findOne({
      user: req.user._id,
      endTime: null,
    });

    if (previousActivity) {
      if (previousActivity.isPaused) {
        previousActivity.endTime = previousActivity.pausedAt || now;
      } else {
        previousActivity.endTime = now;
      }
      previousActivity.duration = Math.max(0, Math.floor((previousActivity.endTime - previousActivity.startTime) / 1000) - (previousActivity.totalPausedDuration || 0));
      await previousActivity.save();
    }

    // Create new activity with server timestamp
    const newActivity = await Activity.create({
      user: req.user._id,
      group: groupId || null,
      name,
      emoji: emoji || '📌',
      category,
      notes: notes || '',
      startTime: now, // SERVER TIMESTAMP
    });

    // Update user's current activity reference
    await User.findByIdAndUpdate(req.user._id, {
      currentActivity: newActivity._id,
    });

    // Emit real-time update via socket (accessed via req.io)
    if (req.io) {
      const user = await User.findById(req.user._id).select('username displayName avatar groups');
      req.io.to(`user_${req.user._id}`).emit('activity-updated', {
        userId: req.user._id,
        activity: newActivity,
      });

      // Notify all user's groups of the activity change
      if (user.groups && user.groups.length > 0) {
        for (const gId of user.groups) {
          req.io.to(`group_${gId}`).emit('member-activity-updated', {
            userId: req.user._id,
            user: { username: user.username, displayName: user.displayName, avatar: user.avatar },
            activity: newActivity,
            previousActivity: previousActivity || null,
          });
        }
      }
    }

    res.status(201).json({
      success: true,
      activity: newActivity,
      previousActivity: previousActivity || null,
    });
  } catch (error) {
    console.error('Start activity error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/activities/stop
// @desc    Stop current activity (set status to idle)
router.post('/stop', protect, async (req, res) => {
  try {
    const now = new Date();

    const currentActivity = await Activity.findOne({
      user: req.user._id,
      endTime: null,
    });

    if (!currentActivity) {
      return res.status(404).json({ success: false, message: 'No active activity found' });
    }

    if (currentActivity.isPaused) {
      currentActivity.endTime = currentActivity.pausedAt || now;
    } else {
      currentActivity.endTime = now;
    }
    currentActivity.duration = Math.max(0, Math.floor((currentActivity.endTime - currentActivity.startTime) / 1000) - (currentActivity.totalPausedDuration || 0));
    await currentActivity.save();

    await User.findByIdAndUpdate(req.user._id, { currentActivity: null });

    // Emit real-time update via socket (user went idle)
    if (req.io) {
      const user = await User.findById(req.user._id).select('username displayName avatar groups');
      req.io.to(`user_${req.user._id}`).emit('activity-updated', {
        userId: req.user._id,
        activity: null,
      });

      if (user.groups && user.groups.length > 0) {
        for (const gId of user.groups) {
          req.io.to(`group_${gId}`).emit('member-activity-updated', {
            userId: req.user._id,
            user: { username: user.username, displayName: user.displayName, avatar: user.avatar },
            activity: null,
            previousActivity: currentActivity || null,
          });
        }
      }
    }

    res.json({ success: true, activity: currentActivity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/activities/pause
// @desc    Pause current activity
router.post('/pause', protect, async (req, res) => {
  try {
    const now = new Date();
    const currentActivity = await Activity.findOne({
      user: req.user._id,
      endTime: null,
    });

    if (!currentActivity) {
      return res.status(404).json({ success: false, message: 'No active activity found' });
    }

    if (currentActivity.isPaused) {
      return res.status(400).json({ success: false, message: 'Activity is already paused' });
    }

    currentActivity.isPaused = true;
    currentActivity.pausedAt = now;
    await currentActivity.save();

    // Emit real-time update via socket
    if (req.io) {
      const user = await User.findById(req.user._id).select('username displayName avatar groups');
      req.io.to(`user_${req.user._id}`).emit('activity-updated', {
        userId: req.user._id,
        activity: currentActivity,
      });

      if (user.groups && user.groups.length > 0) {
        for (const gId of user.groups) {
          req.io.to(`group_${gId}`).emit('member-activity-updated', {
            userId: req.user._id,
            user: { username: user.username, displayName: user.displayName, avatar: user.avatar },
            activity: currentActivity,
          });
        }
      }
    }

    res.json({ success: true, activity: currentActivity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/activities/resume
// @desc    Resume current activity
router.post('/resume', protect, async (req, res) => {
  try {
    const now = new Date();
    const currentActivity = await Activity.findOne({
      user: req.user._id,
      endTime: null,
    });

    if (!currentActivity) {
      return res.status(404).json({ success: false, message: 'No active activity found' });
    }

    if (!currentActivity.isPaused) {
      return res.status(400).json({ success: false, message: 'Activity is not paused' });
    }

    const pausedSec = Math.max(0, Math.floor((now - currentActivity.pausedAt) / 1000));
    currentActivity.totalPausedDuration = (currentActivity.totalPausedDuration || 0) + pausedSec;
    currentActivity.isPaused = false;
    currentActivity.pausedAt = null;
    await currentActivity.save();

    // Emit real-time update via socket
    if (req.io) {
      const user = await User.findById(req.user._id).select('username displayName avatar groups');
      req.io.to(`user_${req.user._id}`).emit('activity-updated', {
        userId: req.user._id,
        activity: currentActivity,
      });

      if (user.groups && user.groups.length > 0) {
        for (const gId of user.groups) {
          req.io.to(`group_${gId}`).emit('member-activity-updated', {
            userId: req.user._id,
            user: { username: user.username, displayName: user.displayName, avatar: user.avatar },
            activity: currentActivity,
          });
        }
      }
    }

    res.json({ success: true, activity: currentActivity });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/current
// @desc    Get current ongoing activity with server-computed elapsed time
router.get('/current', protect, async (req, res) => {
  try {
    const activity = await Activity.findOne({
      user: req.user._id,
      endTime: null,
    });

    if (!activity) {
      return res.json({ success: true, activity: null, elapsed: 0 });
    }

    const now = new Date();
    let elapsed = 0;
    if (activity.isPaused) {
      elapsed = Math.max(0, Math.floor((activity.pausedAt - activity.startTime) / 1000) - (activity.totalPausedDuration || 0));
    } else {
      elapsed = Math.max(0, Math.floor((now - activity.startTime) / 1000) - (activity.totalPausedDuration || 0));
    }

    res.json({
      success: true,
      activity,
      elapsed, // Client uses this as truth, not its own timer
      serverTime: now.toISOString(),
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/history
// @desc    Get paginated activity history
router.get('/history', protect, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await Activity.countDocuments({ user: req.user._id, endTime: { $ne: null } });
    const activities = await Activity.find({ user: req.user._id, endTime: { $ne: null } })
      .sort({ startTime: -1 })
      .skip(skip)
      .limit(limit);

    res.json({
      success: true,
      activities,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/timeline
// @desc    Get full day timeline
router.get('/timeline', protect, async (req, res) => {
  try {
    const dateStr = req.query.date;
    const targetUserId = req.query.userId || req.user._id;
    const date = dateStr ? new Date(dateStr) : new Date();
    const { start, end } = getDayBounds(date);

    const activities = await getActivitiesInRange(targetUserId, start, end);

    res.json({ success: true, activities, date: start });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/analytics/daily
router.get('/analytics/daily', protect, async (req, res) => {
  try {
    const dateStr = req.query.date;
    const targetUserId = req.query.userId || req.user._id;
    const date = dateStr ? new Date(dateStr) : new Date();
    const analytics = await getDayAnalytics(targetUserId, date);
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/analytics/weekly
router.get('/analytics/weekly', protect, async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;
    const analytics = await getWeeklyAnalytics(targetUserId);
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/analytics/monthly
router.get('/analytics/monthly', protect, async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;
    const analytics = await getMonthlyAnalytics(targetUserId);
    res.json({ success: true, analytics });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/analytics/heatmap
router.get('/analytics/heatmap', protect, async (req, res) => {
  try {
    const targetUserId = req.query.userId || req.user._id;
    const data = await getHeatmapData(targetUserId);
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/activities/analytics/streak
router.get('/analytics/streak', protect, async (req, res) => {
  try {
    const streakData = await computeStreak(req.user._id);
    // Update user streak in DB
    await User.findByIdAndUpdate(req.user._id, {
      streak: streakData.streak,
      longestStreak: Math.max(req.user.longestStreak || 0, streakData.longestStreak),
    });
    res.json({ success: true, ...streakData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
