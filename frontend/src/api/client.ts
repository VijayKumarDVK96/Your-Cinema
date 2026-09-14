import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Attach bearer token if stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('yc_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('yc_token');
      // If we are on a protected screen, user context will update
    }
    const message = err.response?.data?.error?.message || err.message || 'An unexpected error occurred.';
    return Promise.reject(new Error(message));
  }
);
