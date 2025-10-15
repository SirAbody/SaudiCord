import React, { useState, useEffect } from 'react';
import { useVoice } from '../../contexts/VoiceContext';
import { 
  MicrophoneIcon,
  SpeakerWaveIcon,
  PhoneXMarkIcon,
  Cog6ToothIcon,
  XMarkIcon,
  ChevronUpIcon
} from '@heroicons/react/24/solid';
import {
  MicrophoneIcon as MicrophoneSlashIcon,
  SpeakerWaveIcon as SpeakerSlashIcon
} from '@heroicons/react/24/outline';

function VoiceBottomBar() {
  const {
    isInVoice,
    currentChannel,
    currentServer,
    isMuted,
    isDeafened,
    participants,
    speakingUsers,
    connectionStatus,
    toggleMute,
    toggleDeafen,
    leaveVoiceChannel
  } = useVoice();

  const [isMinimized, setIsMinimized] = useState(false);
  const [showParticipants, setShowParticipants] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [startTime, setStartTime] = useState(null);

  // Track call duration
  useEffect(() => {
    if (isInVoice && !startTime) {
      setStartTime(Date.now());
    } else if (!isInVoice) {
      setStartTime(null);
      setCallDuration(0);
    }
  }, [isInVoice]);

  useEffect(() => {
    if (!startTime) return;

    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime]);

  // Format duration
  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  if (!isInVoice) return null;

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <button
          onClick={() => setIsMinimized(false)}
          className="bg-gray-800 p-3 rounded-full shadow-lg hover:bg-gray-700 transition-all group"
        >
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
            <SpeakerWaveIcon className="w-5 h-5 text-primary-500" />
            <span className="text-white text-sm font-medium hidden group-hover:block">
              Voice Connected
            </span>
          </div>
        </button>
      </div>
    );
  }

  return (
    <>
      {/* Main Bottom Bar */}
      <div className={`fixed bottom-0 left-0 right-0 z-40 bg-gray-800 border-t border-gray-700 shadow-2xl transition-all duration-300 ${
        showParticipants ? 'h-64' : 'h-16'
      }`}>
        {/* Participants List (Expandable) */}
        {showParticipants && (
          <div className="h-48 overflow-y-auto border-b border-gray-700 p-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
              Voice Channel — {participants.length} members
            </h3>
            <div className="grid grid-cols-6 gap-2">
              {participants.map(user => (
                <div key={user.id} className="flex flex-col items-center">
                  <div className="relative">
                    <div className={`w-12 h-12 rounded-full bg-gray-600 flex items-center justify-center ${
                      speakingUsers.has(user.id) ? 'ring-2 ring-primary-500 ring-opacity-75' : ''
                    }`}>
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.username} className="w-full h-full rounded-full" />
                      ) : (
                        <span className="text-white font-semibold">
                          {user.username?.[0]?.toUpperCase()}
                        </span>
                      )}
                    </div>
                    {/* Status indicators */}
                    <div className="absolute -bottom-1 -right-1 flex">
                      {user.isMuted && (
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <MicrophoneSlashIcon className="w-3 h-3 text-white" />
                        </div>
                      )}
                      {user.isDeafened && (
                        <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center ml-0.5">
                          <SpeakerSlashIcon className="w-3 h-3 text-white" />
                        </div>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-300 mt-1 truncate max-w-full">
                    {user.username}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Main Control Bar */}
        <div className="h-16 px-4 flex items-center justify-between">
          {/* Left Section - Channel Info */}
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowParticipants(!showParticipants)}
              className="flex items-center space-x-2 hover:bg-gray-700 px-3 py-2 rounded transition-colors"
            >
              <div className="flex items-center space-x-2">
                <SpeakerWaveIcon className="w-5 h-5 text-primary-500" />
                <div className="text-left">
                  <div className="flex items-center space-x-2">
                    <span className="text-white font-medium text-sm">
                      {currentChannel?.name || 'Voice Channel'}
                    </span>
                    <ChevronUpIcon className={`w-4 h-4 text-gray-400 transition-transform ${
                      showParticipants ? 'rotate-180' : ''
                    }`} />
                  </div>
                  <div className="flex items-center space-x-2 text-xs">
                    {currentServer && (
                      <span className="text-gray-400">{currentServer.name}</span>
                    )}
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-primary-500 rounded-full animate-pulse"></div>
                      <span className="text-primary-400">
                        {connectionStatus === 'connecting' ? 'Connecting...' : 'Voice Connected'}
                      </span>
                      {callDuration > 0 && (
                        <span className="text-gray-500 ml-2">{formatDuration(callDuration)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* Center Section - Voice Controls */}
          <div className="flex items-center space-x-2">
            {/* Microphone Toggle */}
            <button
              onClick={toggleMute}
              disabled={isDeafened}
              className={`relative p-3 rounded transition-all group ${
                isMuted || isDeafened
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              } ${speakingUsers.has('self') && !isMuted ? 'ring-2 ring-primary-500 ring-opacity-50' : ''}`}
            >
              {isMuted || isDeafened ? (
                <div className="relative">
                  <MicrophoneIcon className="w-5 h-5 text-white" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-0.5 h-6 bg-white rotate-45"></div>
                  </div>
                </div>
              ) : (
                <MicrophoneIcon className="w-5 h-5 text-white" />
              )}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isMuted || isDeafened ? 'Unmute' : 'Mute'}
              </div>
            </button>

            {/* Deafen Toggle */}
            <button
              onClick={toggleDeafen}
              className={`relative p-3 rounded transition-all group ${
                isDeafened 
                  ? 'bg-red-500 hover:bg-red-600' 
                  : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isDeafened ? (
                <div className="relative">
                  <SpeakerWaveIcon className="w-5 h-5 text-white" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-0.5 h-6 bg-white rotate-45"></div>
                  </div>
                </div>
              ) : (
                <SpeakerWaveIcon className="w-5 h-5 text-white" />
              )}
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                {isDeafened ? 'Undeafen' : 'Deafen'}
              </div>
            </button>

            {/* Settings */}
            <button
              className="relative p-3 bg-gray-700 hover:bg-gray-600 rounded transition-all group"
              onClick={() => {/* TODO: Open settings */}}
            >
              <Cog6ToothIcon className="w-5 h-5 text-white" />
              <div className="absolute -bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Settings
              </div>
            </button>
          </div>

          {/* Right Section - Leave/Minimize */}
          <div className="flex items-center space-x-2">
            {/* Disconnect */}
            <button
              onClick={leaveVoiceChannel}
              className="relative p-3 bg-red-500 hover:bg-red-600 rounded transition-all group flex items-center space-x-2"
            >
              <PhoneXMarkIcon className="w-5 h-5 text-white" />
              <span className="text-white text-sm font-medium hidden sm:block">Leave</span>
              <div className="absolute -bottom-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Disconnect
              </div>
            </button>

            {/* Minimize */}
            <button
              onClick={() => setIsMinimized(true)}
              className="relative p-3 bg-gray-700 hover:bg-gray-600 rounded transition-all group"
            >
              <XMarkIcon className="w-5 h-5 text-white" />
              <div className="absolute -bottom-8 right-0 bg-gray-900 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                Minimize
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Style for animations */}
      <style jsx>{`
        @keyframes pulse-ring {
          0% {
            box-shadow: 0 0 0 0 rgba(83, 252, 24, 0.7);
          }
          70% {
            box-shadow: 0 0 0 10px rgba(83, 252, 24, 0);
          }
          100% {
            box-shadow: 0 0 0 0 rgba(83, 252, 24, 0);
          }
        }
        
        .ring-2.ring-primary-500 {
          animation: pulse-ring 1.5s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
      `}</style>
    </>
  );
}

export default VoiceBottomBar;
