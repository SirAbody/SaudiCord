// SaudiCord App - Lightweight & Fast Version
import React, { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Login from './components/auth/Login';
import Register from './components/auth/Register';
import MainLayout from './components/layout/MainLayout';
import InvitePage from './pages/InvitePage';
import { SocketProvider } from './contexts/SocketContext';
import NotificationManager from './components/notifications/NotificationManager';

function App() {
  console.log('[App] Component mounting...');
  const { user, checkAuth } = useAuthStore();
  const [initialLoad, setInitialLoad] = useState(true);
  
  // Simple auth check - trust the token!
  const token = localStorage.getItem('token');
  const isAuthenticated = !!(user || token);
  
  console.log('[App] Auth state:', {
    user: !!user,
    token: !!token,
    isAuthenticated,
    initialLoad
  });

  useEffect(() => {
    console.log('[App] Running auth check...');
    
    // Simple and fast auth check
    checkAuth()
      .finally(() => {
        console.log('[App] Auth check complete');
        setInitialLoad(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <SocketProvider>
      <div className="App">
        {console.log('[App] Rendering App component with Routes')}
        {isAuthenticated && <NotificationManager />}
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
            path="/invite/:inviteCode" 
            element={<InvitePage />} 
          />
          <Route 
            path="*" 
            element={isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />} 
          />
        </Routes>
      </div>
    </SocketProvider>
  );
}

export default App;
