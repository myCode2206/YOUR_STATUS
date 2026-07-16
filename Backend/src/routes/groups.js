const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const User = require('../models/User');
const Activity = require('../models/Activity');
const { protect } = require('../middleware/auth');

// @route   POST /api/groups
// @desc    Create a new group
router.post('/', protect, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ success: false, message: 'Group name is required' });

    const group = await Group.create({
      name,
      description: description || '',
      owner: req.user._id,
      members: [req.user._id],
    });

    // Add group to user's groups list
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: group._id },
    });

    await group.populate('owner', 'username displayName avatar');

    res.status(201).json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/groups/:id
// @desc    Get group info
router.get('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id)
      .populate('owner', 'username displayName avatar')
      .populate({
        path: 'members',
        select: 'username displayName avatar bio isOnline lastSeen streak currentActivity',
        populate: { path: 'currentActivity', select: 'name emoji category startTime' },
      });

    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member' });

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/groups/join
// @desc    Join group via invite code
router.post('/join', protect, async (req, res) => {
  try {
    const { inviteCode } = req.body;
    if (!inviteCode) return res.status(400).json({ success: false, message: 'Invite code required' });

    const group = await Group.findOne({ inviteCode: inviteCode.toUpperCase() });
    if (!group) return res.status(404).json({ success: false, message: 'Invalid invite code' });

    const alreadyMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (alreadyMember) return res.status(400).json({ success: false, message: 'Already a member' });

    if (group.members.length >= group.settings.maxMembers) {
      return res.status(400).json({ success: false, message: 'Group is full' });
    }

    group.members.push(req.user._id);
    await group.save();

    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { groups: group._id },
    });

    // Notify group members via socket
    if (req.io) {
      req.io.to(`group_${group._id}`).emit('member-joined', {
        groupId: group._id,
        user: {
          _id: req.user._id,
          username: req.user.username,
          displayName: req.user.displayName,
          avatar: req.user.avatar,
        },
      });
    }

    await group.populate([
      { path: 'owner', select: 'username displayName avatar' },
      { path: 'members', select: 'username displayName avatar isOnline streak' },
    ]);

    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/groups/:id/members
// @desc    Get group members with live activity
router.get('/:id/members', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) return res.status(403).json({ success: false, message: 'Not a member' });

    const members = await User.find({ _id: { $in: group.members } })
      .select('username displayName avatar bio isOnline lastSeen streak currentActivity xp level')
      .populate({
        path: 'currentActivity',
        select: 'name emoji category startTime',
      });

    // Add server-computed elapsed time for each member's current activity
    const now = new Date();
    const membersWithElapsed = members.map(m => {
      const obj = m.toJSON();
      if (obj.currentActivity && obj.currentActivity.startTime) {
        obj.currentActivity.elapsed = Math.floor((now - new Date(obj.currentActivity.startTime)) / 1000);
      }
      return obj;
    });

    res.json({ success: true, members: membersWithElapsed });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   PUT /api/groups/:id
// @desc    Update group (owner only)
router.put('/:id', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }

    const { name, description, settings } = req.body;
    if (name) group.name = name;
    if (description !== undefined) group.description = description;
    if (settings) group.settings = { ...group.settings, ...settings };

    await group.save();
    res.json({ success: true, group });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/groups/:id/members/:userId
// @desc    Remove member (owner only)
router.delete('/:id/members/:userId', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }
    if (req.params.userId === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Cannot remove yourself as owner' });
    }

    group.members = group.members.filter(m => m.toString() !== req.params.userId);
    await group.save();

    await User.findByIdAndUpdate(req.params.userId, {
      $pull: { groups: group._id },
    });

    res.json({ success: true, message: 'Member removed' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/groups/:id/invite/regenerate
// @desc    Regenerate invite code (owner only)
router.post('/:id/invite/regenerate', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });
    if (group.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Owner only' });
    }

    const newCode = await group.regenerateInviteCode();
    res.json({ success: true, inviteCode: newCode });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/groups/:id/leave
// @desc    Leave a group
router.post('/:id/leave', protect, async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ success: false, message: 'Group not found' });

    if (group.owner.toString() === req.user._id.toString()) {
      return res.status(400).json({ success: false, message: 'Owner cannot leave. Transfer ownership or delete group.' });
    }

    group.members = group.members.filter(m => m.toString() !== req.user._id.toString());
    await group.save();

    await User.findByIdAndUpdate(req.user._id, { $pull: { groups: group._id } });

    res.json({ success: true, message: 'Left group successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
