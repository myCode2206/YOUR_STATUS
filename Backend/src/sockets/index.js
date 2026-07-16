const User = require('../models/User');
const Activity = require('../models/Activity');

module.exports = (io) => {
  // Track connected users: userId → socket.id
  const connectedUsers = new Map();

  io.on('connection', (socket) => {
    console.log(`🔌 Socket connected: ${socket.id}`);

    // Authenticate socket connection
    socket.on('authenticate', async ({ userId }) => {
      if (!userId) return;

      connectedUsers.set(userId, socket.id);
      socket.userId = userId;

      // Join personal room
      socket.join(`user_${userId}`);

      // Update online status
      await User.findByIdAndUpdate(userId, { isOnline: true, lastSeen: new Date() });

      console.log(`👤 User ${userId} authenticated on socket`);
    });

    // Join a group room
    socket.on('join-group', ({ groupId }) => {
      if (!groupId) return;
      socket.join(`group_${groupId}`);
      console.log(`👥 Socket ${socket.id} joined group_${groupId}`);
    });

    // Leave a group room
    socket.on('leave-group', ({ groupId }) => {
      if (!groupId) return;
      socket.leave(`group_${groupId}`);
    });

    // Ping for presence (keep alive)
    socket.on('ping', () => {
      socket.emit('pong', { serverTime: new Date().toISOString() });
      if (socket.userId) {
        User.findByIdAndUpdate(socket.userId, { lastSeen: new Date() }).exec();
      }
    });

    // Request current activity from server (for reconnects)
    socket.on('request-current-activity', async () => {
      if (!socket.userId) return;

      const activity = await Activity.findOne({ user: socket.userId, endTime: null });
      const now = new Date();

      socket.emit('current-activity', {
        activity,
        elapsed: activity ? Math.floor((now - activity.startTime) / 1000) : 0,
        serverTime: now.toISOString(),
      });
    });

    // Disconnect handling
    socket.on('disconnect', async () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);

      if (socket.userId) {
        connectedUsers.delete(socket.userId);

        // Mark offline after short delay (handles refreshes)
        setTimeout(async () => {
          // Check if user reconnected
          if (!connectedUsers.has(socket.userId)) {
            await User.findByIdAndUpdate(socket.userId, {
              isOnline: false,
              lastSeen: new Date(),
            });

            // Notify group members user went offline
            // (Could emit to groups if needed)
          }
        }, 5000);
      }
    });
  });

  // Helper: broadcast to all users in a group
  io.broadcastToGroup = (groupId, event, data) => {
    io.to(`group_${groupId}`).emit(event, data);
  };

  return io;
};
