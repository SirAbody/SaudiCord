// Main Layout Component
import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import socketService from '../../services/socket';
import ServerList from './ServerList';
import ChannelList from './ChannelList';
import ChatArea from '../chat/ChatArea';
import UserList from './UserList';
import CallModal from '../call/CallModal';
import IncomingCallModal from '../call/IncomingCallModal';
import UserProfile from '../user/UserProfile';
import DirectMessages from '../../pages/DirectMessages';

function MainLayout() {
  const { user } = useAuthStore();
  const { currentChannel } = useChatStore();
  const [showUserProfile, setShowUserProfile] = useState(false);
  // const location = useLocation(); // Reserved for future use
  // const isDirectMessages = location.pathname === '/dashboard'; // Reserved for future use

  useEffect(() => {
    // Connect to socket server with better error handling
    const token = localStorage.getItem('token');
    if (token) {
      // Wait for Socket.io CDN to load
      let attempts = 0;
      const maxAttempts = 10;
      
      const tryConnect = () => {
        attempts++;
        
        // Check if Socket.io is available from CDN
        if (window.io && typeof window.io === 'function') {
          console.log('Socket.io found, attempting connection...');
          try {
            const socket = socketService.connect(token);
            if (!socket) {
              console.warn('Socket connection failed, running in offline mode');
            } else {
              console.log('Socket connection established successfully');
            }
          } catch (error) {
            console.error('Socket connection error:', error);
            // Continue without socket - UI should still work
          }
        } else if (attempts < maxAttempts) {
          // Try again after a delay
          console.log(`Waiting for Socket.io CDN to load... (attempt ${attempts}/${maxAttempts})`);
          console.log('window.io type:', typeof window.io);
          setTimeout(tryConnect, 1000); // Increased delay
        } else {
          console.warn('Socket.io CDN failed to load after', attempts, 'attempts');
          console.warn('Running in offline mode - real-time features disabled');
        }
      };

      // Start connection attempt after small delay
      const connectTimeout = setTimeout(tryConnect, 100);

      // Cleanup
      return () => {
        clearTimeout(connectTimeout);
        try {
          socketService.disconnect();
        } catch (error) {
          console.error('Socket disconnect error:', error);
        }
      };
    }
  }, []);

  return (
    <div className="flex h-screen bg-background-primary">
      {/* Server List - Far Left */}
      <div className="w-[72px] bg-background-tertiary flex-shrink-0">
        <ServerList />
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/dashboard" element={<DirectMessages />} />
        <Route path="/*" element={
          <>
            {/* Channel List */}
            <div className="w-60 bg-background-secondary flex-shrink-0 flex flex-col">
              <ChannelList />
              
              {/* User Info Bar at Bottom */}
              <div className="p-2 bg-dark-200 border-t border-dark-400">
                <div 
                  className="flex items-center p-2 rounded hover:bg-dark-300 cursor-pointer transition-colors"
                  onClick={() => setShowUserProfile(true)}
                >
                  <div className="relative">
                    <img
                      src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.username}&background=FF0000&color=fff`}
                      alt={user?.username}
                      className="w-8 h-8 rounded-full"
                    />
                    <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-dark-200 ${
                      user?.status === 'online' ? 'bg-green-500' :
                      user?.status === 'idle' ? 'bg-yellow-500' :
                      user?.status === 'dnd' ? 'bg-red-500' :
                      'bg-gray-500'
                    }`}></div>
                  </div>
                  <div className="ml-2 flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {user?.displayName || user?.username}
                    </p>
                    <p className="text-xs text-text-tertiary truncate">
                      #{user?.username}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex">
              {currentChannel ? (
                <>
                  <ChatArea />
                  {/* User List for current channel */}
                  <div className="w-60 bg-background-secondary flex-shrink-0">
                    <UserList />
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <h2 className="text-2xl font-bold text-text-primary mb-2">
                      Welcome to SaudiCord
                    </h2>
                    <p className="text-text-secondary">
                      Select a channel to start chatting
                    </p>
                    <p className="text-text-tertiary text-sm mt-4">
                      Made With Love By SirAbody
                    </p>
                  </div>
                </div>
              )}
            </div>
          </>
        } />
      </Routes>

      {/* Modals */}
      <CallModal />
      <IncomingCallModal />
      {showUserProfile && (
        <UserProfile onClose={() => setShowUserProfile(false)} />
      )}
    </div>
  );
}

export default MainLayout;
