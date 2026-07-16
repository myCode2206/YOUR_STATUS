const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Activity = require('../models/Activity');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { uploadAvatar } = require('../middleware/upload');
const { saveUploadedFile } = require('../utils/fileSaver');
const { getDayAnalytics, getWeeklyAnalytics, computeStreak, computeXP, formatDuration } = require('../utils/analytics');

// @route   GET /api/users/:id/profile
// @desc    Get public user profile
router.get('/:id/profile', protect, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('currentActivity', 'name emoji category startTime')
      .populate('groups', 'name avatar');

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const now = new Date();
    const userObj = user.toJSON();
    if (userObj.currentActivity?.startTime) {
      userObj.currentActivity.elapsed = Math.floor(
        (now - new Date(userObj.currentActivity.startTime)) / 1000
      );
    }

    // Get today's stats
    const todayStats = await getDayAnalytics(user._id);
    const weekStats = await getWeeklyAnalytics(user._id);

    res.json({
      success: true,
      user: userObj,
      stats: {
        today: {
          studySeconds: todayStats.studySeconds,
          productiveSeconds: todayStats.productiveSeconds,
          sessions: todayStats.studySessions,
        },
        weekly: {
          totalStudySeconds: weekStats.totalStudySeconds,
          avgStudySeconds: weekStats.avgStudySeconds,
        },
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/me
// @desc    Update own profile
router.put('/me', protect, async (req, res) => {
  try {
    const { displayName, bio, studyGoal } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (studyGoal) updates.studyGoal = parseInt(studyGoal);

    const user = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    }).select('-password');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/users/me/avatar
// @desc    Upload avatar — resized to 200x200 JPEG, stored as base64 data URI in MongoDB
//          This bypasses Firebase Storage / local disk entirely and works on Vercel.
router.post('/me/avatar', protect, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded' });

    const sharp = require('sharp');

    // Resize to 200×200, convert to JPEG at 80% quality (~15–20 KB)
    const compressedBuffer = await sharp(req.file.buffer)
      .resize(200, 200, { fit: 'cover', position: 'center' })
      .jpeg({ quality: 80 })
      .toBuffer();

    // Encode as data URI so it can be embedded directly in <img src>
    const dataUri = `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { avatar: dataUri },
      { new: true }
    ).select('-password');

    res.json({ success: true, avatar: dataUri, user });
  } catch (error) {
    console.error('Avatar upload error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});


// @route   GET /api/users/me/stats
// @desc    Get full stats for current user
router.get('/me/stats', protect, async (req, res) => {
  try {
    const [today, week, streakData] = await Promise.all([
      getDayAnalytics(req.user._id),
      getWeeklyAnalytics(req.user._id),
      computeStreak(req.user._id),
    ]);

    // All-time study hours
    const allTime = await Activity.aggregate([
      {
        $match: {
          user: req.user._id,
          category: { $in: ['study', 'coding', 'reading'] },
          endTime: { $ne: null },
        },
      },
      {
        $group: {
          _id: null,
          totalSeconds: { $sum: '$duration' },
          sessions: { $sum: 1 },
          longestSession: { $max: '$duration' },
        },
      },
    ]);

    const allTimeData = allTime[0] || { totalSeconds: 0, sessions: 0, longestSession: 0 };

    // Compute fresh XP based on all-time study
    const freshXP = computeXP(allTimeData.totalSeconds, today.productiveSeconds > 0, streakData.streak);
    const freshLevel = Math.floor(freshXP / 500) + 1;
    const newLongestStreak = Math.max(req.user.longestStreak || 0, streakData.longestStreak);

    // Persist updated streak + xp to DB (async, don't await so response is fast)
    User.findByIdAndUpdate(req.user._id, {
      streak: streakData.streak,
      longestStreak: newLongestStreak,
      xp: freshXP,
      level: freshLevel,
    }).catch(() => {});

    res.json({
      success: true,
      stats: {
        today: {
          studySeconds: today.studySeconds,
          productiveSeconds: today.productiveSeconds,
          breakdown: today.breakdown,
          sessions: today.studySessions,
          longestSession: today.longestSession,
        },
        weekly: {
          days: week.days,
          totalStudySeconds: week.totalStudySeconds,
          avgStudySeconds: week.avgStudySeconds,
          totalProductiveSeconds: week.totalProductiveSeconds,
        },
        allTime: allTimeData,
        streak: streakData.streak,
        longestStreak: newLongestStreak,
        xp: freshXP,
        level: freshLevel,
        studyGoal: req.user.studyGoal,
        goalProgress: Math.min(100, Math.round((today.studySeconds / (req.user.studyGoal * 60)) * 100)),
      },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/users/me/notifications
router.get('/me/notifications', protect, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'username displayName avatar');

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      read: false,
    });

    res.json({ success: true, notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/users/me/notifications/read
router.put('/me/notifications/read', protect, async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user._id, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
