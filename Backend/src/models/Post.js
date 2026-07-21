const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    default: '',
    maxlength: 500,
  },
  mediaUrl: {
    type: String,
    default: null,
  },
  mediaType: {
    type: String,
    enum: ['image', 'video', 'audio', 'pdf', null],
    default: null,
  },
}, { timestamps: true });

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  group: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Group',
    required: true,
    index: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'video', 'audio', 'pdf'],
    default: 'text',
  },
  content: {
    type: String,
    maxlength: 2000,
    default: '',
  },
  // Media file info (for local storage)
  mediaUrl: {
    type: String,
    default: null,
  },
  mediaFilename: {
    type: String,
    default: null,
  },
  mediaMimetype: {
    type: String,
    default: null,
  },
  mediaSize: {
    type: Number,
    default: null,
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  comments: [commentSchema],
  // For achievement posts
  isAchievement: { type: Boolean, default: false },
  achievementData: {
    title: String,
    description: String,
    emoji: String,
  },
}, { timestamps: true });

postSchema.index({ group: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
