import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../api';
import useAuthStore from '../store/authStore';
import useActivityStore from '../store/activityStore';
import useGroupStore from '../store/groupStore';

let socket = null;

export const getSocket = () => socket;

export const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { setCurrentActivityFromSocket } = useActivityStore();
  const { updateMemberActivity, addMember, addPost, updatePostLike, addComment, removePost } = useGroupStore();
  const initialized = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user || initialized.current) return;
    initialized.current = true;

    socket = io(BACKEND_URL, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      console.log('🔌 Socket connected');
      socket.emit('authenticate', { userId: user._id });
      
      // Auto-join all group socket rooms that the user is a member of
      if (user?.groups && user.groups.length > 0) {
        user.groups.forEach(g => {
          const gId = g._id || g;
          socket.emit('join-group', { groupId: gId });
          console.log(`🔌 Sent join-group for ${gId}`);
        });
      }
    });

    socket.on('disconnect', () => {
      console.log('🔌 Socket disconnected');
    });

    // Real-time activity updates from group members
    socket.on('member-activity-updated', ({ userId, activity }) => {
      updateMemberActivity(userId, activity);
    });

    // Real-time member join events
    socket.on('member-joined', ({ user }) => {
      addMember(user);
    });

    // Real-time notifications
    socket.on('new-notification', ({ notification }) => {
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    });

    // Current activity response (on reconnect)
    socket.on('current-activity', ({ activity, elapsed }) => {
      setCurrentActivityFromSocket(activity, elapsed);
    });

    // Feed events
    socket.on('new-post', ({ post }) => {
      addPost(post);
    });

    socket.on('post-liked', ({ postId, likesCount, liked, userId }) => {
      updatePostLike(postId, liked, likesCount, userId);
    });

    socket.on('new-comment', ({ postId, comment }) => {
      addComment(postId, comment);
    });

    socket.on('post-deleted', ({ postId }) => {
      removePost(postId);
    });

    // Ping every 30s
    const pingInterval = setInterval(() => {
      if (socket.connected) socket.emit('ping');
    }, 30000);

    return () => {
      clearInterval(pingInterval);
      initialized.current = false;
      if (socket) {
        socket.disconnect();
        socket = null;
      }
    };
  }, [isAuthenticated, user?._id]);

  const joinGroup = (groupId) => {
    if (socket?.connected) socket.emit('join-group', { groupId });
  };

  const leaveGroup = (groupId) => {
    if (socket?.connected) socket.emit('leave-group', { groupId });
  };

  return { socket, joinGroup, leaveGroup };
};

export default useSocket;
