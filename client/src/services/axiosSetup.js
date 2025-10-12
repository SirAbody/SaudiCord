// Global Axios configuration
import axios from 'axios';

// Use relative URL in production, full URL in development
const API_URL = process.env.NODE_ENV === 'production'
  ? '/api'
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Attach token if present
axios.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
