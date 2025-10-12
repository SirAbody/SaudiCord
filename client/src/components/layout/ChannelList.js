// Channel List Component
import React, { useState, useEffect } from 'react';
import { HashtagIcon, SpeakerWaveIcon, PlusIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useChatStore } from '../../stores/chatStore';
import EmptyState from '../common/EmptyState';
import axios from 'axios';
import toast from 'react-hot-toast';
import { socketService } from '../../services/socket';

function ChannelList() {
  const { currentChannel, setCurrentChannel, fetchMessages } = useChatStore();
  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  // const [loading, setLoading] = useState(true); // Reserved for loading state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelType, setChannelType] = useState('text');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [currentServerId, setCurrentServerId] = useState(null);

  useEffect(() => {
    // Load real channels from server
    loadChannels();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadChannels = async () => {
    try {
      const response = await axios.get('/api/channels');
      const channels = response.data || [];
      
      // Get first server ID if available
      if (channels.length > 0 && channels[0].serverId) {
        setCurrentServerId(channels[0].serverId);
      }
      
      // Separate text and voice channels
      const text = channels.filter(ch => ch.type === 'text');
      const voice = channels.filter(ch => ch.type === 'voice');
      
      setTextChannels(text);
      setVoiceChannels(voice);
      
      // Auto-select first text channel
      if (text.length > 0 && !currentChannel) {
        handleChannelClick(text[0]);
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

    if (!currentServerId) {
      toast.error('No server selected');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('/api/channels', {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        type: channelType,
        description: newChannelDescription,
        serverId: currentServerId
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
    } finally {
      setCreating(false);
    }
  };

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
    </div>
  );
}

export default ChannelList;
