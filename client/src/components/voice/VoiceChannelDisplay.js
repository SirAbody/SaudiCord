// Voice Channel Display Component
// Shows users currently in voice channel
import React, { useState, useEffect } from 'react';
import { MicrophoneIcon, SpeakerWaveIcon, VideoCameraIcon } from '@heroicons/react/24/solid';
import { XMarkIcon } from '@heroicons/react/24/outline';
import socketService from '../../services/socket';
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
        // Get user media
        const stream = await navigator.mediaDevices.getUserMedia({ 
          audio: true, 
          video: false 
        });
        setLocalStream(stream);
        
        // Notify server that we joined
        socketService.emit('voice:join', { 
          channelId, 
          userId: user.id,
          username: user.username,
          avatar: user.avatar
        });
        
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
        toast.error('Failed to access microphone');
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
      if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
      }
      
      socketService.emit('voice:leave', { channelId });
      socketService.off('voice:user:joined');
      socketService.off('voice:user:left');
      socketService.off('voice:user:update');
      socketService.off('voice:speaking');
      
      setUsersInChannel([]);
    };
  }, [channelId, channelName, user]);

  const toggleMute = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = isMuted;
        setIsMuted(!isMuted);
        
        socketService.emit('voice:user:update', {
          channelId,
          userId: user.id,
          updates: { isMuted: !isMuted }
        });
      }
    }
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
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    socketService.emit('voice:leave', { channelId });
    window.location.reload(); // Temporary - should use proper state management
  };

  if (!channelId || usersInChannel.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-64 right-0 bg-dark-800 border-t border-dark-600 p-4 z-40">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <SpeakerWaveIcon className="w-5 h-5 text-green-500" />
            <span className="text-white font-semibold">{channelName}</span>
          </div>
          
          {/* Users in channel */}
          <div className="flex items-center space-x-2">
            {usersInChannel.map(user => (
              <div 
                key={user.id}
                className={`relative flex items-center space-x-2 px-3 py-1 rounded-full ${
                  user.isSpeaking ? 'bg-green-500/20 ring-2 ring-green-500' : 'bg-dark-700'
                }`}
              >
                {user.avatar ? (
                  <img 
                    src={user.avatar} 
                    alt={user.username}
                    className="w-6 h-6 rounded-full"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-primary-500 flex items-center justify-center">
                    <span className="text-xs text-white">
                      {user.username?.[0]?.toUpperCase()}
                    </span>
                  </div>
                )}
                
                <span className="text-sm text-white">
                  {user.displayName || user.username}
                </span>
                
                {/* Status indicators */}
                <div className="flex items-center space-x-1">
                  {user.isMuted && (
                    <MicrophoneIcon className="w-3 h-3 text-red-500" />
                  )}
                  {user.isDeafened && (
                    <SpeakerWaveIcon className="w-3 h-3 text-red-500" />
                  )}
                  {user.isVideo && (
                    <VideoCameraIcon className="w-3 h-3 text-blue-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={toggleMute}
            className={`p-2 rounded ${
              isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-dark-700 hover:bg-dark-600'
            } transition-colors`}
            title={isMuted ? 'Unmute' : 'Mute'}
          >
            <MicrophoneIcon className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={toggleDeafen}
            className={`p-2 rounded ${
              isDeafened ? 'bg-red-500 hover:bg-red-600' : 'bg-dark-700 hover:bg-dark-600'
            } transition-colors`}
            title={isDeafened ? 'Undeafen' : 'Deafen'}
          >
            <SpeakerWaveIcon className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-2 rounded ${
              isVideo ? 'bg-blue-500 hover:bg-blue-600' : 'bg-dark-700 hover:bg-dark-600'
            } transition-colors`}
            title={isVideo ? 'Stop Video' : 'Start Video'}
          >
            <VideoCameraIcon className="w-5 h-5 text-white" />
          </button>
          
          <button
            onClick={leaveChannel}
            className="p-2 rounded bg-red-500 hover:bg-red-600 transition-colors ml-4"
            title="Leave Channel"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default VoiceChannelDisplay;
