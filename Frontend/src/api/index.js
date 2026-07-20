import axios from 'axios';

export const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8900';
const API_BASE = `${BACKEND_URL}/api`;

const api = axios.create({
  baseURL: API_BASE,
  timeout: 15000,
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ys_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('ys_token');
      localStorage.removeItem('ys_user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// ===================== AUTH =====================
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  googleLogin: (idToken) => api.post('/auth/google', { idToken }),
  me: () => api.get('/auth/me'),
  logout: () => api.post('/auth/logout'),
};

// ===================== ACTIVITIES =====================
export const activitiesAPI = {
  start: (data) => api.post('/activities/start', data),
  stop: () => api.post('/activities/stop'),
  pause: () => api.post('/activities/pause'),
  resume: () => api.post('/activities/resume'),
  current: () => api.get('/activities/current'),
  history: (params) => api.get('/activities/history', { params }),
  timeline: (date, userId) => api.get('/activities/timeline', { params: { date, userId } }),
  dailyAnalytics: (date) => api.get('/activities/analytics/daily', { params: { date } }),
  weeklyAnalytics: () => api.get('/activities/analytics/weekly'),
  monthlyAnalytics: () => api.get('/activities/analytics/monthly'),
  heatmap: (userId) => api.get('/activities/analytics/heatmap', { params: { userId } }),
  streak: () => api.get('/activities/analytics/streak'),
};

// ===================== GROUPS =====================
export const groupsAPI = {
  create: (data) => api.post('/groups', data),
  get: (id) => api.get(`/groups/${id}`),
  join: (inviteCode) => api.post('/groups/join', { inviteCode }),
  members: (id) => api.get(`/groups/${id}/members`),
  update: (id, data) => api.put(`/groups/${id}`, data),
  removeMember: (groupId, userId) => api.delete(`/groups/${groupId}/members/${userId}`),
  regenerateInvite: (id) => api.post(`/groups/${id}/invite/regenerate`),
  leave: (id) => api.post(`/groups/${id}/leave`),
};

// ===================== FEED =====================
export const feedAPI = {
  create: (groupId, formData) => api.post(`/feed/${groupId}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  get: (groupId, params) => api.get(`/feed/${groupId}`, { params }),
  like: (groupId, postId) => api.post(`/feed/${groupId}/posts/${postId}/like`),
  comment: (groupId, postId, text) => api.post(`/feed/${groupId}/posts/${postId}/comment`, { text }),
  delete: (groupId, postId) => api.delete(`/feed/${groupId}/posts/${postId}`),
};

// ===================== LEADERBOARD =====================
export const leaderboardAPI = {
  get: (groupId, period = 'daily') => api.get(`/leaderboard/${groupId}`, { params: { period } }),
};

// ===================== USERS =====================
export const usersAPI = {
  me: () => api.get('/users/me'),
  updateMe: (data) => api.put('/users/me', data),
  uploadAvatar: (data) => api.post('/users/me/avatar', data, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  myStats: () => api.get('/users/me/stats'),
  notifications: () => api.get('/users/me/notifications'),
  markNotificationsRead: () => api.put('/users/me/notifications/read'),
  getProfile: (userId) => api.get(`/users/${userId}/profile`),
};

export default api;
