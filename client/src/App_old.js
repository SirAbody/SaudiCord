// Main App Component with Enhanced Error Handling
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';
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
    // Check for stored token on mount
    const token = localStorage.getItem('token');
    if (token && authStore?.checkAuth) {
      authStore.checkAuth().catch(error => {
        console.error('Initial auth check failed:', error);
      }).finally(() => {
        setInitialLoad(false);
      });
    } else {
      setInitialLoad(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty dependency array - only run once on mount

  // Show loading screen during initial load
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
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />} 
          />
          <Route 
            path="/login" 
            element={isAuthenticated ? <Navigate to="/" /> : <Login />} 
          />
          <Route 
            path="/register" 
            element={isAuthenticated ? <Navigate to="/" /> : <Register />} 
          />
          <Route 
            path="/dashboard/*" 
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />} 
          />
          <Route 
            path="*" 
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" />} 
          />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
