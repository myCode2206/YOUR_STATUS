import { useEffect } from 'react';
import { io } from 'socket.io-client';
import { BACKEND_URL } from '../api';
import useAuthStore from '../store/authStore';
import useActivityStore from '../store/activityStore';
import useGroupStore from '../store/groupStore';

let socket = null;
let isInitialized = false;

export const getSocket = () => socket;

export const useSocket = () => {
  const { user, isAuthenticated } = useAuthStore();
  const { setCurrentActivityFromSocket } = useActivityStore();
  const { updateMemberActivity, addMember, addPost, updatePostLike, addComment, removePost } = useGroupStore();

  useEffect(() => {
    if (!isAuthenticated || !user || isInitialized) return;
    
    isInitialized = true;
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
      useGroupStore.getState().updateMemberActivity(userId, activity);
    });

    // Real-time member join events
    socket.on('member-joined', ({ user }) => {
      useGroupStore.getState().addMember(user);
    });

    // Real-time notifications
    socket.on('new-notification', ({ notification }) => {
      window.dispatchEvent(new CustomEvent('new-notification', { detail: notification }));
    });

    // Current activity response (on reconnect)
    socket.on('current-activity', ({ activity, elapsed }) => {
      useActivityStore.getState().setCurrentActivityFromSocket(activity, elapsed);
    });

    // Feed events
    socket.on('new-post', ({ post }) => {
      useGroupStore.getState().addPost(post);
    });

    socket.on('post-liked', ({ postId, likesCount, liked, userId }) => {
      useGroupStore.getState().updatePostLike(postId, liked, likesCount, userId);
    });

    socket.on('new-comment', ({ postId, comment }) => {
      useGroupStore.getState().addComment(postId, comment);
    });

    socket.on('post-deleted', ({ postId }) => {
      useGroupStore.getState().removePost(postId);
    });

    // Ping every 30s
    const pingInterval = setInterval(() => {
      if (socket && socket.connected) socket.emit('ping');
    }, 30000);

    return () => {
      // We don't want to disconnect on component unmount if it's used globally by Layout
      // But if we ever unmount Layout, we clean up
      clearInterval(pingInterval);
      isInitialized = false;
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
