// Voice Call Interface Component - Discord Style
import React, { useState, useEffect, useRef } from 'react';
import { 
  MicrophoneIcon,
  VideoCameraIcon,
  PhoneXMarkIcon,
  ComputerDesktopIcon,
  SpeakerWaveIcon,
  Cog6ToothIcon,
  XMarkIcon,
  VideoCameraSlashIcon,
  ArrowsPointingOutIcon,
  ArrowsPointingInIcon
} from '@heroicons/react/24/solid';
import { useAuthStore } from '../../stores/authStore';
import { useCallStore } from '../../stores/callStore';
import webrtcService from '../../services/webrtc';

function VoiceCallInterface({ channel, onClose }) {
  const { user } = useAuthStore();
  const { endCall } = useCallStore(); // currentCall removed as unused
  
  // Media states
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOn, setIsVideoOn] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [selectedParticipant, setSelectedParticipant] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [connectionQuality, setConnectionQuality] = useState('good');
  
  // Video refs
  const localVideoRef = useRef(null);
  const remoteVideoRefs = useRef({});
  const screenShareRef = useRef(null);
  const callContainerRef = useRef(null);
  
  // Layout states
  const [layout, setLayout] = useState('grid'); // grid, focus, sidebar
  const [focusedUser, setFocusedUser] = useState(null);
  
  useEffect(() => {
    // Initialize call when component mounts
    initializeCall();
    
    // WebRTC event listeners
    webrtcService.on('localStream', handleLocalStream);
    webrtcService.on('remoteStream', handleRemoteStream);
    webrtcService.on('participantJoined', handleParticipantJoined);
    webrtcService.on('participantLeft', handleParticipantLeft);
    webrtcService.on('screenShareStarted', handleScreenShareStarted);
    webrtcService.on('screenShareStopped', handleScreenShareStopped);
    webrtcService.on('connectionStateChange', handleConnectionStateChange);
    
    return () => {
      // Cleanup
      webrtcService.off('localStream', handleLocalStream);
      webrtcService.off('remoteStream', handleRemoteStream);
      webrtcService.off('participantJoined', handleParticipantJoined);
      webrtcService.off('participantLeft', handleParticipantLeft);
      webrtcService.off('screenShareStarted', handleScreenShareStarted);
      webrtcService.off('screenShareStopped', handleScreenShareStopped);
      webrtcService.off('connectionStateChange', handleConnectionStateChange);
      
      // Stop all tracks - store ref value to avoid stale closure
      const videoElement = localVideoRef.current;
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  
  const initializeCall = async () => {
    try {
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }, 
        video: false 
      });
      
      // Join voice channel
      await webrtcService.joinVoiceChannel(channel.id, stream);
      
      // Add self to participants
      setParticipants([{
        id: user.id,
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        isSelf: true,
        isMuted: false,
        isVideoOn: false,
        isScreenSharing: false,
        isSpeaking: false
      }]);
    } catch (error) {
      console.error('Failed to initialize call:', error);
    }
  };
  
  const handleLocalStream = (stream) => {
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = stream;
    }
  };
  
  const handleRemoteStream = ({ userId, stream }) => {
    if (remoteVideoRefs.current[userId]) {
      remoteVideoRefs.current[userId].srcObject = stream;
    }
  };
  
  const handleParticipantJoined = (participant) => {
    setParticipants(prev => [...prev, {
      ...participant,
      isSelf: false,
      isMuted: false,
      isVideoOn: false,
      isScreenSharing: false,
      isSpeaking: false
    }]);
  };
  
  const handleParticipantLeft = (userId) => {
    setParticipants(prev => prev.filter(p => p.id !== userId));
    
    // Clean up video ref
    if (remoteVideoRefs.current[userId]) {
      delete remoteVideoRefs.current[userId];
    }
  };
  
  const handleScreenShareStarted = ({ userId, stream }) => {
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = stream;
    }
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, isScreenSharing: true } : p
    ));
    
    // Switch to focus layout with screen share
    setLayout('focus');
    setFocusedUser(userId);
  };
  
  const handleScreenShareStopped = ({ userId }) => {
    if (screenShareRef.current) {
      screenShareRef.current.srcObject = null;
    }
    setParticipants(prev => prev.map(p => 
      p.id === userId ? { ...p, isScreenSharing: false } : p
    ));
    
    // Return to grid layout
    setLayout('grid');
    setFocusedUser(null);
  };
  
  const handleConnectionStateChange = (state) => {
    switch (state) {
      case 'connected':
        setConnectionQuality('good');
        break;
      case 'connecting':
        setConnectionQuality('connecting');
        break;
      case 'failed':
      case 'disconnected':
        setConnectionQuality('poor');
        break;
      default:
        break;
    }
  };
  
  const toggleMute = () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);
    
    // Mute/unmute local audio
    if (localVideoRef.current && localVideoRef.current.srcObject) {
      const audioTracks = localVideoRef.current.srcObject.getAudioTracks();
      audioTracks.forEach(track => {
        track.enabled = !newMutedState;
      });
    }
    
    // Notify other participants
    webrtcService.setAudioEnabled(!newMutedState);
  };
  
  const toggleVideo = async () => {
    const newVideoState = !isVideoOn;
    setIsVideoOn(newVideoState);
    
    if (newVideoState) {
      // Start video
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            frameRate: { ideal: 30 }
          }
        });
        
        if (localVideoRef.current) {
          const audioTracks = localVideoRef.current.srcObject?.getAudioTracks() || [];
          audioTracks.forEach(track => stream.addTrack(track));
          localVideoRef.current.srcObject = stream;
        }
        
        webrtcService.setVideoStream(stream);
      } catch (error) {
        console.error('Failed to start video:', error);
        setIsVideoOn(false);
      }
    } else {
      // Stop video
      if (localVideoRef.current && localVideoRef.current.srcObject) {
        const videoTracks = localVideoRef.current.srcObject.getVideoTracks();
        videoTracks.forEach(track => track.stop());
      }
      
      webrtcService.setVideoEnabled(false);
    }
  };
  
  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            width: { ideal: 1920 },
            height: { ideal: 1080 },
            frameRate: { ideal: 30 }
          },
          audio: true
        });
        
        stream.getVideoTracks()[0].onended = () => {
          setIsScreenSharing(false);
          webrtcService.stopScreenShare();
        };
        
        setIsScreenSharing(true);
        webrtcService.startScreenShare(stream);
        
        // Switch to focus layout
        setLayout('focus');
        setFocusedUser(user.id);
      } catch (error) {
        console.error('Failed to start screen share:', error);
      }
    } else {
      setIsScreenSharing(false);
      webrtcService.stopScreenShare();
      setLayout('grid');
      setFocusedUser(null);
    }
  };
  
  const toggleDeafen = () => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    
    // Deafen also mutes
    if (newDeafenState) {
      setIsMuted(true);
    }
    
    // Mute/unmute remote audio
    Object.values(remoteVideoRefs.current).forEach(videoRef => {
      if (videoRef && videoRef.srcObject) {
        videoRef.muted = newDeafenState;
      }
    });
  };
  
  const handleEndCall = () => {
    webrtcService.leaveVoiceChannel();
    endCall();
    onClose();
  };
  
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      callContainerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
    setIsFullscreen(!isFullscreen);
  };
  
  const getParticipantVideo = (participant) => {
    if (participant.isSelf) {
      return (
        <video
          ref={localVideoRef}
          autoPlay
          muted
          className="w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }} // Mirror for self view
        />
      );
    } else {
      return (
        <video
          ref={el => remoteVideoRefs.current[participant.id] = el}
          autoPlay
          className="w-full h-full object-cover"
        />
      );
    }
  };
  
  const renderParticipant = (participant, size = 'normal') => {
    const sizeClasses = {
      small: 'w-24 h-24',
      normal: 'w-full h-full',
      large: 'w-full h-full'
    };
    
    return (
      <div
        key={participant.id}
        className={`relative ${sizeClasses[size]} bg-gray-800 rounded-lg overflow-hidden`}
        onClick={() => setSelectedParticipant(participant)}
      >
        {participant.isVideoOn || participant.isScreenSharing ? (
          getParticipantVideo(participant)
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
            {participant.avatar ? (
              <img
                src={participant.avatar}
                alt={participant.username}
                className="w-20 h-20 rounded-full"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-3xl font-bold text-white">
                  {participant.username?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
          </div>
        )}
        
        {/* Participant info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
          <div className="flex items-center justify-between">
            <span className="text-white text-sm font-medium">
              {participant.displayName || participant.username}
              {participant.isSelf && ' (You)'}
            </span>
            <div className="flex items-center gap-1">
              {participant.isMuted && (
                <div className="p-1 bg-red-500 rounded">
                  <MicrophoneIcon className="w-3 h-3 text-white" />
                </div>
              )}
              {participant.isVideoOn && (
                <div className="p-1 bg-green-500 rounded">
                  <VideoCameraIcon className="w-3 h-3 text-white" />
                </div>
              )}
              {participant.isScreenSharing && (
                <div className="p-1 bg-blue-500 rounded">
                  <ComputerDesktopIcon className="w-3 h-3 text-white" />
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Speaking indicator */}
        {participant.isSpeaking && (
          <div className="absolute inset-0 border-2 border-green-500 rounded-lg pointer-events-none animate-pulse" />
        )}
      </div>
    );
  };
  
  const renderLayout = () => {
    switch (layout) {
      case 'focus':
        const focusedParticipant = participants.find(p => p.id === focusedUser);
        const otherParticipants = participants.filter(p => p.id !== focusedUser);
        
        return (
          <div className="flex flex-col h-full">
            {/* Main focused view */}
            <div className="flex-1 p-4">
              {focusedParticipant && renderParticipant(focusedParticipant, 'large')}
            </div>
            
            {/* Other participants strip */}
            {otherParticipants.length > 0 && (
              <div className="h-32 border-t border-gray-700 flex gap-2 p-2 overflow-x-auto">
                {otherParticipants.map(p => renderParticipant(p, 'small'))}
              </div>
            )}
          </div>
        );
        
      case 'sidebar':
        return (
          <div className="flex h-full">
            {/* Main view */}
            <div className="flex-1 p-4">
              {selectedParticipant ? 
                renderParticipant(selectedParticipant, 'large') :
                participants[0] && renderParticipant(participants[0], 'large')
              }
            </div>
            
            {/* Sidebar with all participants */}
            <div className="w-64 border-l border-gray-700 p-2 overflow-y-auto">
              <div className="space-y-2">
                {participants.map(p => (
                  <div key={p.id} className="aspect-video">
                    {renderParticipant(p, 'normal')}
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
        
      case 'grid':
      default:
        // Calculate grid size based on participants
        const gridCols = Math.ceil(Math.sqrt(participants.length));
        
        return (
          <div className="h-full p-4">
            <div 
              className="h-full grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridAutoRows: '1fr'
              }}
            >
              {participants.map(p => renderParticipant(p, 'normal'))}
            </div>
          </div>
        );
    }
  };
  
  return (
    <div 
      ref={callContainerRef}
      className="fixed inset-0 bg-gray-900 z-50 flex flex-col"
    >
      {/* Header */}
      <div className="h-14 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <h2 className="text-white font-semibold">
            {channel.name}
          </h2>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionQuality === 'good' ? 'bg-green-500' :
              connectionQuality === 'connecting' ? 'bg-yellow-500' :
              'bg-red-500'
            }`} />
            <span className="text-gray-400 text-sm">
              {participants.length} participant{participants.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Layout buttons */}
          <button
            onClick={() => setLayout('grid')}
            className={`p-2 rounded ${layout === 'grid' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Grid View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
            </svg>
          </button>
          
          <button
            onClick={() => setLayout('focus')}
            className={`p-2 rounded ${layout === 'focus' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Focus View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </button>
          
          <button
            onClick={() => setLayout('sidebar')}
            className={`p-2 rounded ${layout === 'sidebar' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'}`}
            title="Sidebar View"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
            </svg>
          </button>
          
          <div className="w-px h-6 bg-gray-700 mx-2" />
          
          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            className="p-2 text-gray-400 hover:text-white rounded"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? (
              <ArrowsPointingInIcon className="w-5 h-5" />
            ) : (
              <ArrowsPointingOutIcon className="w-5 h-5" />
            )}
          </button>
          
          {/* Settings button */}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-400 hover:text-white rounded"
            title="Settings"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
          
          {/* Close button */}
          <button
            onClick={handleEndCall}
            className="p-2 text-gray-400 hover:text-white rounded"
            title="Leave Call"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
      
      {/* Main content area */}
      <div className="flex-1 overflow-hidden">
        {renderLayout()}
      </div>
      
      {/* Bottom controls */}
      <div className="h-20 bg-gray-800 border-t border-gray-700 flex items-center justify-center px-4">
        <div className="flex items-center gap-2">
          {/* Microphone button */}
          <button
            onClick={toggleMute}
            className={`p-3 rounded-lg transition ${
              isMuted 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            <MicrophoneIcon className="w-6 h-6" />
            {isMuted && (
              <div className="absolute -top-1 -right-1">
                <div className="w-6 h-[2px] bg-white rotate-45 absolute" />
              </div>
            )}
          </button>
          
          {/* Deafen button */}
          <button
            onClick={toggleDeafen}
            className={`p-3 rounded-lg transition ${
              isDeafened 
                ? 'bg-red-500 text-white hover:bg-red-600' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            title={isDeafened ? "Undeafen" : "Deafen"}
          >
            <SpeakerWaveIcon className="w-6 h-6" />
            {isDeafened && (
              <div className="absolute -top-1 -right-1">
                <div className="w-6 h-[2px] bg-white rotate-45 absolute" />
              </div>
            )}
          </button>
          
          {/* Video button */}
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-lg transition ${
              isVideoOn 
                ? 'bg-green-500 text-white hover:bg-green-600' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            title={isVideoOn ? "Stop Video" : "Start Video"}
          >
            {isVideoOn ? (
              <VideoCameraIcon className="w-6 h-6" />
            ) : (
              <VideoCameraSlashIcon className="w-6 h-6" />
            )}
          </button>
          
          {/* Screen share button */}
          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-lg transition ${
              isScreenSharing 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-gray-700 text-white hover:bg-gray-600'
            }`}
            title={isScreenSharing ? "Stop Sharing" : "Share Screen"}
          >
            <ComputerDesktopIcon className="w-6 h-6" />
          </button>
          
          {/* End call button */}
          <button
            onClick={handleEndCall}
            className="p-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition ml-4"
            title="Leave Call"
          >
            <PhoneXMarkIcon className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* Settings panel */}
      {showSettings && (
        <div className="absolute top-14 right-4 w-80 bg-gray-800 border border-gray-700 rounded-lg shadow-xl p-4">
          <h3 className="text-white font-semibold mb-4">Voice Settings</h3>
          
          {/* Audio settings */}
          <div className="space-y-4">
            <div>
              <label className="text-gray-400 text-sm">Input Device</label>
              <select className="w-full mt-1 bg-gray-700 text-white rounded px-3 py-2">
                <option>Default Microphone</option>
              </select>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Output Device</label>
              <select className="w-full mt-1 bg-gray-700 text-white rounded px-3 py-2">
                <option>Default Speakers</option>
              </select>
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Input Volume</label>
              <input 
                type="range" 
                className="w-full mt-1"
                min="0" 
                max="100" 
                defaultValue="50"
              />
            </div>
            
            <div>
              <label className="text-gray-400 text-sm">Output Volume</label>
              <input 
                type="range" 
                className="w-full mt-1"
                min="0" 
                max="100" 
                defaultValue="50"
              />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Echo Cancellation</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Noise Suppression</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Automatic Gain Control</span>
              <input type="checkbox" defaultChecked className="toggle" />
            </div>
          </div>
          
          <button
            onClick={() => setShowSettings(false)}
            className="mt-4 w-full py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
          >
            Close Settings
          </button>
        </div>
      )}
    </div>
  );
}

export default VoiceCallInterface;
