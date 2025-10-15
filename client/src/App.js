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
import notificationService from './services/notificationService';
import socketService from './services/socket';

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

  // Setup global notification listeners
  useEffect(() => {
    if (!isAuthenticated) return;

    const handleGlobalMessage = (data) => {
      console.log('[App] Global message notification:', data);
      notificationService.showMessageNotification({
        senderName: data.senderName || data.from?.username || 'Someone',
        message: data.content || data.message,
        avatar: data.avatar || data.from?.avatar,
        conversationId: data.conversationId
      });
    };

    const handleFriendRequest = (data) => {
      console.log('[App] Friend request notification:', data);
      notificationService.showFriendRequestNotification({
        username: data.from?.username || data.username,
        avatar: data.from?.avatar || data.avatar
      });
    };

    const handleServerMessage = (data) => {
      console.log('[App] Server message notification:', data);
      notificationService.showServerMessageNotification({
        serverName: data.serverName,
        channelName: data.channelName,
        senderName: data.senderName,
        message: data.content || data.message,
        avatar: data.avatar,
        channelId: data.channelId,
        isMention: data.isMention || false
      });
    };

    // Listen for global socket events
    socketService.on('dm:receive', handleGlobalMessage);
    socketService.on('friend:request:received', handleFriendRequest);
    socketService.on('channel:message', handleServerMessage);

    return () => {
      socketService.off('dm:receive', handleGlobalMessage);
      socketService.off('friend:request:received', handleFriendRequest);
      socketService.off('channel:message', handleServerMessage);
    };
  }, [isAuthenticated]);

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
