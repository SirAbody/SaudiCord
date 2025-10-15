// Channel List Component with Voice Integration
import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import { useVoice } from '../../contexts/VoiceContext';
import socketService from '../../services/socket';
import soundService from '../../services/soundService';
import axios from 'axios';
import { 
  HashtagIcon, 
  SpeakerWaveIcon, 
  PlusIcon,
  Cog6ToothIcon,
  UserPlusIcon,
  ChevronDownIcon,
  LockClosedIcon,
  BellIcon,
  MicrophoneIcon,
  UserIcon,
  TrashIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneSlashIcon,
  SpeakerWaveIcon as SpeakerSlashIcon
} from '@heroicons/react/24/solid';
import CreateChannelModal from '../modals/CreateChannelModal';
import InviteModal from '../modals/InviteModal';
import toast from 'react-hot-toast';
import ServerSettingsModal from '../modals/ServerSettingsModal';
import UserPresence from '../user/UserPresence';

function ChannelList() {
  const { channels, currentChannel, selectChannel, fetchMessages, currentServer } = useChatStore();
  const { user } = useAuthStore();
  const {
    isInVoice,
    currentChannel: voiceChannel,
    participants,
    speakingUsers,
    joinVoiceChannel,
    leaveVoiceChannel,
    isMuted,
    isDeafened
  } = useVoice();
  
  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [channelType, setChannelType] = useState('text');
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelDescription, setNewChannelDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showServerSettings, setShowServerSettings] = useState(false);
  const [expandedVoiceChannels, setExpandedVoiceChannels] = useState({});

  useEffect(() => {
    // Update channels when currentServer or channels change
    if (channels) {
      const text = channels.filter(ch => ch.type === 'text');
      const voice = channels.filter(ch => ch.type === 'voice');
      setTextChannels(text);
      setVoiceChannels(voice);
    } else {
      loadChannels();
    }
  }, [currentServer, channels]);

  const loadChannels = async () => {
    try {
      if (currentServer && (currentServer._id || currentServer.id)) {
        const serverId = currentServer._id || currentServer.id;
        const response = await axios.get(`/channels/server/${serverId}`);
        const channelsData = response.data || [];
        
        const text = channelsData.filter(ch => ch.type === 'text');
        const voice = channelsData.filter(ch => ch.type === 'voice');
        
        setTextChannels(text);
        setVoiceChannels(voice);
        
        // Auto-select first text channel
        if (text.length > 0 && !currentChannel) {
          handleChannelClick(text[0]);
        }
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

    if (!currentServer || (!currentServer._id && !currentServer.id)) {
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('/channels', {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        type: channelType,
        description: newChannelDescription,
        serverId: currentServer._id || currentServer.id
      });
      
      toast.success(`${channelType === 'text' ? 'Text' : 'Voice'} channel created!`);
      
      if (channelType === 'text') {
        setTextChannels([...textChannels, response.data]);
      } else {
        setVoiceChannels([...voiceChannels, response.data]);
      }
      
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
    // Handle voice channels
    if (channel.type === 'voice') {
      if (isInVoice && voiceChannel?.id === channel.id) {
        // Leave current voice channel
        leaveVoiceChannel();
      } else {
        // Join new voice channel
        await joinVoiceChannel(channel, currentServer);
      }
      return;
    }
    
    // Handle text channels
    if (currentChannel?.id === channel.id) {
      return; // Already in this channel
    }
    
    if (currentChannel) {
      socketService.leaveChannel(currentChannel.id);
    }
    
    selectChannel(channel);
    await fetchMessages(channel.id);
  };

  const toggleVoiceChannelExpand = (channelId) => {
    setExpandedVoiceChannels(prev => ({
      ...prev,
      [channelId]: !prev[channelId]
    }));
  };

  return (
    <div className="flex flex-col h-full bg-gray-800">
      {/* Server Header */}
      <div className="h-12 px-4 flex items-center justify-between shadow-md border-b border-gray-700">
        <h2 className="font-bold text-white truncate">
          {currentServer ? currentServer.name : 'Select a Server'}
        </h2>
        <div className="flex items-center gap-2">
          {currentServer && (
            <>
              <button
                onClick={() => setShowInviteModal(true)}
                className="p-1 hover:bg-gray-700 rounded transition"
                title="Invite People"
              >
                <UserPlusIcon className="w-4 h-4 text-gray-400" />
              </button>
              <button
                onClick={() => setShowServerSettings(true)}
                className="p-1 hover:bg-gray-700 rounded transition"
                title="Server Settings"
              >
                <Cog6ToothIcon className="w-4 h-4 text-gray-400" />
              </button>
            </>
          )}
        </div>
      </div>
      
      {/* Channel List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        {/* Text Channels */}
        <div className="mt-4">
          <div className="px-2 mb-1">
            <button 
              onClick={() => {
                setChannelType('text');
                setShowCreateModal(true);
              }}
              className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-300 w-full"
            >
              <ChevronDownIcon className="w-3 h-3 mr-0.5" />
              TEXT CHANNELS
              <PlusIcon className="w-4 h-4 ml-auto hover:text-white" />
            </button>
          </div>
          
          {textChannels.map(channel => (
            <button
              key={channel.id}
              onClick={() => handleChannelClick(channel)}
              className={`w-full px-2 py-1.5 mx-2 mb-0.5 rounded flex items-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors ${
                currentChannel?.id === channel.id ? 'bg-gray-700 text-white' : ''
              }`}
            >
              <HashtagIcon className="w-5 h-5 mr-2 text-gray-500" />
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
              className="flex items-center text-xs font-semibold text-gray-500 hover:text-gray-300 w-full"
            >
              <ChevronDownIcon className="w-3 h-3 mr-0.5" />
              VOICE CHANNELS
              <PlusIcon className="w-4 h-4 ml-auto hover:text-white" />
            </button>
          </div>
          
          {voiceChannels.map(channel => {
            const isActive = isInVoice && voiceChannel?.id === channel.id;
            const channelParticipants = isActive ? participants : [];
            const showParticipants = isActive || expandedVoiceChannels[channel.id];
            
            return (
              <div key={channel.id} className="mb-1">
                <div className="group w-full px-2 py-1.5 mx-2 rounded flex items-center text-gray-400 hover:text-white hover:bg-gray-700 transition-colors">
                  <button
                    onClick={() => handleChannelClick(channel)}
                    className={`flex items-center flex-1 ${
                      isActive ? 'text-white' : ''
                    }`}
                  >
                    <SpeakerWaveIcon className="w-5 h-5 mr-2 text-gray-500" />
                    <span className="text-sm flex-1 text-left">{channel.name}</span>
                    {isActive && (
                      <div className="flex items-center space-x-1 ml-2">
                        <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                        <span className="text-xs text-primary-400">Connected</span>
                      </div>
                    )}
                  </button>
                  
                  {/* Screen Share Button */}
                  {isActive && (
                    <button
                      onClick={() => {
                        if (window.voiceService && window.voiceService.startScreenShare) {
                          window.voiceService.startScreenShare();
                        }
                      }}
                      className="p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-600 rounded transition-all ml-2"
                      title="Share Screen"
                    >
                      <svg className="w-4 h-4 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </button>
                  )}
                </div>
                
                {/* Voice Participants List */}
                {showParticipants && (isActive || channelParticipants.length > 0) && (
                  <div className="ml-9 mt-1 space-y-0.5">
                    {/* Show current user first if connected */}
                    {isActive && user && (
                      <div className="flex items-center px-2 py-1 rounded bg-primary-900/20 border-l-2 border-primary-500">
                        <div className="relative mr-2">
                          <div className={`w-6 h-6 rounded-full overflow-hidden ${
                            speakingUsers.has('self') ? 'ring-2 ring-primary-500' : ''
                          }`}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                                <span className="text-xs text-white">
                                  {user.username?.[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          {speakingUsers.has('self') && (
                            <div className="absolute -inset-1 rounded-full border-2 border-primary-500 animate-pulse"></div>
                          )}
                        </div>
                        <span className="text-sm text-primary-400 flex-1 font-semibold">
                          {user.username} (You)
                        </span>
                        <div className="flex items-center space-x-0.5">
                          {isMuted && (
                            <MicrophoneSlashIcon className="w-3 h-3 text-red-500" />
                          )}
                          {isDeafened && (
                            <SpeakerSlashIcon className="w-3 h-3 text-red-500" />
                          )}
                        </div>
                      </div>
                    )}
                    
                    {/* Show other participants */}
                    {channelParticipants.map(participant => (
                      <div
                        key={participant.id}
                        className="flex items-center px-2 py-1 rounded hover:bg-gray-700/50 transition-colors"
                      >
                        {/* Avatar with speaking indicator */}
                        <div className="relative mr-2">
                          <div className={`w-6 h-6 rounded-full overflow-hidden ${
                            speakingUsers.has(participant.id) ? 'ring-2 ring-primary-500' : ''
                          }`}>
                            {participant.avatar ? (
                              <img src={participant.avatar} alt={participant.username} className="w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                <span className="text-xs text-white">
                                  {participant.username?.[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                          {speakingUsers.has(participant.id) && (
                            <div className="absolute -inset-1 rounded-full border-2 border-primary-500 animate-pulse"></div>
                          )}
                        </div>
                        
                        {/* Username and status */}
                        <span className="text-sm text-gray-300 flex-1">
                          {participant.username}
                        </span>
                        
                        {/* Status icons */}
                        <div className="flex items-center space-x-0.5">
                          {participant.isMuted && (
                            <MicrophoneSlashIcon className="w-3 h-3 text-red-500" />
                          )}
                          {participant.isDeafened && (
                            <SpeakerSlashIcon className="w-3 h-3 text-gray-500" />
                          )}
                        </div>
                      </div>
                    ))}
                    
                    {/* Show self if connected */}
                    {isActive && user && (
                      <div className="flex items-center px-2 py-1 rounded bg-gray-700/30">
                        <div className="relative mr-2">
                          <div className={`w-6 h-6 rounded-full overflow-hidden ${
                            speakingUsers.has('self') ? 'ring-2 ring-primary-500' : ''
                          }`}>
                            {user.avatar ? (
                              <img src={user.avatar} alt={user.username} className="w-full h-full" />
                            ) : (
                              <div className="w-full h-full bg-primary-600 flex items-center justify-center">
                                <span className="text-xs text-white">
                                  {user.username?.[0]?.toUpperCase()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-primary-400 flex-1">
                          {user.username} (You)
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {/* User Presence Section at Bottom */}
      <UserPresence />
      
      {/* Modals */}
      {showCreateModal && (
        <CreateChannelModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          channelType={channelType}
          onSubmit={handleCreateChannel}
          channelName={newChannelName}
          setChannelName={setNewChannelName}
          channelDescription={newChannelDescription}
          setChannelDescription={setNewChannelDescription}
          isCreating={creating}
        />
      )}
      
      {showInviteModal && currentServer && (
        <InviteModal
          isOpen={showInviteModal}
          onClose={() => setShowInviteModal(false)}
          serverId={currentServer._id || currentServer.id}
          serverName={currentServer.name}
        />
      )}
      
      {showServerSettings && currentServer && (
        <ServerSettingsModal
          isOpen={showServerSettings}
          onClose={() => setShowServerSettings(false)}
          server={currentServer}
        />
      )}
    </div>
  );
}

export default ChannelList;
