import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon
} from '@heroicons/react/24/outline';
import {
  MicrophoneIcon as MicrophoneSlashIcon,
  VideoCameraIcon as VideoCameraSlashIcon,
  SpeakerWaveIcon as SpeakerSlashIcon
} from '@heroicons/react/24/solid';
import socketService from '../../services/socket';

function CallInterface({ 
  callType, 
  targetUser, 
  onEndCall, 
  isIncoming = false,
  onAccept,
  onReject 
}) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isSpeakerOff, setIsSpeakerOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const intervalRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);

  useEffect(() => {
    if (!isIncoming && !isConnected) {
      // Start connecting
      setTimeout(() => setIsConnected(true), 2000); // Simulate connection
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isIncoming, isConnected]);

  useEffect(() => {
    if (isConnected) {
      // Start timer
      intervalRef.current = setInterval(() => {
        setCallDuration(prev => prev + 1);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isConnected]);

  const formatDuration = (seconds) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMute = () => {
    setIsMuted(!isMuted);
    socketService.emit('call:mute', { muted: !isMuted });
  };

  const handleVideoToggle = () => {
    setIsVideoOff(!isVideoOff);
    socketService.emit('call:video', { enabled: !isVideoOff });
  };

  const handleSpeakerToggle = () => {
    setIsSpeakerOff(!isSpeakerOff);
  };

  const handleEndCall = () => {
    socketService.emit('call:end', { targetUserId: targetUser.id });
    onEndCall();
  };

  if (isIncoming && !isConnected) {
    // Incoming call UI
    return (
      <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
        <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full border border-primary-500/30">
          <div className="text-center">
            <div className="w-24 h-24 mx-auto bg-primary-500 rounded-full flex items-center justify-center mb-4">
              {targetUser.avatar ? (
                <img src={targetUser.avatar} alt="" className="w-full h-full rounded-full" />
              ) : (
                <span className="text-3xl text-white">
                  {targetUser.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">
              {targetUser.displayName || targetUser.username}
            </h2>
            
            <p className="text-gray-400 mb-8">
              Incoming {callType === 'video' ? 'Video' : 'Voice'} Call...
            </p>
            
            <div className="flex justify-center space-x-4">
              <button
                onClick={() => {
                  setIsConnected(true);
                  onAccept();
                }}
                className="p-4 bg-green-500 hover:bg-green-600 rounded-full transition"
              >
                <PhoneIcon className="w-6 h-6 text-white" />
              </button>
              
              <button
                onClick={() => {
                  onReject();
                }}
                className="p-4 bg-primary-500 hover:bg-primary-600 rounded-full transition"
              >
                <PhoneXMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Active call UI
  return (
    <div className="fixed inset-0 bg-black/95 flex flex-col z-50">
      {/* Video Area */}
      {callType === 'video' && (
        <div className="flex-1 relative">
          {/* Remote Video */}
          <video
            ref={remoteVideoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />
          
          {/* Local Video (Picture-in-Picture) */}
          <div className="absolute top-4 right-4 w-48 h-36 bg-gray-800 rounded-lg overflow-hidden border border-gray-700">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      )}

      {/* Voice Call View */}
      {callType === 'voice' && (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="w-32 h-32 mx-auto bg-primary-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              {targetUser.avatar ? (
                <img src={targetUser.avatar} alt="" className="w-full h-full rounded-full" />
              ) : (
                <span className="text-4xl text-white">
                  {targetUser.username?.[0]?.toUpperCase()}
                </span>
              )}
            </div>
            
            <h2 className="text-3xl font-bold text-white mb-2">
              {targetUser.displayName || targetUser.username}
            </h2>
            
            <p className="text-xl text-gray-400">
              {isConnected ? formatDuration(callDuration) : 'Connecting...'}
            </p>
          </div>
        </div>
      )}

      {/* Call Controls */}
      <div className="bg-gray-900/90 backdrop-blur p-4">
        <div className="max-w-md mx-auto">
          <div className="flex justify-center items-center space-x-4">
            {/* Mute Button */}
            <button
              onClick={handleMute}
              className={`p-4 rounded-full transition ${
                isMuted ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isMuted ? (
                <MicrophoneSlashIcon className="w-6 h-6 text-white" />
              ) : (
                <MicrophoneIcon className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Video Toggle (for video calls) */}
            {callType === 'video' && (
              <button
                onClick={handleVideoToggle}
                className={`p-4 rounded-full transition ${
                  isVideoOff ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'
                }`}
              >
                {isVideoOff ? (
                  <VideoCameraSlashIcon className="w-6 h-6 text-white" />
                ) : (
                  <VideoCameraIcon className="w-6 h-6 text-white" />
                )}
              </button>
            )}

            {/* Speaker Toggle */}
            <button
              onClick={handleSpeakerToggle}
              className={`p-4 rounded-full transition ${
                isSpeakerOff ? 'bg-primary-500 hover:bg-primary-600' : 'bg-gray-700 hover:bg-gray-600'
              }`}
            >
              {isSpeakerOff ? (
                <SpeakerSlashIcon className="w-6 h-6 text-white" />
              ) : (
                <SpeakerWaveIcon className="w-6 h-6 text-white" />
              )}
            </button>

            {/* Screen Share (for video calls) */}
            {callType === 'video' && (
              <button
                onClick={() => {/* Handle screen share */}}
                className="p-4 bg-gray-700 hover:bg-gray-600 rounded-full transition"
              >
                <ComputerDesktopIcon className="w-6 h-6 text-white" />
              </button>
            )}

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="p-4 bg-primary-600 hover:bg-primary-700 rounded-full transition ml-8"
            >
              <PhoneXMarkIcon className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Call Status */}
          <div className="text-center mt-4 text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Connecting...'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CallInterface;
