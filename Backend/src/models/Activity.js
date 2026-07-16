const mongoose = require('mongoose');

const CATEGORIES = {
  study: { label: 'Study', isProductive: true, color: '#6366f1' },
  coding: { label: 'Coding', isProductive: true, color: '#8b5cf6' },
  reading: { label: 'Reading', isProductive: true, color: '#06b6d4' },
  exercise: { label: 'Exercise', isProductive: true, color: '#10b981' },
  break: { label: 'Break', isProductive: false, color: '#f59e0b' },
  meal: { label: 'Meal', isProductive: false, color: '#f97316' },
  sleep: { label: 'Sleep', isProductive: false, color: '#3b82f6' },
  entertainment: { label: 'Entertainment', isProductive: false, color: '#ec4899' },
  social: { label: 'Social', isProductive: false, color: '#a855f7' },
  other: { label: 'Other', isProductive: false, color: '#6b7280' },
};

const activitySchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    default: null,
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100,
  },
  emoji: {
    type: String,
    default: '📌',
  },
  category: {
    type: String,
    enum: Object.keys(CATEGORIES),
    default: 'other',
  },
  // SERVER-SIDE timestamps — never trust client for these
  startTime: {
    type: Date,
    required: true,
    default: Date.now,
  },
  endTime: {
    type: Date,
    default: null, // null = currently ongoing
  },
  // Duration in seconds — computed when endTime is set
  duration: {
    type: Number,
    default: null, // null = ongoing
  },
  isProductive: {
    type: Boolean,
    default: false,
  },
  notes: {
    type: String,
    maxlength: 500,
    default: '',
  },
  xpEarned: {
    type: Number,
    default: 0,
  },
}, { timestamps: true });

// Index for fast analytics queries
activitySchema.index({ user: 1, startTime: -1 });
activitySchema.index({ user: 1, category: 1, startTime: -1 });
activitySchema.index({ group: 1, startTime: -1 });

// Auto-compute duration when endTime is set
activitySchema.pre('save', function (next) {
  if (this.endTime && this.startTime && !this.duration) {
    this.duration = Math.floor((this.endTime - this.startTime) / 1000); // seconds
  }
  // Set isProductive from category
  if (this.category && CATEGORIES[this.category]) {
    this.isProductive = CATEGORIES[this.category].isProductive;
  }
  next();
});

// Virtual for display duration
activitySchema.virtual('durationFormatted').get(function () {
  if (!this.duration) return null;
  const h = Math.floor(this.duration / 3600);
  const m = Math.floor((this.duration % 3600) / 60);
  const s = this.duration % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
});

activitySchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('Activity', activitySchema);
module.exports.CATEGORIES = CATEGORIES;
