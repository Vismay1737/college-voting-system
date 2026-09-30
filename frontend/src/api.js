import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const adminToken = localStorage.getItem('admin_token');
    const voterToken = localStorage.getItem('voter_token');

    // Determine which token to use based on URL
    if (config.url?.startsWith('/admin')) {
      if (adminToken) {
        config.headers.Authorization = `Bearer ${adminToken}`;
      }
    } else if (config.url?.startsWith('/voter')) {
      if (voterToken) {
        config.headers.Authorization = `Bearer ${voterToken}`;
      }
    } else {
      // For auth endpoints, no token needed
    }

    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const path = window.location.pathname;
      const isLoginRequest = error.config?.url?.includes('/login');
      if (!isLoginRequest) {
        if (path.startsWith('/admin') && path !== '/admin/login') {
          localStorage.removeItem('admin_token');
          localStorage.removeItem('admin_user');
          window.location.href = '/admin/login';
        } else if (!path.startsWith('/admin') && path !== '/login') {
          localStorage.removeItem('voter_token');
          localStorage.removeItem('voter_user');
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
