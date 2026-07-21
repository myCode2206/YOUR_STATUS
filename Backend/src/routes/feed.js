const express = require('express');
const router = express.Router();
const Post = require('../models/Post');
const Group = require('../models/Group');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { saveUploadedFile } = require('../utils/fileSaver');
const path = require('path');

// Helper to check group membership
async function checkMembership(groupId, userId) {
  const group = await Group.findById(groupId);
  if (!group) throw new Error('Group not found');
  const isMember = group.members.some(m => m.toString() === userId.toString());
  if (!isMember) throw new Error('Not a member');
  return group;
}

// @route   POST /api/feed/:groupId
// @desc    Create a post
router.post('/:groupId', protect, upload.single('media'), async (req, res) => {
  try {
    await checkMembership(req.params.groupId, req.user._id);

    const { content, type, isAchievement, achievementTitle, achievementDescription, achievementEmoji } = req.body;

    if (!content && !req.file) {
      return res.status(400).json({ success: false, message: 'Post must have content or media' });
    }

    const postData = {
      author: req.user._id,
      group: req.params.groupId,
      content: content || '',
      type: req.file ? getMediaType(req.file.mimetype) : 'text',
      isAchievement: isAchievement === 'true',
    };

    if (req.file) {
      const mediaUrl = await saveUploadedFile(req.file, 'posts');
      postData.mediaUrl = mediaUrl;
      postData.mediaFilename = req.file.originalname;
      postData.mediaMimetype = req.file.mimetype;
      postData.mediaSize = req.file.size;
    }

    if (isAchievement === 'true') {
      postData.achievementData = {
        title: achievementTitle || '',
        description: achievementDescription || '',
        emoji: achievementEmoji || '🏆',
      };
    }

    const post = await Post.create(postData);
    await post.populate('author', 'username displayName avatar');

    // Emit to group room
    if (req.io) {
      req.io.to(`group_${req.params.groupId}`).emit('new-post', { post });
    }

    // Parse tags/mentions
    const contentText = content || '';
    const taggedUsernames = [...contentText.matchAll(/@([a-zA-Z0-9_]+)/g)].map(match => match[1]);

    // Notify group members
    const group = await Group.findById(req.params.groupId).select('members name');
    const otherMembers = group.members.filter(m => m.toString() !== req.user._id.toString());

    // Find user IDs for matched usernames
    let taggedUserIds = [];
    if (taggedUsernames.length > 0) {
      const taggedUsers = await User.find({ username: { $in: taggedUsernames } }).select('_id');
      const taggedUserIdsSet = new Set(taggedUsers.map(u => u._id.toString()));
      // Only keep users who are members of this group and are not the poster
      taggedUserIds = otherMembers.filter(m => taggedUserIdsSet.has(m.toString()));
    }

    const notificationsToInsert = [];
    otherMembers.forEach(memberId => {
      const isTagged = taggedUserIds.some(tid => tid.toString() === memberId.toString());
      if (isTagged) {
        notificationsToInsert.push({
          recipient: memberId,
          sender: req.user._id,
          type: 'mention',
          title: 'You were tagged in a post',
          message: `${req.user.displayName} tagged you in a post`,
          group: req.params.groupId,
          link: `/groups/${req.params.groupId}/feed?postId=${post._id}`,
          metadata: { postId: post._id },
        });
      } else {
        notificationsToInsert.push({
          recipient: memberId,
          sender: req.user._id,
          type: 'new_post',
          title: 'New post in your group',
          message: `${req.user.displayName} posted in ${group.name}`,
          group: req.params.groupId,
          link: `/groups/${req.params.groupId}/feed?postId=${post._id}`,
          metadata: { postId: post._id },
        });
      }
    });

    if (notificationsToInsert.length > 0) {
      const createdNotifs = await Notification.insertMany(notificationsToInsert);
      if (req.io) {
        createdNotifs.forEach(notif => {
          req.io.to(`user_${notif.recipient}`).emit('new-notification', { notification: notif });
        });
      }
    }

    res.status(201).json({ success: true, post });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   GET /api/feed/:groupId
// @desc    Get paginated feed
router.get('/:groupId', protect, async (req, res) => {
  try {
    await checkMembership(req.params.groupId, req.user._id);

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 15;
    const skip = (page - 1) * limit;

    const total = await Post.countDocuments({ group: req.params.groupId });
    const posts = await Post.find({ group: req.params.groupId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('author', 'username displayName avatar isOnline')
      .populate('comments.user', 'username displayName avatar')
      .populate('likes', 'username displayName');

    res.json({
      success: true,
      posts,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/feed/:groupId/posts/:postId/like
// @desc    Toggle like on a post
router.post('/:groupId/posts/:postId/like', protect, async (req, res) => {
  try {
    await checkMembership(req.params.groupId, req.user._id);

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const alreadyLiked = post.likes.some(l => l.toString() === req.user._id.toString());
    if (alreadyLiked) {
      post.likes = post.likes.filter(l => l.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);

      // Notify post author
      if (post.author.toString() !== req.user._id.toString()) {
        const notif = await Notification.create({
          recipient: post.author,
          sender: req.user._id,
          type: 'new_like',
          title: 'Someone liked your post',
          message: `${req.user.displayName} liked your post`,
          group: req.params.groupId,
          link: `/groups/${req.params.groupId}/feed?postId=${post._id}`,
          metadata: { postId: post._id },
        });
        if (req.io) {
          req.io.to(`user_${post.author}`).emit('new-notification', { notification: notif });
        }
      }
    }

    await post.save();

    if (req.io) {
      req.io.to(`group_${req.params.groupId}`).emit('post-liked', {
        postId: post._id,
        likesCount: post.likes.length,
        liked: !alreadyLiked,
        userId: req.user._id,
      });
    }

    res.json({ success: true, liked: !alreadyLiked, likesCount: post.likes.length });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   POST /api/feed/:groupId/posts/:postId/comment
// @desc    Add a comment
router.post('/:groupId/posts/:postId/comment', protect, upload.single('media'), async (req, res) => {
  try {
    await checkMembership(req.params.groupId, req.user._id);

    const text = req.body.text || '';
    if (!text.trim() && !req.file) {
      return res.status(400).json({ success: false, message: 'Comment must have text or media' });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const commentData = { user: req.user._id, text };
    if (req.file) {
      commentData.mediaUrl = await saveUploadedFile(req.file, 'comments');
      commentData.mediaType = getMediaType(req.file.mimetype);
    }

    post.comments.push(commentData);
    await post.save();

    const newComment = post.comments[post.comments.length - 1];
    await post.populate('comments.user', 'username displayName avatar');

    // Parse tags/mentions in comments
    const taggedUsernames = [...text.matchAll(/@([a-zA-Z0-9_]+)/g)].map(match => match[1]);
    let taggedUserIds = [];
    if (taggedUsernames.length > 0) {
      const group = await Group.findById(req.params.groupId).select('members');
      const otherMembers = group.members.filter(m => m.toString() !== req.user._id.toString());
      
      const taggedUsers = await User.find({ username: { $in: taggedUsernames } }).select('_id');
      const taggedUserIdsSet = new Set(taggedUsers.map(u => u._id.toString()));
      taggedUserIds = otherMembers.filter(m => taggedUserIdsSet.has(m.toString()));

      // Create mention notifications for tagged users
      const mentionNotifications = taggedUserIds.map(memberId => ({
        recipient: memberId,
        sender: req.user._id,
        type: 'mention',
        title: 'You were tagged in a comment',
        message: `${req.user.displayName} tagged you in a comment`,
        group: req.params.groupId,
        link: `/groups/${req.params.groupId}/feed?postId=${post._id}`,
        metadata: { postId: post._id },
      }));

      if (mentionNotifications.length > 0) {
        const createdNotifs = await Notification.insertMany(mentionNotifications);
        if (req.io) {
          createdNotifs.forEach(notif => {
            req.io.to(`user_${notif.recipient}`).emit('new-notification', { notification: notif });
          });
        }
      }
    }

    // Notify post author (if not already notified as a tagged user)
    const authorNotified = taggedUserIds.some(tid => tid.toString() === post.author.toString());
    if (post.author.toString() !== req.user._id.toString() && !authorNotified) {
      const notif = await Notification.create({
        recipient: post.author,
        sender: req.user._id,
        type: 'new_comment',
        title: 'New comment on your post',
        message: `${req.user.displayName} commented: "${text.slice(0, 50)}"`,
        group: req.params.groupId,
        link: `/groups/${req.params.groupId}/feed?postId=${post._id}`,
        metadata: { postId: post._id },
      });
      if (req.io) {
        req.io.to(`user_${post.author}`).emit('new-notification', { notification: notif });
      }
    }

    if (req.io) {
      req.io.to(`group_${req.params.groupId}`).emit('new-comment', {
        postId: post._id,
        comment: post.comments[post.comments.length - 1],
      });
    }

    res.status(201).json({ success: true, comment: post.comments[post.comments.length - 1] });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// @route   DELETE /api/feed/:groupId/posts/:postId
// @desc    Delete a post (author or group owner)
router.delete('/:groupId/posts/:postId', protect, async (req, res) => {
  try {
    const group = await checkMembership(req.params.groupId, req.user._id);
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    const isAuthor = post.author.toString() === req.user._id.toString();
    const isOwner = group.owner.toString() === req.user._id.toString();

    if (!isAuthor && !isOwner) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this post' });
    }

    await Post.findByIdAndDelete(req.params.postId);

    if (req.io) {
      req.io.to(`group_${req.params.groupId}`).emit('post-deleted', { postId: req.params.postId });
    }

    res.json({ success: true, message: 'Post deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

function getMediaType(mimetype) {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  if (mimetype.startsWith('audio/')) return 'audio';
  if (mimetype === 'application/pdf') return 'pdf';
  return 'text';
}

module.exports = router;
