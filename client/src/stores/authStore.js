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

  // Check authentication status - ENHANCED WITH BETTER PERSISTENCE
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
    
    // Try to decode token locally first for immediate UI update
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => 
        '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
      ).join(''));
      const decoded = JSON.parse(jsonPayload);
      
      // Check if token is expired
      if (decoded.exp && decoded.exp * 1000 < Date.now()) {
        console.log('[AuthStore] Token expired locally - removing');
        localStorage.removeItem('token');
        set({ user: null, loading: false });
        return null;
      }
      
      // Set user immediately from token while we verify with server
      const localUser = decoded.user || {
        id: decoded.userId || decoded.id,
        _id: decoded.userId || decoded.id,
        username: decoded.username,
        displayName: decoded.displayName,
        email: decoded.email,
        isAdmin: decoded.isAdmin
      };
      
      console.log('[AuthStore] Setting user from token:', localUser.username);
      set({ user: localUser, loading: true }); // Set user but keep loading
    } catch (decodeError) {
      console.error('[AuthStore] Failed to decode token locally:', decodeError);
    }
    
    set({ loading: true });
    
    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => {
      console.log('[AuthStore] Auth verify timeout - using local token');
      controller.abort();
    }, 5000); // Reduced timeout
    
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
      } else if (error.name === 'AbortError' || !error.response) {
        // Network timeout or abort - keep current user state
        console.log('[AuthStore] Network timeout/abort - keeping current user state');
        const currentUser = get().user;
        if (currentUser) {
          // We already have user from token decode, keep it
          set({ loading: false });
        } else if (token) {
          // Try to decode token locally as fallback
          console.log('[AuthStore] Falling back to local token decode');
          try {
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
                  _id: decoded.userId || decoded.id,
                  username: decoded.username,
                  displayName: decoded.displayName,
                  email: decoded.email,
                  isAdmin: decoded.isAdmin
                }, 
                loading: false 
              });
            }
          } catch (decodeError) {
            console.error('[AuthStore] Failed to decode token locally:', decodeError);
            set({ user: null, loading: false });
          }
        } else {
          set({ user: null, loading: false });
        }
      } else {
        // Other errors - log but keep user if we have one
        console.error('[AuthStore] Auth check error:', error.message);
        const currentUser = get().user;
        if (currentUser) {
          set({ loading: false });
        } else {
          set({ user: null, loading: false });
        }
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
