import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import socketService from '../services/socket';
import soundService from '../services/soundService';

const VoiceContext = createContext();

export const useVoice = () => {
  const context = useContext(VoiceContext);
  if (!context) {
    throw new Error('useVoice must be used within VoiceProvider');
  }
  return context;
};

export const VoiceProvider = ({ children }) => {
  // Voice state
  const [isInVoice, setIsInVoice] = useState(false);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [currentServer, setCurrentServer] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isDeafened, setIsDeafened] = useState(false);
  const [participants, setParticipants] = useState([]);
  const [speakingUsers, setSpeakingUsers] = useState(new Set());
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // connecting, connected, disconnected
  const [incomingCall, setIncomingCall] = useState(null);
  
  // WebRTC refs
  const localStreamRef = useRef(null);
  const peerConnectionsRef = useRef({});
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const speakingIntervalRef = useRef(null);
  
  // ICE servers configuration
  const iceServers = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  };

  // Initialize audio context for speaking detection
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Detect speaking from audio stream
  const detectSpeaking = (stream, userId) => {
    if (!audioContextRef.current) return;
    
    try {
      const source = audioContextRef.current.createMediaStreamSource(stream);
      const analyser = audioContextRef.current.createAnalyser();
      analyser.fftSize = 256;
      
      source.connect(analyser);
      
      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);
      
      const checkSpeaking = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / bufferLength;
        
        if (average > 30) { // Speaking threshold
          setSpeakingUsers(prev => new Set(prev).add(userId));
        } else {
          setSpeakingUsers(prev => {
            const newSet = new Set(prev);
            newSet.delete(userId);
            return newSet;
          });
        }
      };
      
      // Check speaking every 100ms
      const interval = setInterval(checkSpeaking, 100);
      
      return () => {
        clearInterval(interval);
        source.disconnect();
      };
    } catch (error) {
      console.error('[Voice] Error detecting speaking:', error);
    }
  };

  // Create peer connection
  const createPeerConnection = async (userId, isInitiator = false) => {
    console.log('[Voice] Creating peer connection for user:', userId, 'Initiator:', isInitiator);
    
    const pc = new RTCPeerConnection(iceServers);
    peerConnectionsRef.current[userId] = pc;
    
    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }
    
    // Handle incoming stream
    pc.ontrack = (event) => {
      console.log('[Voice] Received remote stream from:', userId);
      const [remoteStream] = event.streams;
      
      // Create audio element to play remote stream
      let audio = document.getElementById(`audio-${userId}`);
      if (!audio) {
        audio = document.createElement('audio');
        audio.id = `audio-${userId}`;
        audio.autoplay = true;
        audio.volume = isDeafened ? 0 : 1;
        document.body.appendChild(audio);
      }
      audio.srcObject = remoteStream;
      
      // Detect speaking for remote user
      detectSpeaking(remoteStream, userId);
    };
    
    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('[Voice] Sending ICE candidate to:', userId);
        socketService.emit('voice:ice-candidate', {
          to: userId,
          candidate: event.candidate
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Connection state with ${userId}:`, pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
        // Clean up failed connection
        closePeerConnection(userId);
      }
    };
    
    if (isInitiator) {
      // Create and send offer
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      console.log('[Voice] Sending offer to:', userId);
      socketService.emit('voice:offer', {
        to: userId,
        offer: offer
      });
    }
    
    return pc;
  };

  // Close peer connection
  const closePeerConnection = (userId) => {
    const pc = peerConnectionsRef.current[userId];
    if (pc) {
      pc.close();
      delete peerConnectionsRef.current[userId];
    }
    
    // Remove audio element
    const audio = document.getElementById(`audio-${userId}`);
    if (audio) {
      audio.remove();
    }
  };

  // Join voice channel
  const joinVoiceChannel = async (channel, server) => {
    console.log('[Voice] Joining channel:', channel.name);
    setConnectionStatus('connecting');
    
    try {
      // Initialize audio context
      initAudioContext();
      
      // Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 48000
        }
      });
      
      localStreamRef.current = stream;
      
      // Detect own speaking
      detectSpeaking(stream, 'self');
      
      // Join voice channel via socket
      socketService.emit('voice:join', {
        channelId: channel._id || channel.id,
        serverId: server?._id || server?.id
      });
      
      // Update state
      setIsInVoice(true);
      setCurrentChannel(channel);
      setCurrentServer(server);
      setConnectionStatus('connected');
      
      // Play join sound
      soundService.playSound('join');
      
      console.log('[Voice] Successfully joined channel');
      return true;
    } catch (error) {
      console.error('[Voice] Failed to join channel:', error);
      setConnectionStatus('disconnected');
      return false;
    }
  };

  // Leave voice channel
  const leaveVoiceChannel = () => {
    console.log('[Voice] Leaving voice channel');
    
    // Stop local stream
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    
    // Close all peer connections
    Object.keys(peerConnectionsRef.current).forEach(userId => {
      closePeerConnection(userId);
    });
    peerConnectionsRef.current = {};
    
    // Clear speaking detection
    if (speakingIntervalRef.current) {
      clearInterval(speakingIntervalRef.current);
      speakingIntervalRef.current = null;
    }
    
    // Notify server
    if (currentChannel) {
      socketService.emit('voice:leave', {
        channelId: currentChannel._id || currentChannel.id
      });
    }
    
    // Reset state
    setIsInVoice(false);
    setCurrentChannel(null);
    setCurrentServer(null);
    setParticipants([]);
    setSpeakingUsers(new Set());
    setConnectionStatus('disconnected');
    setIsMuted(false);
    setIsDeafened(false);
    
    // Play leave sound
    soundService.playSound('leave');
  };

  // Toggle mute
  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMuted;
        setIsMuted(!isMuted);
        
        // Notify other users
        socketService.emit('voice:mute-status', {
          channelId: currentChannel?._id || currentChannel?.id,
          isMuted: !isMuted
        });
      }
    }
  };

  // Toggle deafen
  const toggleDeafen = () => {
    const newDeafenState = !isDeafened;
    setIsDeafened(newDeafenState);
    
    // Mute all remote audio
    document.querySelectorAll('audio[id^="audio-"]').forEach(audio => {
      audio.volume = newDeafenState ? 0 : 1;
    });
    
    // If deafening, also mute microphone
    if (newDeafenState && localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = false;
        setIsMuted(true);
      }
    }
    
    // Notify other users
    socketService.emit('voice:deafen-status', {
      channelId: currentChannel?._id || currentChannel?.id,
      isDeafened: newDeafenState,
      isMuted: newDeafenState || isMuted
    });
  };

  // Handle incoming call
  const handleIncomingCall = (callData) => {
    setIncomingCall(callData);
    soundService.playSound('ringtone');
    
    // Auto-dismiss after 30 seconds
    setTimeout(() => {
      if (incomingCall?.id === callData.id) {
        rejectCall();
      }
    }, 30000);
  };

  // Accept call
  const acceptCall = async () => {
    if (!incomingCall) return;
    
    const { channelId, serverId, from } = incomingCall;
    
    // Join the voice channel
    await joinVoiceChannel(
      { _id: channelId, id: channelId, name: 'Private Call' },
      { _id: serverId, id: serverId }
    );
    
    setIncomingCall(null);
  };

  // Reject call
  const rejectCall = () => {
    if (incomingCall) {
      socketService.emit('voice:reject-call', {
        to: incomingCall.from
      });
      setIncomingCall(null);
    }
  };

  // Socket event listeners
  useEffect(() => {
    // User joined voice channel
    socketService.on('voice:user-joined', async (data) => {
      console.log('[Voice] User joined:', data);
      setParticipants(prev => [...prev, data.user]);
      
      // Create peer connection as initiator
      await createPeerConnection(data.user.id, true);
    });

    // User left voice channel
    socketService.on('voice:user-left', (data) => {
      console.log('[Voice] User left:', data);
      setParticipants(prev => prev.filter(p => p.id !== data.userId));
      closePeerConnection(data.userId);
    });

    // Existing participants in channel
    socketService.on('voice:existing-participants', async (data) => {
      console.log('[Voice] Existing participants:', data);
      setParticipants(data.participants);
      
      // Create peer connections for all existing participants
      for (const participant of data.participants) {
        await createPeerConnection(participant.id, true);
      }
    });

    // WebRTC offer received
    socketService.on('voice:offer', async (data) => {
      console.log('[Voice] Received offer from:', data.from);
      
      const pc = peerConnectionsRef.current[data.from] || await createPeerConnection(data.from, false);
      
      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      socketService.emit('voice:answer', {
        to: data.from,
        answer: answer
      });
    });

    // WebRTC answer received
    socketService.on('voice:answer', async (data) => {
      console.log('[Voice] Received answer from:', data.from);
      const pc = peerConnectionsRef.current[data.from];
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // ICE candidate received
    socketService.on('voice:ice-candidate', async (data) => {
      const pc = peerConnectionsRef.current[data.from];
      if (pc) {
        await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
      }
    });

    // Incoming call
    socketService.on('voice:incoming-call', handleIncomingCall);

    // User mute/deafen status
    socketService.on('voice:user-status', (data) => {
      setParticipants(prev => prev.map(p => 
        p.id === data.userId 
          ? { ...p, isMuted: data.isMuted, isDeafened: data.isDeafened }
          : p
      ));
    });

    return () => {
      socketService.off('voice:user-joined');
      socketService.off('voice:user-left');
      socketService.off('voice:existing-participants');
      socketService.off('voice:offer');
      socketService.off('voice:answer');
      socketService.off('voice:ice-candidate');
      socketService.off('voice:incoming-call');
      socketService.off('voice:user-status');
    };
  }, [currentChannel]);

  const value = {
    // State
    isInVoice,
    currentChannel,
    currentServer,
    isMuted,
    isDeafened,
    participants,
    speakingUsers,
    connectionStatus,
    incomingCall,
    
    // Actions
    joinVoiceChannel,
    leaveVoiceChannel,
    toggleMute,
    toggleDeafen,
    acceptCall,
    rejectCall
  };

  return <VoiceContext.Provider value={value}>{children}</VoiceContext.Provider>;
};

export default VoiceContext;
