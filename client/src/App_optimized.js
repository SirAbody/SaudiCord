// Optimized App Component - Faster and Lighter
import React, { useEffect, useState, Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';

// Lazy load heavy components
const Login = lazy(() => import('./components/auth/Login'));
const Register = lazy(() => import('./components/auth/Register'));
const MainLayout = lazy(() => import('./components/layout/MainLayout'));
const ErrorBoundary = lazy(() => import('./components/ErrorBoundary'));

// Loading component
const LoadingScreen = () => (
  <div className="min-h-screen bg-gray-900 flex items-center justify-center">
    <div className="text-white text-xl">Loading...</div>
  </div>
);

function App() {
  const { user, checkAuth } = useAuthStore();
  const [initialLoad, setInitialLoad] = useState(true);
  const isAuthenticated = !!user;

  useEffect(() => {
    // Faster auth check with shorter timeout
    const token = localStorage.getItem('token');
    if (token && checkAuth) {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        setInitialLoad(false);
      }, 3000); // 3 second max wait

      checkAuth()
        .catch(() => {
          // Silent fail - continue anyway
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
    return <LoadingScreen />;
  }

  return (
    <Suspense fallback={<LoadingScreen />}>
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
    </Suspense>
  );
}

export default App;
