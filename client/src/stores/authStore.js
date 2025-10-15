// Authentication Store using Zustand
import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

// Axios is already configured in axiosSetup-mongodb.js
// No need to set baseURL here

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
      return null;
    }

    // Check if already checking to prevent loops
    const store = get();
    if (store.loading) {
      console.log('[AuthStore] Already checking auth - skipping');
      return;
    }
    
    set({ loading: true });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[AuthStore] Auth verify timeout - aborting');
      controller.abort();
    }, 10000);
    
    try {
      const response = await axios.get('/auth/verify', {
        signal: controller.signal,
        timeout: 10000
      });
      
      clearTimeout(timeoutId);
      
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
      clearTimeout(timeoutId);
      
      // Only remove token and logout on 401 (invalid token)
      if (error.response?.status === 401) {
        console.log('[AuthStore] Got 401 - invalid token, logging out');
        localStorage.removeItem('token');
        set({ user: null, loading: false });
      } else if (token) {
        // For network errors, timeouts, etc - try to decode token locally
        console.log('[AuthStore] Network error but token exists, trying local decode');
        try {
          // Decode JWT token without verification (for display purposes)
          const base64Url = token.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
            '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          ).join(''));
          const decoded = JSON.parse(jsonPayload);
          
          // Check if token is expired
          if (decoded.exp && decoded.exp * 1000 < Date.now()) {
            console.log('[AuthStore] Token expired locally');
            localStorage.removeItem('token');
            set({ user: null, loading: false });
          } else {
            // Token seems valid, keep user logged in
            console.log('[AuthStore] Token valid locally, keeping user logged in');
            set({ 
              user: decoded.user || { 
                id: decoded.userId || decoded.id, 
                username: decoded.username,
                displayName: decoded.displayName,
                email: decoded.email
              }, 
              loading: false 
            });
          }
        } catch (decodeError) {
          console.error('[AuthStore] Failed to decode token locally:', decodeError);
          // If we can't decode, keep the token and assume logged in
          set({ user: { id: 'temp', username: 'User' }, loading: false });
        }
      } else {
        set({ user: null, loading: false });
      }
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
