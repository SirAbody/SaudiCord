// SaudiCord App - Lightweight & Fast Version
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';

function App() {
  const authStore = useAuthStore();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Get user from store (might be undefined initially)
  const user = authStore?.user;
  const isAuthenticated = !!user;

  useEffect(() => {
    // Auth check with reasonable timeout
    const token = localStorage.getItem('token');
    if (token && authStore?.checkAuth) {
      // Reasonable timeout for slow connections
      const timeout = setTimeout(() => setInitialLoad(false), 3500);
      
      authStore.checkAuth()
        .catch(() => {})
        .finally(() => {
          clearTimeout(timeout);
          setInitialLoad(false);
        });
    } else {
      setInitialLoad(false);
    }
  }, [authStore]);

  // Show loading screen during initial load
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading SaudiCord...</div>
      </div>
    );
  }

  return (
    <div className="App">
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
