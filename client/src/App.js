// Main App Component with Enhanced Error Handling and Performance Optimization
import React, { useEffect, useState, Suspense, lazy, memo } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy load heavy components to prevent memory issues
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));

function App() {
  const authStore = useAuthStore();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Get user from store (might be undefined initially)
  const user = authStore?.user;
  const isAuthenticated = !!user;

  useEffect(() => {
    // Faster auth check with timeout to prevent hanging
    const token = localStorage.getItem('token');
    if (token && authStore?.checkAuth) {
      // Set timeout to prevent indefinite waiting
      const timeout = setTimeout(() => setInitialLoad(false), 1500);
      
      authStore.checkAuth()
        .catch(() => {
          // Silent fail - don't block UI
        })
        .finally(() => {
          clearTimeout(timeout);
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
        <Suspense fallback={
          <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="text-white text-lg">Loading...</div>
          </div>
        }>
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
        </Suspense>
      </div>
    </ErrorBoundary>
  );
}

export default App;
