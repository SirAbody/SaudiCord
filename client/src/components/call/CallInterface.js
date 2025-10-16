import React, { useState, useEffect, useRef } from 'react';
import { 
  PhoneIcon,
  PhoneXMarkIcon,
  MicrophoneIcon,
  VideoCameraIcon,
  VideoCameraSlashIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  SpeakerXMarkIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon,
  Cog6ToothIcon,
  XMarkIcon
} from '@heroicons/react/24/solid';
import { VideoCameraIcon as VideoCameraOutlineIcon } from '@heroicons/react/24/outline';
import socketService from '../../services/socket';

function CallInterface({ 
  callType, 
  targetUser, 
  onEndCall, 
  isIncoming = false,
  onAccept,
  onReject,
  screenShare = null,
  remoteScreenShare = null 
}) {
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(100);
  const intervalRef = useRef(null);
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const containerRef = useRef(null);

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

  const handleDeafen = () => {
    setIsDeafened(!isDeafened);
    if (!isDeafened && !isMuted) {
      setIsMuted(true);
      socketService.emit('call:mute', { muted: true });
    }
  };

  const handleScreenShare = async () => {
    try {
      if (!isScreenSharing) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: true
        });
        setIsScreenSharing(true);
        socketService.emit('call:screenshare', { sharing: true });
        
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          socketService.emit('call:screenshare', { sharing: false });
        };
      } else {
        setIsScreenSharing(false);
        socketService.emit('call:screenshare', { sharing: false });
      }
    } catch (error) {
      console.error('Screen share error:', error);
    }
  };

  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
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

  // Active call UI - Discord Style
  return (
    <div ref={containerRef} className="fixed inset-0 bg-[#202225] flex flex-col z-50">
      {/* Top Bar with Participants */}
      <div className="h-[88px] bg-[#2f3136] border-b border-[#202225] flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          {/* User avatars */}
          <div className="flex items-center -space-x-3">
            {/* Current user */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2f3136] bg-[#36393f]">
                <span className="flex items-center justify-center w-full h-full text-white">
                  You
                </span>
              </div>
              {isMuted && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-[#f23f42] rounded-full flex items-center justify-center">
                  <XMarkIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
            
            {/* Target user */}
            <div className="relative">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#2f3136] bg-[#36393f]">
                {targetUser.avatar ? (
                  <img src={targetUser.avatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="flex items-center justify-center w-full h-full text-white font-semibold">
                    {targetUser.username?.[0]?.toUpperCase()}
                  </span>
                )}
              </div>
            </div>
          </div>
          
          {/* Call info */}
          <div>
            <div className="text-white font-semibold">
              {targetUser.displayName || targetUser.username}
            </div>
            <div className="text-[#b9bbbe] text-sm">
              {isConnected ? formatDuration(callDuration) : 'Connecting...'}
            </div>
          </div>
        </div>
        
        {/* Top controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleFullscreen}
            className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#36393f] rounded transition"
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-[#b9bbbe] hover:text-white hover:bg-[#36393f] rounded transition"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 relative bg-[#36393f] overflow-hidden">
        {/* Screen Share or Video */}
        {(isScreenSharing || remoteScreenShare || callType === 'video') ? (
          <div className="h-full w-full flex items-center justify-center p-4">
            {/* Main video/screen share */}
            {remoteScreenShare ? (
              <div className="relative max-w-full max-h-full">
                <div className="bg-black rounded-lg overflow-hidden">
                  {/* Remote screen share content */}
                  <div className="aspect-video bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center">
                    <span className="text-white text-2xl">Screen Share</span>
                  </div>
                </div>
                <div className="absolute top-2 left-2 bg-black/70 px-2 py-1 rounded text-white text-sm">
                  {targetUser.username} is sharing their screen
                </div>
              </div>
            ) : callType === 'video' ? (
              <div className="relative w-full h-full">
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-contain"
                />
                {/* Local video PiP */}
                <div className="absolute bottom-4 right-4 w-64 h-36 bg-[#202225] rounded-lg overflow-hidden border border-[#202225]">
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            ) : null}
            
            {/* User cards when screen sharing */}
            {(isScreenSharing || remoteScreenShare) && (
              <div className="absolute bottom-4 right-4 flex space-x-3">
                <UserCard user={{ username: "You" }} isMuted={isMuted} />
                <UserCard user={targetUser} />
              </div>
            )}
          </div>
        ) : (
          /* Voice call or video off view */
          <div className="h-full flex items-center justify-center">
            <div className="grid grid-cols-2 gap-4 max-w-4xl w-full px-8">
              {/* Current user card */}
              <div className="bg-[#292b2f] rounded-lg p-8 flex flex-col items-center justify-center aspect-video">
                <div className="w-32 h-32 rounded-full bg-[#36393f] flex items-center justify-center mb-4">
                  <span className="text-4xl text-white">You</span>
                </div>
                <h3 className="text-white text-xl font-semibold">You</h3>
                {isMuted && (
                  <div className="mt-2 text-[#f23f42] text-sm">Muted</div>
                )}
              </div>
              
              {/* Target user card */}
              <div className="bg-[#292b2f] rounded-lg p-8 flex flex-col items-center justify-center aspect-video">
                <div className="w-32 h-32 rounded-full bg-[#36393f] flex items-center justify-center mb-4">
                  {targetUser.avatar ? (
                    <img src={targetUser.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : (
                    <span className="text-4xl text-white">
                      {targetUser.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                <h3 className="text-white text-xl font-semibold">
                  {targetUser.displayName || targetUser.username}
                </h3>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Control Bar - Discord Style */}
      <div className="h-[88px] bg-[#292b2f] border-t border-[#202225] flex items-center justify-center">
        <div className="flex items-center space-x-2">
          {/* Microphone */}
          <button
            onClick={handleMute}
            className={`relative p-3 rounded-full transition-colors ${
              isMuted 
                ? 'bg-[#36393f] hover:bg-[#40444b] text-white' 
                : 'bg-[#36393f] hover:bg-[#40444b] text-[#b9bbbe] hover:text-white'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? (
              <div className="relative">
                <MicrophoneIcon className="w-5 h-5" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-[#f23f42] rotate-45" />
                </div>
              </div>
            ) : (
              <MicrophoneIcon className="w-5 h-5" />
            )}
          </button>

          {/* Deafen */}
          <button
            onClick={handleDeafen}
            className={`p-3 rounded-full transition-colors ${
              isDeafened 
                ? 'bg-[#36393f] hover:bg-[#40444b] text-white' 
                : 'bg-[#36393f] hover:bg-[#40444b] text-[#b9bbbe] hover:text-white'
            }`}
            title={isDeafened ? "Undeafen" : "Deafen"}
          >
            {isDeafened ? (
              <SpeakerXMarkIcon className="w-5 h-5" />
            ) : (
              <SpeakerWaveIcon className="w-5 h-5" />
            )}
          </button>

          {/* Video */}
          <button
            onClick={handleVideoToggle}
            className={`p-3 rounded-full transition-colors ${
              isVideoOff 
                ? 'bg-[#36393f] hover:bg-[#40444b] text-white' 
                : 'bg-[#36393f] hover:bg-[#40444b] text-[#b9bbbe] hover:text-white'
            }`}
            title={isVideoOff ? "Turn on Camera" : "Turn off Camera"}
          >
            {isVideoOff ? (
              <div className="relative">
                <VideoCameraIcon className="w-5 h-5" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-6 h-0.5 bg-[#f23f42] rotate-45" />
                </div>
              </div>
            ) : (
              <VideoCameraIcon className="w-5 h-5" />
            )}
          </button>

          {/* Screen Share */}
          <button
            onClick={handleScreenShare}
            className={`p-3 rounded-full transition-colors ${
              isScreenSharing 
                ? 'bg-[#3ba55d] hover:bg-[#2d7d46] text-white' 
                : 'bg-[#36393f] hover:bg-[#40444b] text-[#b9bbbe] hover:text-white'
            }`}
            title={isScreenSharing ? "Stop Sharing" : "Share Your Screen"}
          >
            <ComputerDesktopIcon className="w-5 h-5" />
          </button>

          {/* End Call */}
          <button
            onClick={handleEndCall}
            className="p-3 bg-[#f23f42] hover:bg-[#d83c3f] rounded-full text-white transition-colors ml-4"
            title="Leave Call"
          >
            <PhoneXMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// User Card Component
function UserCard({ user, isMuted = false }) {
  return (
    <div className="bg-[#292b2f] rounded-lg p-4 flex flex-col items-center min-w-[180px]">
      <div className="relative">
        <div className="w-20 h-20 rounded-full bg-[#36393f] flex items-center justify-center">
          {user.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full rounded-full object-cover" />
          ) : (
            <span className="text-2xl text-white">
              {user.username?.[0]?.toUpperCase()}
            </span>
          )}
        </div>
        {isMuted && (
          <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-[#f23f42] rounded-full flex items-center justify-center">
            <XMarkIcon className="w-4 h-4 text-white" />
          </div>
        )}
      </div>
      <div className="mt-2 text-white text-sm font-medium">
        {user.username}
      </div>
    </div>
  );
}

export default CallInterface;
