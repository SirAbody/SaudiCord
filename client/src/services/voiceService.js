// Voice Service for handling WebRTC connections
// Made With Love By SirAbody

import axios from 'axios';
import socketService from './socket';

class VoiceService {
  constructor() {
    this.peers = new Map(); // Map of userId -> RTCPeerConnection
    this.localStream = null;
    this.remoteStreams = new Map();
    this.currentChannelId = null;
    this.iceServers = null;
    this.isConnected = false;
    
    // Fetch ICE servers on initialization
    this.fetchIceServers();
    
    // Setup socket listeners
    this.setupSocketListeners();
  }
  
  async fetchIceServers() {
    try {
      const response = await axios.get('/api/voice/ice-servers');
      this.iceServers = response.data;
      console.log('[Voice] ICE servers loaded:', this.iceServers);
    } catch (error) {
      console.error('[Voice] Failed to fetch ICE servers:', error);
      // Use default servers as fallback
      this.iceServers = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ]
      };
    }
  }
  
  setupSocketListeners() {
    // Handle when another user joins the voice channel
    socketService.on('voice:user:joined', async (data) => {
      console.log('[Voice] User joined:', data);
      // Don't create connection for ourselves
      const currentUserId = localStorage.getItem('userId');
      if (data.userId === currentUserId || data.userId === socketService.socket?.userId) {
        return;
      }
      
      if (this.currentChannelId && this.localStream) {
        // Small delay to ensure the new user is ready
        setTimeout(async () => {
          // Create offer for the new user
          await this.createPeerConnection(data.userId, true);
        }, 1000);
      }
    });
    
    // Handle WebRTC offer
    socketService.on('webrtc:offer', async (data) => {
      console.log('[Voice] Received offer from:', data.senderId);
      if (this.currentChannelId && this.localStream) {
        await this.handleOffer(data.senderId, data.offer);
      }
    });
    
    // Handle WebRTC answer
    socketService.on('webrtc:answer', async (data) => {
      console.log('[Voice] Received answer from:', data.senderId);
      const pc = this.peers.get(data.senderId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });
    
    // Handle ICE candidates
    socketService.on('webrtc:ice-candidate', async (data) => {
      const pc = this.peers.get(data.senderId);
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
          console.log(`[Voice] Added ICE candidate from ${data.senderId}`);
        } catch (error) {
          console.error('[Voice] Error adding ICE candidate:', error);
        }
      }
    });
    
    // Handle user leaving
    socketService.on('voice:user:left', (data) => {
      console.log('[Voice] User left:', data.userId);
      this.removePeerConnection(data.userId);
    });
  }
  
  async joinVoiceChannel(channelId) {
    try {
      console.log('[Voice] Joining channel:', channelId);
      
      // Get user media
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        },
        video: false
      });
      
      this.currentChannelId = channelId;
      this.isConnected = true;
      
      // Notify server
      socketService.emit('voice:join', { channelId });
      
      return this.localStream;
    } catch (error) {
      console.error('[Voice] Failed to join channel:', error);
      throw error;
    }
  }
  
  async createPeerConnection(userId, createOffer = false) {
    console.log('[Voice] Creating peer connection for:', userId, 'createOffer:', createOffer);
    
    // Close existing connection if any
    if (this.peers.has(userId)) {
      this.removePeerConnection(userId);
    }
    
    // Create new peer connection
    const pc = new RTCPeerConnection(this.iceServers);
    this.peers.set(userId, pc);
    
    // Add error handlers
    pc.onerror = (error) => {
      console.error('[Voice] Peer connection error:', error);
    };
    
    pc.oniceconnectionstatechange = () => {
      console.log(`[Voice] ICE connection state with ${userId}:`, pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.error('[Voice] ICE connection failed, attempting restart');
        this.restartIce(userId);
      }
    };
    
    // Add local stream tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }
    
    // Handle remote stream
    pc.ontrack = (event) => {
      console.log('[Voice] Received remote track from:', userId);
      const [remoteStream] = event.streams;
      this.remoteStreams.set(userId, remoteStream);
      
      // Play audio
      this.playRemoteAudio(userId, remoteStream);
    };
    
    // Handle ICE candidates with proper error handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        console.log(`[Voice] Sending ICE candidate to ${userId}`);  
        socketService.emit('webrtc:ice-candidate', {
          targetUserId: userId,
          candidate: event.candidate.toJSON ? event.candidate.toJSON() : event.candidate
        });
      }
    };
    
    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`[Voice] Connection state with ${userId}:`, pc.connectionState);
    };
    
    // Create offer if needed
    if (createOffer) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      
      socketService.emit('webrtc:offer', {
        targetUserId: userId,
        offer: offer
      });
    }
    
    return pc;
  }
  
  async handleOffer(senderId, offer) {
    console.log('[Voice] Handling offer from:', senderId);
    
    // Create peer connection if doesn't exist
    if (!this.peers.has(senderId)) {
      await this.createPeerConnection(senderId, false);
    }
    
    const pc = this.peers.get(senderId);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    
    // Create and send answer
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    
    socketService.emit('webrtc:answer', {
      targetUserId: senderId,
      answer: answer
    });
  }
  
  removePeerConnection(userId) {
    const pc = this.peers.get(userId);
    if (pc) {
      pc.close();
      this.peers.delete(userId);
    }
    
    // Remove remote stream
    const remoteStream = this.remoteStreams.get(userId);
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStreams.delete(userId);
    }
    
    // Remove audio element
    const audioElement = document.getElementById(`audio-${userId}`);
    if (audioElement) {
      audioElement.remove();
    }
  }
  
  playRemoteAudio(userId, stream) {
    // Remove existing audio element if exists
    let audioElement = document.getElementById(`audio-${userId}`);
    if (audioElement) {
      audioElement.remove();
    }
    
    // Create new audio element
    audioElement = document.createElement('audio');
    audioElement.id = `audio-${userId}`;
    audioElement.srcObject = stream;
    audioElement.autoplay = true;
    document.body.appendChild(audioElement);
    
    console.log(`[Voice] Playing audio for user ${userId}`);
  }
  
  async leaveVoiceChannel() {
    console.log('[Voice] Leaving voice channel');
    
    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    // Close all peer connections
    this.peers.forEach((pc, userId) => {
      pc.close();
    });
    this.peers.clear();
    
    // Remove all remote streams
    this.remoteStreams.forEach((stream, userId) => {
      stream.getTracks().forEach(track => track.stop());
      const audioElement = document.getElementById(`audio-${userId}`);
      if (audioElement) {
        audioElement.remove();
      }
    });
    this.remoteStreams.clear();
    
    // Notify server
    if (this.currentChannelId) {
      socketService.emit('voice:leave', { channelId: this.currentChannelId });
    }
    
    this.currentChannelId = null;
    this.isConnected = false;
  }
  
  toggleMute(muted) {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !muted;
        return !muted;
      }
    }
    return false;
  }
  
  async restartIce(userId) {
    const pc = this.peers.get(userId);
    if (!pc) return;
    
    try {
      // Create new offer with ice restart
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      
      socketService.emit('webrtc:ice-restart', {
        targetUserId: userId,
        offer: offer
      });
    } catch (error) {
      console.error('[Voice] Failed to restart ICE:', error);
    }
  }
  
  isInVoiceChannel() {
    return this.isConnected && this.currentChannelId !== null;
  }
  
  getCurrentChannel() {
    return this.currentChannelId;
  }
  
  getRemoteStreams() {
    return this.remoteStreams;
  }
  
  getConnectionStats(userId) {
    const pc = this.peers.get(userId);
    if (!pc) return null;
    
    return {
      connectionState: pc.connectionState,
      iceConnectionState: pc.iceConnectionState,
      iceGatheringState: pc.iceGatheringState
    };
  }
}

// Export singleton instance
const voiceService = new VoiceService();
export default voiceService;
