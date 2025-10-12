// Simple App Component - Fixed for production build
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';

function App() {
  const { user, checkAuth } = useAuthStore();
  const [initialLoad, setInitialLoad] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    // Quick auth check with timeout
    const token = localStorage.getItem('token');
    if (token && checkAuth) {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        setInitialLoad(false);
      }, 2000); // 2 second max wait

      checkAuth()
        .catch(() => {
          // Silent fail
        })
        .finally(() => {
          clearTimeout(timeout);
          setInitialLoad(false);
        });
    } else {
      setInitialLoad(false);
    }
  }, [checkAuth]);

  // Show simple loading during initial check
  if (initialLoad) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading SaudiCord...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
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
            path="/dashboard/*" 
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} 
          />
          <Route 
            path="*" 
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
