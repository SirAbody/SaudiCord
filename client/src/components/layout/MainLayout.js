// Main Layout Component
import React, { useEffect, useState } from 'react';
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

function MainLayout() {
  const { user } = useAuthStore();
  const { currentChannel } = useChatStore();
  const [showUserProfile, setShowUserProfile] = useState(false);

  useEffect(() => {
    // Connect to socket server
    const token = localStorage.getItem('token');
    if (token) {
      socketService.connect(token);
    }

    // Cleanup on unmount
    return () => {
      socketService.disconnect();
    };
  }, []);

  return (
    <div className="flex h-screen bg-background-primary">
      {/* Server List - Far Left */}
      <div className="w-[72px] bg-background-tertiary flex-shrink-0">
        <ServerList />
      </div>

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
