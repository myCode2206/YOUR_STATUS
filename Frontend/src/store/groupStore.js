import { create } from 'zustand';
import { groupsAPI, feedAPI } from '../api';

const useGroupStore = create((set, get) => ({
  currentGroup: null,
  members: [],
  feed: [],
  feedPage: 1,
  feedHasMore: true,
  isLoading: false,

  setGroup: (group) => set({ currentGroup: group }),

  fetchGroup: async (groupId) => {
    set({ isLoading: true });
    try {
      const { data } = await groupsAPI.get(groupId);
      set({ currentGroup: data.group, isLoading: false });
      return data.group;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchMembers: async (groupId) => {
    try {
      const { data } = await groupsAPI.members(groupId);
      set({ members: data.members });
      return data.members;
    } catch (err) {
      console.error('fetchMembers error:', err);
    }
  },

  updateMemberActivity: (userId, activity) => {
    set((state) => ({
      members: state.members.map((m) =>
        m._id === userId ? { ...m, currentActivity: activity } : m
      ),
    }));
  },

  fetchFeed: async (groupId, reset = false) => {
    const page = reset ? 1 : get().feedPage;
    try {
      const { data } = await feedAPI.get(groupId, { page, limit: 15 });
      set((state) => ({
        feed: reset ? data.posts : [...state.feed, ...data.posts],
        feedPage: page + 1,
        feedHasMore: page < data.pagination.pages,
      }));
    } catch (err) {
      console.error('fetchFeed error:', err);
    }
  },

  addPost: (post) => {
    set((state) => {
      // Deduplicate: don't add if already present
      const exists = state.feed.some(p => p._id === post._id);
      if (exists) return state;
      return { feed: [post, ...state.feed] };
    });
  },

  updatePostLike: (postId, liked, likesCount, userId) => {
    set((state) => ({
      feed: state.feed.map((p) => {
        if (p._id !== postId) return p;
        const newLikes = liked
          ? [...(p.likes || []), { _id: userId }]
          : (p.likes || []).filter((l) => l._id !== userId);
        return { ...p, likes: newLikes };
      }),
    }));
  },

  addComment: (postId, comment) => {
    set((state) => ({
      feed: state.feed.map((p) =>
        p._id === postId ? { ...p, comments: [...(p.comments || []), comment] } : p
      ),
    }));
  },

  removePost: (postId) => {
    set((state) => ({ feed: state.feed.filter((p) => p._id !== postId) }));
  },

  reset: () => set({ currentGroup: null, members: [], feed: [], feedPage: 1, feedHasMore: true }),
}));

export default useGroupStore;
