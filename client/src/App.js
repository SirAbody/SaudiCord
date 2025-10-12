// Main App Component with Enhanced Error Handling
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';
import LoadingScreen from './components/common/LoadingScreen';
import toast from 'react-hot-toast';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('App Error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen w-screen bg-background-primary flex items-center justify-center">
          <div className="text-center p-8">
            <h1 className="text-3xl font-bold text-red-500 mb-4">Something went wrong</h1>
            <p className="text-text-secondary mb-4">
              {this.state.error?.message || 'An unexpected error occurred'}
            </p>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-primary hover:bg-primary-dark text-white rounded transition-colors"
            >
              Reload Application
            </button>
            <p className="text-text-tertiary text-sm mt-4">
              Made With Love By SirAbody
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  const { user, loading, checkAuth } = useAuthStore();
  const [authCheckComplete, setAuthCheckComplete] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    const performAuthCheck = async () => {
      try {
        await checkAuth();
        setAuthCheckComplete(true);
      } catch (error) {
        console.error('Auth check failed:', error);
        setAuthError(error);
        setAuthCheckComplete(true);
        
        // If auth check fails due to network, still allow access to login page
        if (error.message?.includes('Network') || error.message?.includes('fetch')) {
          toast.error('Connection issues detected. Some features may be limited.');
        }
      }
    };

    performAuthCheck();
  }, [checkAuth]);

  // Show loading only for initial auth check
  if (!authCheckComplete && loading) {
    return <LoadingScreen />;
  }

  // If there's an auth error but we're done checking, show the app
  // This prevents black screen when server is having issues
  if (authError && !user) {
    console.log('Auth error detected, showing login page');
  }

  return (
    <ErrorBoundary>
      <div className="h-screen w-screen bg-background-primary overflow-hidden">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/*" element={user ? <MainLayout /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </ErrorBoundary>
  );
}

export default App;
