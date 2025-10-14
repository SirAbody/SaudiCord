// Authentication Store using Zustand
import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

// Use relative URL in production, full URL in development
const API_URL = process.env.NODE_ENV === 'production' 
  ? '/api' 
  : (process.env.REACT_APP_API_URL || 'http://localhost:5000/api');

// Configure axios defaults
axios.defaults.baseURL = API_URL;
axios.defaults.withCredentials = true;

// Add token to all requests
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export const useAuthStore = create((set, get) => ({
  user: null,
  loading: false,
  error: null,

  // Login function
  login: async (username, password) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/auth/login', { username, password });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, loading: false });
      
      toast.success('Welcome back to SaudiCord!');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Login failed';
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      return false;
    }
  },

  // Register function
  register: async (username, email, password, displayName) => {
    set({ loading: true, error: null });
    try {
      const response = await axios.post('/auth/register', {
        username,
        email,
        password,
        displayName
      });
      const { user, token } = response.data;
      
      localStorage.setItem('token', token);
      set({ user, loading: false });
      
      toast.success('Welcome to SaudiCord!');
      return true;
    } catch (error) {
      const errorMessage = error.response?.data?.error || 'Registration failed';
      set({ error: errorMessage, loading: false });
      toast.error(errorMessage);
      return false;
    }
  },

  // Logout function
  logout: async () => {
    set({ loading: true });
    try {
      await axios.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      set({ user: null, loading: false });
      toast.success('Logged out successfully');
    }
  },

  // Check authentication status - FAST & NO LOOPS
  checkAuth: async () => {
    console.log('[AuthStore] checkAuth called');
    const token = localStorage.getItem('token');
    console.log('[AuthStore] Token from localStorage:', !!token);
    
    if (!token) {
      console.log('[AuthStore] No token found - setting user to null');
      set({ user: null, loading: false });
      return;
    }

    // Check if already checking to prevent loops
    const store = get();
    if (store.loading) {
      console.log('[AuthStore] Already checking auth - skipping');
      return;
    }
    
    set({ loading: true });
    try {
      console.log('[AuthStore] Verifying token with server...');
      // Reasonable timeout for slow connections
      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        console.log('[AuthStore] Auth verify timeout - aborting');
        controller.abort();
      }, 3000); // 3 seconds
      
      const response = await axios.get('/auth/verify', {
        signal: controller.signal,
        timeout: 3000
      });
      
      clearTimeout(timeoutId);
      console.log('[AuthStore] Auth verify response:', response.data);
      
      if (response.data.valid && response.data.user) {
        console.log('[AuthStore] Token valid - setting user:', response.data.user.username);
        set({ user: response.data.user, loading: false });
      } else {
        console.log('[AuthStore] Token invalid - removing and setting user to null');
        localStorage.removeItem('token');
        set({ user: null, loading: false });
      }
    } catch (error) {
      console.error('[AuthStore] Auth check error:', error.message, error);
      // Don't remove token on network errors
      if (error.response?.status === 401) {
        console.log('[AuthStore] Got 401 - removing token');
        localStorage.removeItem('token');
      }
      set({ user: null, loading: false });
    } finally {
      console.log('[AuthStore] Auth check finished');
    }
  },

  // Update user profile
  updateProfile: async (updates) => {
    try {
      const response = await axios.patch('/users/me', updates);
      set({ user: response.data });
      toast.success('Profile updated successfully');
      return true;
    } catch (error) {
      toast.error('Failed to update profile');
      return false;
    }
  },

  // Update user status
  updateStatus: async (status) => {
    try {
      await axios.patch('/users/me', { status });
      set((state) => ({
        user: { ...state.user, status }
      }));
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  }
}));
