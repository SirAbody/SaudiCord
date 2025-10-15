// Axios Setup for MongoDB Backend
// This file configures axios to work with the MongoDB backend

import axios from 'axios';

// Determine backend URL based on environment
const getBackendUrl = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use same origin in production (for Render.com deployment)
    return '';
  }
  // Use port 5000 for MongoDB backend in development
  return 'http://localhost:5000';
};

// Set axios defaults
axios.defaults.baseURL = getBackendUrl();
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Add auth token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log API calls in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[API] ${config.method?.toUpperCase()} ${config.url}`);
    }
    
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Handle responses
axios.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Log errors in development
    if (process.env.NODE_ENV === 'development') {
      console.error('[API Error]', error.response?.data || error.message);
    }
    
    // Handle 401 (Unauthorized) - token expired or invalid
    if (error.response?.status === 401) {
      // Only redirect to login if we're not already there
      if (!window.location.pathname.includes('/login')) {
        localStorage.removeItem('token');
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default axios;
