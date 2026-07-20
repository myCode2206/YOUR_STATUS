import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { activitiesAPI } from '../api';

const useActivityStore = create(
  persist(
    (set, get) => ({
      currentActivity: null,
      elapsedSeconds: 0,
      serverTime: null,
      isLoading: false,
      timerInterval: null,

      // Fetch current activity from server (source of truth)
      fetchCurrent: async () => {
        try {
          const { data } = await activitiesAPI.current();
          
          set({
            currentActivity: data.activity,
            serverTime: data.serverTime,
          });

          // Start display timer (for UI only — truth is always server startTime)
          if (data.activity) {
            set({ elapsedSeconds: data.elapsed || 0 });
            if (!data.activity.isPaused) {
              const startMs = new Date(data.activity.startTime).getTime();
              get()._startDisplayTimer(startMs, data.activity.totalPausedDuration || 0);
            } else {
              get()._stopDisplayTimer();
            }
          } else {
            get()._stopDisplayTimer();
            set({ elapsedSeconds: 0 });
          }

          return data.activity;
        } catch (err) {
          console.error('fetchCurrent error:', err);
        }
      },

  // Start a new activity
  startActivity: async (activityData) => {
    set({ isLoading: true });
    try {
      const { data } = await activitiesAPI.start(activityData);
      const startMs = new Date(data.activity.startTime).getTime();

      set({
        currentActivity: data.activity,
        elapsedSeconds: 0,
        isLoading: false,
      });

      get()._startDisplayTimer(startMs, 0);
      return { success: true, activity: data.activity };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || 'Failed to start activity' };
    }
  },

  // Stop current activity
  stopActivity: async () => {
    try {
      await activitiesAPI.stop();
      get()._stopDisplayTimer();
      set({ currentActivity: null, elapsedSeconds: 0 });
      return { success: true };
    } catch (err) {
      return { success: false };
    }
  },

  // Pause current activity
  pauseActivity: async () => {
    set({ isLoading: true });
    try {
      const { data } = await activitiesAPI.pause();
      get()._stopDisplayTimer();
      set({
        currentActivity: data.activity,
        isLoading: false,
      });
      const startMs = new Date(data.activity.startTime).getTime();
      const pausedMs = new Date(data.activity.pausedAt).getTime();
      const elapsed = Math.max(0, Math.floor((pausedMs - startMs) / 1000) - (data.activity.totalPausedDuration || 0));
      set({ elapsedSeconds: elapsed });
      return { success: true, activity: data.activity };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || 'Failed to pause activity' };
    }
  },

  // Resume current activity
  resumeActivity: async () => {
    set({ isLoading: true });
    try {
      const { data } = await activitiesAPI.resume();
      const startMs = new Date(data.activity.startTime).getTime();
      set({
        currentActivity: data.activity,
        isLoading: false,
      });
      get()._startDisplayTimer(startMs, data.activity.totalPausedDuration || 0);
      return { success: true, activity: data.activity };
    } catch (err) {
      set({ isLoading: false });
      return { success: false, message: err.response?.data?.message || 'Failed to resume activity' };
    }
  },

  // Internal: start display tick (UI only, not source of truth)
  _startDisplayTimer: (activityStartMs, totalPausedDuration = 0) => {
    get()._stopDisplayTimer();

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - activityStartMs) / 1000) - totalPausedDuration;
      set({ elapsedSeconds: Math.max(0, elapsed) });
    }, 1000);

    set({ timerInterval: interval });
  },

  _stopDisplayTimer: () => {
    const { timerInterval } = get();
    if (timerInterval) {
      clearInterval(timerInterval);
      set({ timerInterval: null });
    }
  },

  // Format elapsed seconds for display
  getElapsedFormatted: () => {
    const { elapsedSeconds } = get();
    const h = Math.floor(elapsedSeconds / 3600);
    const m = Math.floor((elapsedSeconds % 3600) / 60);
    const s = elapsedSeconds % 60;
    if (h > 0) return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  },

  // Update from socket
  setCurrentActivityFromSocket: (activity, elapsed) => {
    if (activity) {
      set({ currentActivity: activity, elapsedSeconds: elapsed || 0 });
      if (!activity.isPaused) {
        const startMs = new Date(activity.startTime).getTime();
        get()._startDisplayTimer(startMs, activity.totalPausedDuration || 0);
      } else {
        get()._stopDisplayTimer();
      }
    } else {
      get()._stopDisplayTimer();
      set({ currentActivity: null, elapsedSeconds: 0 });
    }
  },

      cleanup: () => {
        get()._stopDisplayTimer();
      },
    }),
    {
      name: 'ys_activity',
      partialize: (state) => ({
        currentActivity: state.currentActivity,
        elapsedSeconds: state.elapsedSeconds,
      }),
      // Re-start display timer when store is hydrated from localStorage
      onRehydrateStorage: () => (state) => {
        if (state && state.currentActivity) {
          if (!state.currentActivity.isPaused) {
            const startMs = new Date(state.currentActivity.startTime).getTime();
            state._startDisplayTimer(startMs, state.currentActivity.totalPausedDuration || 0);
          } else {
            const startMs = new Date(state.currentActivity.startTime).getTime();
            const pausedMs = new Date(state.currentActivity.pausedAt).getTime();
            const elapsed = Math.max(0, Math.floor((pausedMs - startMs) / 1000) - (state.currentActivity.totalPausedDuration || 0));
            state.elapsedSeconds = elapsed;
          }
        }
      }
    }
  )
);

export default useActivityStore;
