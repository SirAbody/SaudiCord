// Main App Component with Enhanced Error Handling
import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';

function App() {
  const { user, checkAuth, loading } = useAuthStore();
  const isAuthenticated = !!user;

  useEffect(() => {
    // Check authentication on mount
    checkAuth().catch(error => {
      console.error('Initial auth check failed:', error);
    });
  }, [checkAuth]);

  // Show loading screen during initial auth check
  if (loading && !user) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <Router>
        <div className="App">
          <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
              duration: 4000,
              style: {
                background: '#1f2937',
                color: '#fff',
                borderRadius: '0.5rem',
              },
              success: {
                iconTheme: {
                  primary: '#10b981',
                  secondary: '#fff',
                },
              },
              error: {
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
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
      </Router>
    </ErrorBoundary>
  );
}

export default App;
