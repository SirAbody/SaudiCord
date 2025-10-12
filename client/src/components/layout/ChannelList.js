// Channel List Component
import React, { useEffect, useState } from 'react';
import { HashtagIcon, SpeakerWaveIcon, VideoCameraIcon, ChevronDownIcon, PlusIcon } from '@heroicons/react/24/outline';
import { useChatStore } from '../../stores/chatStore';
import socketService from '../../services/socket';

function ChannelList() {
  const { channels, currentChannel, setCurrentChannel, fetchMessages } = useChatStore();
  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);

  useEffect(() => {
    // Simulate fetching channels - in production this would come from the API
    setTextChannels([
      { id: '1', name: 'general', type: 'text' },
      { id: '2', name: 'random', type: 'text' },
      { id: '3', name: 'tech-talk', type: 'text' },
    ]);

    setVoiceChannels([
      { id: '4', name: 'General Voice', type: 'voice' },
      { id: '5', name: 'Gaming', type: 'voice' },
    ]);
  }, []);

  const handleChannelClick = async (channel) => {
    if (currentChannel?.id === channel.id) return;
    
    // Leave current channel
    if (currentChannel) {
      socketService.leaveChannel(currentChannel.id);
    }
    
    // Join new channel
    setCurrentChannel(channel);
    socketService.joinChannel(channel.id);
    
    // Fetch messages for text channels
    if (channel.type === 'text') {
      await fetchMessages(channel.id);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Server Name Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-dark-400">
        <h2 className="font-bold text-text-primary">SaudiCord Server</h2>
        <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
      </div>
      
      {/* Channel Categories */}
      <div className="flex-1 overflow-y-auto">
        {/* Text Channels */}
        <div className="mt-4">
          <div className="px-2 mb-1">
            <button className="flex items-center text-xs font-semibold text-text-tertiary hover:text-text-secondary w-full">
              <ChevronDownIcon className="w-3 h-3 mr-0.5" />
              TEXT CHANNELS
              <PlusIcon className="w-4 h-4 ml-auto hover:text-text-primary" />
            </button>
          </div>
          
          {textChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className={`w-full px-2 py-1 flex items-center text-text-secondary hover:text-text-primary hover:bg-dark-400/50 rounded transition-colors ${
                currentChannel?.id === channel.id ? 'bg-dark-400/50 text-text-primary' : ''
              }`}
            >
              <HashtagIcon className="w-5 h-5 mr-1.5 text-text-tertiary" />
              <span className="text-sm">{channel.name}</span>
            </button>
          ))}
        </div>

        {/* Voice Channels */}
        <div className="mt-6">
          <div className="px-2 mb-1">
            <button className="flex items-center text-xs font-semibold text-text-tertiary hover:text-text-secondary w-full">
              <ChevronDownIcon className="w-3 h-3 mr-0.5" />
              VOICE CHANNELS
              <PlusIcon className="w-4 h-4 ml-auto hover:text-text-primary" />
            </button>
          </div>
          
          {voiceChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className={`w-full px-2 py-1 flex items-center text-text-secondary hover:text-text-primary hover:bg-dark-400/50 rounded transition-colors ${
                currentChannel?.id === channel.id ? 'bg-dark-400/50 text-text-primary' : ''
              }`}
            >
              <SpeakerWaveIcon className="w-5 h-5 mr-1.5 text-text-tertiary" />
              <span className="text-sm">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ChannelList;
