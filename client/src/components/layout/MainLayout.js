import React, { useEffect, useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import socketService from '../../services/socket';
import ServerList from './ServerList';
import ChannelList from './ChannelList';
import ChatArea from '../chat/ChatArea';
import DirectMessages from '../../pages/DirectMessages';
import UserProfile from '../user/UserProfile';
import CallModal from '../call/CallModal';
import IncomingCallModal from '../call/IncomingCallModal';
import useKeyboardShortcuts from '../../hooks/useKeyboardShortcuts';

function MainLayout() {
  console.log('[MainLayout] Component rendering');
  const { user } = useAuthStore();
  const { currentChannel } = useChatStore();
  const [showUserProfile, setShowUserProfile] = useState(false);
  
  // Enable keyboard shortcuts
  useKeyboardShortcuts();
  
  console.log('[MainLayout] User:', user);
  console.log('[MainLayout] Current channel:', currentChannel);

  useEffect(() => {
    // Connect to socket server
    const token = localStorage.getItem('token');
    if (token && user) {
      // Delay connection slightly to ensure components are mounted
      const connectTimer = setTimeout(() => {
        if (window.io) {
          socketService.connect(token);
        }
      }, 500); // Small delay to ensure CDN is loaded

      // Cleanup
      return () => {
        clearTimeout(connectTimer);
        try {
          socketService.disconnect();
        } catch (error) {
          console.error('Error disconnecting socket:', error);
        }
      };
    }
  }, [user]);
  return (
    <div className="flex h-screen bg-background-primary">
      {/* Server List - Far Left */}
      <div className="w-[72px] bg-black flex-shrink-0 border-r border-red-900/20">
        <ServerList />
      </div>

      {/* Routes */}
      <Routes>
        <Route path="/dashboard" element={<DirectMessages />} />
        <Route path="/*" element={
          <>
            {/* Channel List */}
            <div className="w-60 bg-background-secondary flex-shrink-0">
              <ChannelList />
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex">
              {currentChannel ? (
                <>
                  <ChatArea />
                  {/* User List for current channel - TODO: Create UserList component */}
                  {/* <div className="w-60 bg-background-secondary flex-shrink-0">
                    <UserList />
                  </div> */}
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
