const mongoose = require('mongoose');
const { customAlphabet } = require('nanoid');

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 8);

const groupSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 60,
  },
  description: {
    type: String,
    maxlength: 300,
    default: '',
  },
  avatar: {
    type: String,
    default: '',
  },
  inviteCode: {
    type: String,
    unique: true,
    default: () => nanoid(),
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  settings: {
    maxMembers: { type: Number, default: 10 },
    isPrivate: { type: Boolean, default: true },
    allowMemberPosts: { type: Boolean, default: true },
    dailyGoalMinutes: { type: Number, default: 480 },
  },
}, { timestamps: true });

// Ensure owner is also in members
groupSchema.pre('save', function (next) {
  if (!this.members.includes(this.owner)) {
    this.members.push(this.owner);
  }
  next();
});

// Regenerate invite code
groupSchema.methods.regenerateInviteCode = async function () {
  this.inviteCode = nanoid();
  await this.save();
  return this.inviteCode;
};

module.exports = mongoose.model('Group', groupSchema);
