// frontend/lib/api-client.ts
// Enhanced API client with auth token handling

import axios from 'axios';

const isServer = typeof window === 'undefined';
const API_URL = isServer
  ? (process.env.NEXT_PUBLIC_API_URL || (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5000/api'))
  : '/api';

const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Expires': '0',
  },
});

// Request interceptor - Add auth token to every request
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage
    const token = localStorage.getItem('token');

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add cache-busting timestamp to all GET requests to prevent stale data
    if (config.method?.toLowerCase() === 'get') {
      config.params = { ...config.params, _t: Date.now() };
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Handle auth errors
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // If 401 Unauthorized clear token and redirect to login
    // Note: Do NOT redirect on 403 Forbidden. 403 just means they don't have access to that specific resource,
    // logging them out and redirecting them completely causes infinite redirect loops if a page makes a request they aren't allowed to.
    if (error.response?.status === 401) {
      console.warn('Auth Error:', error.response.status, 'Checking redirect eligibility...');

      // Skip global redirect for OTP verification to allow in-page error handling
      if (error.config?.url?.includes('/auth/otp/verify')) {
        return Promise.reject(error);
      }

      localStorage.removeItem('token');
      localStorage.removeItem('user');

      // Only redirect if not already on login page
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        // If they were on an admin route, send to admin-login
        if (window.location.pathname.startsWith('/admin')) {
          window.location.href = '/admin-login';
        } else {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;