const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  type: {
    type: String,
    enum: [
      'inactivity',       // User has been inactive too long
      'goal_reminder',    // Daily goal not completed
      'milestone',        // Friend reached a milestone
      'new_post',         // Someone posted in group
      'leaderboard_top',  // Someone became #1
      'new_comment',      // Someone commented on your post
      'new_like',         // Someone liked your post
      'friend_joined',    // Friend joined the group
      'achievement',      // User unlocked achievement
      'streak_reminder',  // Streak at risk
    ],
    required: true,
  },
  title: {
    type: String,
    maxlength: 100,
  },
  message: {
    type: String,
    required: true,
    maxlength: 300,
  },
  read: {
    type: Boolean,
    default: false,
  },
  link: {
    type: String,
    default: null,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, { timestamps: true });

notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
