// Voice Channel Display Component
// Shows users currently in voice channel
import React, { useState, useEffect } from 'react';
import { MicrophoneIcon, SpeakerWaveIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import socketService from '../../services/socket';
import voiceService from '../../services/voiceService';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';
import toast from 'react-hot-toast';

function VoiceChannelDisplay({ channelId, channelName }) {
  const { user } = useAuthStore();
  const { currentChannel } = useChatStore();
  const [usersInChannel, setUsersInChannel] = useState([]);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [localStream, setLocalStream] = useState(null);

  useEffect(() => {
    if (!channelId) return;

    // Join voice channel
    const joinVoice = async () => {
      try {
        // Use voice service to join channel
        const stream = await voiceService.joinVoiceChannel(channelId);
        setLocalStream(stream);
        
        // Add ourselves to the list
        setUsersInChannel([{
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          avatar: user.avatar,
          isMuted: false,
          isDeafened: false,
          isVideo: false,
          isSpeaking: false
        }]);
        
        toast.success(`Joined voice channel: ${channelName}`);
      } catch (error) {
        console.error('Failed to join voice channel:', error);
        toast.error('Failed to access microphone. Please check your microphone permissions.');
      }
    };

    joinVoice();

    // Listen for other users joining/leaving
    socketService.on('voice:user:joined', (data) => {
      console.log('User joined voice:', data);
      setUsersInChannel(prev => {
        // Check if user already in list
        if (prev.some(u => u.id === data.userId)) return prev;
        return [...prev, {
          id: data.userId,
          username: data.username,
          displayName: data.displayName,
          avatar: data.avatar,
          isMuted: false,
          isDeafened: false,
          isVideo: false,
          isSpeaking: false
        }];
      });
    });

    socketService.on('voice:user:left', (data) => {
      console.log('User left voice:', data);
      setUsersInChannel(prev => prev.filter(u => u.id !== data.userId));
    });

    socketService.on('voice:user:update', (data) => {
      setUsersInChannel(prev => prev.map(u => 
        u.id === data.userId 
          ? { ...u, ...data.updates }
          : u
      ));
    });

    // Listen for speaking indicators
    socketService.on('voice:speaking', (data) => {
      setUsersInChannel(prev => prev.map(u => 
        u.id === data.userId 
          ? { ...u, isSpeaking: data.isSpeaking }
          : u
      ));
    });

    return () => {
      // Leave voice channel
      voiceService.leaveVoiceChannel();
      
      socketService.off('voice:user:joined');
      socketService.off('voice:user:left');
      socketService.off('voice:user:update');
      socketService.off('voice:speaking');
      
      setUsersInChannel([]);
    };
  }, [channelId, channelName, user]);

  const toggleMute = () => {
    const newMutedState = !isMuted;
    const enabled = voiceService.toggleMute(newMutedState);
    setIsMuted(newMutedState);
    
    socketService.emit('voice:user:update', {
      channelId,
      userId: user.id,
      updates: { isMuted: newMutedState }
    });
  };

  const toggleDeafen = () => {
    setIsDeafened(!isDeafened);
    // Also mute when deafened
    if (!isDeafened && localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsMuted(true);
      }
    }
    
    socketService.emit('voice:user:update', {
      channelId,
      userId: user.id,
      updates: { 
        isDeafened: !isDeafened,
        isMuted: !isDeafened ? true : isMuted
      }
    });
  };

  const toggleVideo = async () => {
    if (!isVideo) {
      try {
        const videoStream = await navigator.mediaDevices.getUserMedia({ video: true });
        const videoTrack = videoStream.getVideoTracks()[0];
        
        if (localStream && videoTrack) {
          localStream.addTrack(videoTrack);
          setIsVideo(true);
          
          socketService.emit('voice:user:update', {
            channelId,
            userId: user.id,
            updates: { isVideo: true }
          });
        }
      } catch (error) {
        console.error('Failed to start video:', error);
        toast.error('Failed to access camera');
      }
    } else {
      if (localStream) {
        const videoTracks = localStream.getVideoTracks();
        videoTracks.forEach(track => {
          track.stop();
          localStream.removeTrack(track);
        });
      }
      setIsVideo(false);
      
      socketService.emit('voice:user:update', {
        channelId,
        userId: user.id,
        updates: { isVideo: false }
      });
    }
  };

  const leaveChannel = () => {
    voiceService.leaveVoiceChannel();
    // Trigger re-render by updating parent component state
    // This will unmount this component
    window.dispatchEvent(new CustomEvent('voiceChannelLeft'));
  };

  if (!channelId || usersInChannel.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-72 w-60 bg-dark-800 border-r border-dark-600 h-full pt-14 z-30">
      <div className="p-3">
        {/* Channel Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <SpeakerWaveIcon className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-gray-300">{channelName}</span>
          </div>
          <button
            onClick={leaveChannel}
            className="p-1 rounded hover:bg-dark-700 transition-colors"
            title="Leave Channel"
          >
            <XMarkIcon className="w-4 h-4 text-gray-400 hover:text-white" />
          </button>
        </div>
        
        {/* Users in channel - Discord Style */}
        <div className="space-y-1">
          {usersInChannel.map(user => (
            <div 
              key={user.id}
              className={`flex items-center space-x-3 p-2 rounded ${
                user.isSpeaking ? 'bg-green-500/10 border border-green-500/50' : 'hover:bg-dark-700'
              } transition-all cursor-pointer group`}
            >
              {/* Avatar with speaking indicator */}
              <div className={`relative flex-shrink-0 ${user.isSpeaking ? 'animate-pulse' : ''}`}>
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className={`w-8 h-8 rounded-full ${user.isSpeaking ? 'ring-2 ring-green-500' : ''}`}
                  />
                ) : (
                  <div className={`w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center ${user.isSpeaking ? 'ring-2 ring-green-500' : ''}`}>
                    <span className="text-xs text-white font-bold">
                      {user.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                {user.isVideo && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                    <VideoCameraIcon className="w-2.5 h-2.5 text-white" />
                  </div>
                )}
              </div>
              
              {/* Username and status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <span className={`text-sm font-medium truncate ${
                    user.isSpeaking ? 'text-green-400' : 'text-gray-300'
                  }`}>
                    {user.displayName || user.username}
                  </span>
                  {user.id === 509 && (
                    <span className="px-1.5 py-0.5 bg-red-500 text-white text-[10px] font-bold rounded">
                      LIVE
                    </span>
                  )}
                </div>
              </div>
              
              {/* Status icons */}
              <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {user.isMuted && (
                  <div className="text-red-500" title="Muted">
                    <MicrophoneIcon className="w-3.5 h-3.5" />
                  </div>
                )}
                {user.isDeafened && (
                  <div className="text-red-500" title="Deafened">
                    <SpeakerWaveIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Voice Controls at bottom */}
        <div className="absolute bottom-0 left-0 right-0 p-3 bg-dark-900 border-t border-dark-600">
          <div className="flex items-center justify-around">
            <button
              onClick={toggleMute}
              className={`p-2 rounded-full ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-dark-700 hover:bg-dark-600'
              } transition-colors`}
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              <MicrophoneIcon className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={toggleDeafen}
              className={`p-2 rounded-full ${
                isDeafened ? 'bg-red-500 hover:bg-red-600' : 'bg-dark-700 hover:bg-dark-600'
              } transition-colors`}
              title={isDeafened ? 'Undeafen' : 'Deafen'}
            >
              <SpeakerWaveIcon className="w-4 h-4 text-white" />
            </button>
            
            <button
              onClick={toggleVideo}
              className={`p-2 rounded-full ${
                isVideo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-dark-700 hover:bg-dark-600'
              } transition-colors`}
              title={isVideo ? 'Stop Video' : 'Start Video'}
            >
              <VideoCameraIcon className="w-4 h-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default VoiceChannelDisplay;
