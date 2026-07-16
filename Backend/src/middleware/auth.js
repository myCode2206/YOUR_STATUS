const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = await User.findById(decoded.id).select('-password');

    if (!req.user) {
      return res.status(401).json({ success: false, message: 'User not found' });
    }

    next();
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
  }
};

// Middleware to check if user is group member
const isGroupMember = (GroupModel) => async (req, res, next) => {
  const group = await GroupModel.findById(req.params.groupId || req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }
  const isMember = group.members.some(m => m.toString() === req.user._id.toString());
  if (!isMember) {
    return res.status(403).json({ success: false, message: 'Not a member of this group' });
  }
  req.group = group;
  next();
};

// Middleware to check if user is group owner
const isGroupOwner = (GroupModel) => async (req, res, next) => {
  const group = await GroupModel.findById(req.params.groupId || req.params.id);
  if (!group) {
    return res.status(404).json({ success: false, message: 'Group not found' });
  }
  if (group.owner.toString() !== req.user._id.toString()) {
    return res.status(403).json({ success: false, message: 'Only group owner can do this' });
  }
  req.group = group;
  next();
};

module.exports = { protect, isGroupMember, isGroupOwner };
