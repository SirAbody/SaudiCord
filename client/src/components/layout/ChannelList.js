// Channel List Component
import React, { useState, useEffect } from 'react';
import { HashtagIcon, SpeakerWaveIcon, PlusIcon, XMarkIcon, ChevronDownIcon, PhoneIcon, PhoneXMarkIcon, UserPlusIcon } from '@heroicons/react/24/outline';
import { useChatStore } from '../../stores/chatStore';
// import { useCallStore } from '../../stores/callStore'; // Reserved for future use
import axios from 'axios';
import toast from 'react-hot-toast';
import socketService from '../../services/socket';
import webrtcService from '../../services/webrtc';
import InviteModal from '../modals/InviteModal';
import VoiceChannelDisplay from '../voice/VoiceChannelDisplay';

function ChannelList() {
  const { currentChannel, selectChannel, fetchMessages, currentServer, channels } = useChatStore();
  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  // const [loading, setLoading] = useState(true); // Reserved for loading state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [channelType, setChannelType] = useState('text');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [activeVoiceChannel, setActiveVoiceChannel] = useState(null);

  useEffect(() => {
    // Listen for voice channel left event
    const handleVoiceChannelLeft = () => {
      setActiveVoiceChannel(null);
    };
    
    window.addEventListener('voiceChannelLeft', handleVoiceChannelLeft);
    
    return () => {
      window.removeEventListener('voiceChannelLeft', handleVoiceChannelLeft);
    };
  }, []);

  useEffect(() => {
    // Update channels when currentServer or channels change
    if (channels) {
      const text = channels.filter(ch => ch.type === 'text');
      const voice = channels.filter(ch => ch.type === 'voice');
      setTextChannels(text);
      setVoiceChannels(voice);
    } else {
      // Load real channels from server
      loadChannels();
    }
  }, [currentServer, channels]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChannels = async () => {
    try {
      // If we have a current server, load its channels
      if (currentServer) {
        const response = await axios.get(`/channels/server/${currentServer.id}`);
        const channelsData = response.data || [];
        
        // Separate text and voice channels
        const text = channelsData.filter(ch => ch.type === 'text');
        const voice = channelsData.filter(ch => ch.type === 'voice');
        
        setTextChannels(text);
        setVoiceChannels(voice);
        
        // Auto-select first text channel
        if (text.length > 0 && !currentChannel) {
          handleChannelClick(text[0]);
        }
      } else {
        // Load default channels
        const response = await axios.get('/channels');
        const channelsData = response.data || [];
        
        // Separate text and voice channels
        const text = channelsData.filter(ch => ch.type === 'text');
        const voice = channelsData.filter(ch => ch.type === 'voice');
        
        setTextChannels(text);
        setVoiceChannels(voice);
      }
    } catch (error) {
      console.error('Failed to load channels:', error);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast.error('Channel name is required');
      return;
    }

    if (!currentServer || !currentServer.id) {
      toast.error('No server selected');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('/channels', {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        type: channelType,
        description: newChannelDescription,
        serverId: currentServer.id
      });
      
      toast.success(`${channelType === 'text' ? 'Text' : 'Voice'} channel created!`);
      
      // Update local state
      if (channelType === 'text') {
        setTextChannels([...textChannels, response.data]);
      } else {
        setVoiceChannels([...voiceChannels, response.data]);
      }
      
      // Reset and close modal
      setShowCreateModal(false);
      setNewChannelName('');
      setNewChannelDescription('');
      setChannelType('text');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create channel');
      setCreating(false);
    }
  };

  const handleChannelClick = async (channel) => {
    if (currentChannel?.id === channel.id) {
      return; // Already in this channel
    }
    
    // Leave current channel if exists
    if (currentChannel) {
      socketService.leaveChannel(currentChannel.id);
      
      // If leaving a voice channel, end the call
      if (currentChannel.type === 'voice' && webrtcService.isInCall()) {
        webrtcService.endCall();
        toast.success('Left voice channel');
      }
    }
    
    // Join new channel
    selectChannel(channel);
    
    // Handle channel type
    if (channel.type === 'text') {
      // Fetch messages for text channels
      await fetchMessages(channel.id);
    } else if (channel.type === 'voice') {
      setActiveVoiceChannel(channel);
    } else {
      setActiveVoiceChannel(null);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-dark-400">
        <h2 className="font-bold text-text-primary">
          {currentServer ? currentServer.name : 'Select a Server'}
        </h2>
        <div className="flex items-center gap-2">
          {currentServer && (
            <button
              onClick={() => setShowInviteModal(true)}
              className="p-1 hover:bg-gray-700 rounded transition"
              title="Invite People"
            >
              <UserPlusIcon className="w-4 h-4 text-text-secondary" />
            </button>
          )}
          <ChevronDownIcon className="w-4 h-4 text-text-secondary" />
        </div>
      </div>
      
      {/* Channel Categories */}
      <div className="flex-1 overflow-y-auto">
        {/* Text Channels */}
        <div className="mt-4">
          <div className="px-2 mb-1">
            <button 
              onClick={() => {
                setChannelType('text');
                setShowCreateModal(true);
              }}
              className="flex items-center text-xs font-semibold text-text-tertiary hover:text-text-secondary w-full"
            >
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
            <button 
              onClick={() => {
                setChannelType('voice');
                setShowCreateModal(true);
              }}
              className="flex items-center text-xs font-semibold text-text-tertiary hover:text-text-secondary w-full"
            >
              <ChevronDownIcon className="w-3 h-3 mr-0.5" />
              VOICE CHANNELS
              <PlusIcon className="w-4 h-4 ml-auto hover:text-text-primary" />
            </button>
          </div>
          
          {voiceChannels.map(channel => {
            const isActive = currentChannel?.id === channel.id;
            const isInCall = isActive && webrtcService.isInCall();
            
            return (
              <div key={channel.id} className="relative group">
                <button
                  onClick={() => handleChannelClick(channel)}
                  className={`w-full px-2 py-1 flex items-center text-text-secondary hover:text-text-primary hover:bg-dark-400/50 rounded transition-colors ${
                    isActive ? 'bg-dark-400/50 text-text-primary' : ''
                  }`}
                >
                  <SpeakerWaveIcon className="w-5 h-5 mr-1.5 text-text-tertiary" />
                  <span className="text-sm flex-1 text-left">{channel.name}</span>
                  {isInCall && (
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-green-500">Connected</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          webrtcService.endCall();
                          toast.success('Left voice channel');
                        }}
                        className="p-1 hover:bg-red-500/20 rounded"
                      >
                        <PhoneXMarkIcon className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  )}
                  {!isInCall && isActive && (
                    <PhoneIcon className="w-4 h-4 text-green-500 animate-pulse" />
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create Channel Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-600 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-primary">
                Create {channelType === 'text' ? 'Text' : 'Voice'} Channel
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Channel Type
                </label>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setChannelType('text')}
                    className={`flex-1 px-3 py-2 rounded flex items-center justify-center space-x-2 ${
                      channelType === 'text' ? 'bg-accent text-white' : 'bg-dark-400 text-text-secondary'
                    }`}
                  >
                    <HashtagIcon className="w-4 h-4" />
                    <span>Text</span>
                  </button>
                  <button
                    onClick={() => setChannelType('voice')}
                    className={`flex-1 px-3 py-2 rounded flex items-center justify-center space-x-2 ${
                      channelType === 'voice' ? 'bg-accent text-white' : 'bg-dark-400 text-text-secondary'
                    }`}
                  >
                    <SpeakerWaveIcon className="w-4 h-4" />
                    <span>Voice</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Channel Name
                </label>
                <input
                  type="text"
                  value={newChannelName}
                  onChange={(e) => setNewChannelName(e.target.value)}
                  className="w-full bg-dark-400 text-text-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder={channelType === 'text' ? 'general' : 'General Voice'}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={newChannelDescription}
                  onChange={(e) => setNewChannelDescription(e.target.value)}
                  className="w-full bg-dark-400 text-text-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="What's this channel for?"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-dark-400 text-text-primary rounded hover:bg-dark-500 transition"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateChannel}
                  className="flex-1 px-4 py-2 bg-accent text-white rounded hover:bg-accent-dark transition disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Channel'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Invite Modal */}
      {showInviteModal && currentServer && (
        <InviteModal 
          server={currentServer}
          onClose={() => setShowInviteModal(false)}
        />
      )}
      
      {/* Voice Channel Display */}
      {activeVoiceChannel && (
        <VoiceChannelDisplay
          channelId={activeVoiceChannel.id}
          channelName={activeVoiceChannel.name}
        />
      )}
    </div>
  );
}

export default ChannelList;
