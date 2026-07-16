const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// @route   POST /api/auth/register
// @desc    Register new user
router.post('/register', async (req, res) => {
  try {
    const { username, displayName, email, password } = req.body;

    if (!username || !displayName || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const emailExists = await User.findOne({ email: email.toLowerCase() });
    if (emailExists) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const usernameExists = await User.findOne({ username: username.toLowerCase() });
    if (usernameExists) {
      return res.status(400).json({ success: false, message: 'Username already taken' });
    }

    const user = await User.create({
      username: username.toLowerCase(),
      displayName,
      email: email.toLowerCase(),
      password,
    });

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        xp: user.xp,
        level: user.level,
        streak: user.streak,
        studyGoal: user.studyGoal,
        groups: user.groups,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() })
      .populate('currentActivity')
      .populate('groups', 'name avatar inviteCode');

    if (!user || !(await user.matchPassword(password))) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('currentActivity')
      .populate('groups', 'name avatar inviteCode description');

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (update online status)
router.post('/logout', protect, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user._id, {
      isOnline: false,
      lastSeen: new Date(),
    });
    res.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/auth/google
// @desc    Google Sign-in / Sign-up via Firebase ID Token
router.post('/google', async (req, res) => {
  try {
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ success: false, message: 'Google idToken required' });
    }

    const admin = require('firebase-admin');
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    const { email, name, picture } = decodedToken;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email not provided by Google' });
    }

    let user = await User.findOne({ email: email.toLowerCase() })
      .populate('currentActivity')
      .populate('groups', 'name avatar inviteCode description');

    if (!user) {
      // Generate a unique username from email prefix
      const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '');
      let username = baseUsername;
      let usernameExists = await User.findOne({ username });
      let count = 1;
      while (usernameExists) {
        username = `${baseUsername}${count}`;
        usernameExists = await User.findOne({ username });
        count++;
      }

      user = await User.create({
        username,
        displayName: name || email.split('@')[0],
        email: email.toLowerCase(),
        avatar: picture || '',
        password: Math.random().toString(36).slice(-10), // secure dummy password
      });
    }

    // Update online status
    user.isOnline = true;
    user.lastSeen = new Date();
    await user.save();

    const token = generateToken(user._id);

    res.json({
      success: true,
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    console.error('Google Auth error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
