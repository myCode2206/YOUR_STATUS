import { create } from 'zustand';
import { groupsAPI, feedAPI, leaderboardAPI } from '../api';

const useGroupStore = create((set, get) => ({
  currentGroup: null,
  members: [],
  membersGroupId: null,
  isMembersLoading: false,
  feed: [],
  feedPage: 1,
  feedHasMore: true,
  feedGroupId: null,
  isLoading: false,

  // Leaderboard cache
  leaderboard: [],
  leaderboardMeta: null,
  leaderboardGroupId: null,
  leaderboardPeriod: null,
  isLeaderboardLoading: false,

  setGroup: (group) => {
    const prevGroup = get().currentGroup;
    if (prevGroup?._id !== group?._id) {
      set({
        currentGroup: group,
        feed: [],
        feedPage: 1,
        feedHasMore: true,
        feedGroupId: null,
        members: [],
        membersGroupId: null,
        leaderboard: [],
        leaderboardMeta: null,
        leaderboardGroupId: null,
        leaderboardPeriod: null,
      });
    }
  },

  fetchGroup: async (groupId) => {
    const current = get().currentGroup;
    if (current && current._id === groupId) {
      // Fetch in background silently
      groupsAPI.get(groupId).then(({ data }) => {
        set({ currentGroup: data.group });
      }).catch(err => console.error('fetchGroup bg error:', err));
      return current;
    }

    set({ isLoading: true });
    try {
      const { data } = await groupsAPI.get(groupId);
      set({
        currentGroup: data.group,
        isLoading: false,
        feed: [],
        feedPage: 1,
        feedHasMore: true,
        feedGroupId: null,
        members: [],
        membersGroupId: null,
        leaderboard: [],
        leaderboardMeta: null,
        leaderboardGroupId: null,
        leaderboardPeriod: null,
      });
      return data.group;
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  fetchMembers: async (groupId) => {
    const { members: currentMembers, membersGroupId, isMembersLoading } = get();

    // Dedupe concurrent foreground loads for the same group.
    if (isMembersLoading && membersGroupId === groupId) {
      return currentMembers;
    }

    if (currentMembers.length > 0 && membersGroupId === groupId) {
      // Fetch in background silently
      groupsAPI.members(groupId).then(({ data }) => {
        set({ members: data.members });
      }).catch(err => console.error('fetchMembers bg error:', err));
      return currentMembers;
    }

    set({ isMembersLoading: true, membersGroupId: groupId });
    try {
      const { data } = await groupsAPI.members(groupId);
      set({ members: data.members, isMembersLoading: false });
      return data.members;
    } catch (err) {
      console.error('fetchMembers error:', err);
      set({ isMembersLoading: false });
    }
  },

  updateMemberActivity: (userId, activity) => {
    set((state) => ({
      members: state.members.map((m) =>
        m._id === userId ? { ...m, currentActivity: activity } : m
      ),
    }));
  },

  addMember: (member) => {
    set((state) => {
      const exists = state.members.some(m => m._id === member._id);
      if (exists) return state;

      const newMembers = [...state.members, member];
      const newCurrentGroup = state.currentGroup 
        ? { ...state.currentGroup, members: [...(state.currentGroup.members || []), member._id] } 
        : null;

      return { 
        members: newMembers,
        currentGroup: newCurrentGroup
      };
    });
  },

  fetchFeed: async (groupId, reset = false) => {
    const page = reset ? 1 : get().feedPage;
    try {
      const { data } = await feedAPI.get(groupId, { page, limit: 15 });
      set((state) => ({
        feed: reset ? data.posts : [...state.feed, ...data.posts],
        feedPage: page + 1,
        feedHasMore: page < data.pagination.pages,
        feedGroupId: groupId,
      }));
    } catch (err) {
      console.error('fetchFeed error:', err);
    }
  },

  fetchLeaderboard: async (groupId, period = 'daily') => {
    const cachedGroupId = get().leaderboardGroupId;
    const cachedPeriod = get().leaderboardPeriod;
    if (cachedGroupId === groupId && cachedPeriod === period && get().leaderboard.length > 0) {
      // Fetch in background silently
      leaderboardAPI.get(groupId, period).then(({ data }) => {
        set({
          leaderboard: data.leaderboard,
          leaderboardMeta: data.meta,
        });
      }).catch(err => console.error('fetchLeaderboard bg error:', err));
      return;
    }

    set({ isLeaderboardLoading: true });
    try {
      const { data } = await leaderboardAPI.get(groupId, period);
      set({
        leaderboard: data.leaderboard,
        leaderboardMeta: data.meta,
        leaderboardGroupId: groupId,
        leaderboardPeriod: period,
        isLeaderboardLoading: false,
      });
    } catch (err) {
      console.error('fetchLeaderboard error:', err);
      set({ isLeaderboardLoading: false });
      throw err;
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
      feed: state.feed.map((p) => {
        if (p._id === postId) {
          const exists = p.comments?.some(c => c._id === comment._id);
          if (exists) return p;
          return { ...p, comments: [...(p.comments || []), comment] };
        }
        return p;
      }),
    }));
  },

  removePost: (postId) => {
    set((state) => ({ feed: state.feed.filter((p) => p._id !== postId) }));
  },

  reset: () => set({
    currentGroup: null,
    members: [],
    membersGroupId: null,
    isMembersLoading: false,
    feed: [],
    feedPage: 1,
    feedHasMore: true,
    feedGroupId: null,
    leaderboard: [],
    leaderboardMeta: null,
    leaderboardGroupId: null,
    leaderboardPeriod: null,
    isLeaderboardLoading: false,
  }),
}));

export default useGroupStore;
