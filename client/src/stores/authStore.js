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

  // Check authentication status - FULLY FIXED FOR REFRESH ISSUE
  checkAuth: async () => {
    console.log('[AuthStore] checkAuth called');
    const token = localStorage.getItem('token');
    console.log('[AuthStore] Token from localStorage:', !!token);
    
    if (!token) {
      console.log('[AuthStore] No token found - setting user to null');
      set({ user: null, loading: false });
      return null;
    }

    // CRITICAL: Check if already have a user - don't clear it!
    const currentStore = get();
    if (currentStore.user) {
      console.log('[AuthStore] User already exists in store - keeping it');
      set({ loading: false });
      return currentStore.user;
    }
    
    // Decode token locally FIRST - this is instant and reliable
    let localUser = null;
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      const decoded = JSON.parse(jsonPayload);
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log('[AuthStore] Token expired - removing');
        localStorage.removeItem('token');
        set({ user: null, loading: false });
        return null;
      }
      
      // Extract user from token
      localUser = decoded.user || {
        id: decoded.userId || decoded.id,
        _id: decoded.userId || decoded.id,
        username: decoded.username,
        displayName: decoded.displayName,
        email: decoded.email,
        isAdmin: decoded.isAdmin
      };
      
      console.log('[AuthStore] Token valid - user:', localUser.username);
      // IMMEDIATELY set user - don't wait for backend!
      set({ user: localUser, loading: false });
      
    } catch (decodeError) {
      console.error('[AuthStore] Failed to decode token:', decodeError);
      // Token is corrupt - remove it
      localStorage.removeItem('token');
      set({ user: null, loading: false });
      return null;
    }
    
    // OPTIONAL: Try to verify with backend in background (non-blocking)
    // This runs AFTER we've already set the user
    setTimeout(async () => {
      try {
        console.log('[AuthStore] Background verification starting...');
        const response = await axios.get('/auth/verify', {
          timeout: 3000 // Short timeout, this is just a bonus check
        });
        
        if (response.data.valid && response.data.user) {
          console.log('[AuthStore] Backend verification successful - updating user data');
          // Update with fresh data from backend
          set({ user: response.data.user });
        } else if (!response.data.valid) {
          // Only logout if backend explicitly says token is invalid
          console.log('[AuthStore] Backend says token invalid - logging out');
          localStorage.removeItem('token');
          set({ user: null });
        }
      } catch (error) {
        // IMPORTANT: Ignore ALL errors - don't logout on network issues!
        if (error.response?.status === 401) {
          // Only on explicit 401 we logout
          console.log('[AuthStore] Got 401 - token rejected by server');
          localStorage.removeItem('token');
          set({ user: null });
        } else {
          // Any other error - KEEP THE USER LOGGED IN
          console.log('[AuthStore] Backend verification failed (network?) - keeping user logged in');
        }
      }
    }, 100); // Small delay to not block UI
    
    // Return the user we found
    return localUser;
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
