// Chat Area Component
import React, { useState, useRef, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import MessageList from './MessageList';
import MessageInput from './MessageInput';
import socketService from '../../services/socket';
import { HashtagIcon, PhoneIcon, VideoCameraIcon, MapPinIcon, BellIcon, UsersIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

function ChatArea() {
  const { currentChannel, messages } = useChatStore();
  const { user } = useAuthStore();
  const { initiateCall } = useCallStore();
  const [showPinnedMessages, setShowPinnedMessages] = useState(false);

  const handleVoiceCall = async () => {
    if (currentChannel.type === 'text') {
      // For text channels, create a voice call room
      toast('Voice calls in text channels coming soon!', { icon: '🎤' });
    } else {
      // For voice channels, join the voice room
      const success = await initiateCall(
        { id: currentChannel.id, username: currentChannel.name },
        'voice',
        socketService.getSocket()
      );
      if (success) {
        toast.success('Joined voice channel');
      }
    }
  };

  const handleVideoCall = async () => {
    const success = await initiateCall(
      { id: currentChannel.id, username: currentChannel.name },
      'video',
      socketService.getSocket()
    );
    if (success) {
      toast.success('Started video call');
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Channel Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-dark-400 bg-background-secondary">
        <div className="flex items-center">
          <HashtagIcon className="w-5 h-5 text-text-tertiary mr-2" />
          <h2 className="font-semibold text-text-primary">{currentChannel.name}</h2>
          {currentChannel.topic && (
            <>
              <span className="mx-2 text-dark-500">|</span>
              <p className="text-sm text-text-secondary">{currentChannel.topic}</p>
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <button
            onClick={handleVoiceCall}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Start Voice Call"
          >
            <PhoneIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleVideoCall}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Start Video Call"
          >
            <VideoCameraIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowPinnedMessages(!showPinnedMessages)}
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Pinned Messages"
          >
            <MapPinIcon className="w-5 h-5" />
          </button>
          <button
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Notification Settings"
          >
            <BellIcon className="w-5 h-5" />
          </button>
          <button
            className="text-text-secondary hover:text-text-primary transition-colors"
            title="Member List"
          >
            <UsersIcon className="w-5 h-5" />
          </button>
          <div className="relative">
            <input
              type="text"
              placeholder="Search"
              className="bg-background-tertiary text-text-primary text-sm rounded px-2 py-1 w-36 focus:outline-none focus:ring-1 focus:ring-accent"
            />
            <MagnifyingGlassIcon className="w-4 h-4 absolute right-2 top-1.5 text-text-tertiary" />
          </div>
        </div>
      </div>
      
      {/* Messages Area */}
      <MessageList />
      
      {/* Message Input */}
      <MessageInput />
    </div>
  );
}

export default ChatArea;
