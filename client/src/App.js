// SaudiCord App - Lightweight & Fast Version
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';

function App() {
  console.log('[App] Component mounting...');
  const authStore = useAuthStore();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Get user from store (might be undefined initially)
  const user = authStore?.user;
  const isAuthenticated = !!user;
  
  console.log('[App] Auth state:', {
    authStore: !!authStore,
    user: !!user,
    isAuthenticated,
    initialLoad
  });

  useEffect(() => {
    console.log('[App] useEffect running - checking auth...');
    // Auth check with reasonable timeout - ONLY RUN ONCE
    const token = localStorage.getItem('token');
    console.log('[App] Token exists:', !!token);
    
    if (token && authStore?.checkAuth) {
      console.log('[App] Starting auth check...');
      // Reasonable timeout for slow connections
      const timeout = setTimeout(() => {
        console.log('[App] Auth check timeout - setting initialLoad to false');
        setInitialLoad(false);
      }, 3500);
      
      authStore.checkAuth()
        .then(() => {
          console.log('[App] Auth check succeeded');
        })
        .catch((error) => {
          console.error('[App] Auth check failed:', error);
        })
        .finally(() => {
          clearTimeout(timeout);
          console.log('[App] Auth check complete - setting initialLoad to false');
          setInitialLoad(false);
        });
    } else {
      console.log('[App] No token or authStore - setting initialLoad to false');
      setInitialLoad(false);
    }
  }, []); // Empty dependency array - run only once on mount

  // Show loading screen during initial load
  if (initialLoad) {
    console.log('[App] Showing loading screen');
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="text-white text-xl mb-2">SaudiCord</div>
          <div className="text-gray-400">Loading...</div>
        </div>
      </div>
    );
  }
  
  console.log('[App] Rendering routes, isAuthenticated:', isAuthenticated);

  return (
    <div className="App">
      {console.log('[App] Rendering App component with Routes')}
      <Routes>
        <Route 
          path="/" 
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} 
        />
        <Route 
          path="/login" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <Login />} 
        />
        <Route 
          path="/register" 
          element={isAuthenticated ? <Navigate to="/" replace /> : <Register />} 
        />
        <Route 
          path="*" 
          element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} 
        />
      </Routes>
    </div>
  );
}

export default App;
