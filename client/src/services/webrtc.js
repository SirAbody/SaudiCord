// WebRTC Service for Voice/Video Calls and Screen Sharing
import socketService from './socket';

class WebRTCService {
  constructor() {
    this.localStream = null;
    this.remoteStream = null;
    this.peerConnection = null;
    this.isCallActive = false;
    this.currentCallType = null;
    this.currentCallPartner = null;
    this.screenStream = null;
    this.isScreenSharing = false;
    this.socketListenersSetup = false;
    
    // ICE servers configuration
    this.iceServers = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' }
      ]
    };
    
    // Don't setup listeners in constructor - wait for socket to be ready
    // this.setupSocketListeners();
  }

  setupSocketListeners() {
    // Check if socket is ready and has 'on' method
    if (!socketService || typeof socketService.on !== 'function') {
      console.warn('[WebRTC] Socket not ready, skipping listener setup');
      return;
    }
    
    // Prevent duplicate listeners
    if (this.socketListenersSetup) {
      console.log('[WebRTC] Socket listeners already setup');
      return;
    }
    
    console.log('[WebRTC] Setting up socket listeners');
    this.socketListenersSetup = true;
    
    // Listen for call signals
    socketService.on('call:offer', async (data) => {
      if (this.isCallActive) return;
      await this.handleOffer(data);
    });

    socketService.on('call:answer', async (data) => {
      if (!this.peerConnection) return;
      await this.handleAnswer(data);
    });

    socketService.on('call:ice-candidate', async (data) => {
      if (!this.peerConnection) return;
      await this.handleIceCandidate(data);
    });

    socketService.on('call:ended', () => {
      this.endCall();
    });

    socketService.on('screenshare:started', (data) => {
      console.log('Remote user started screen sharing');
    });

    socketService.on('screenshare:stopped', () => {
      console.log('Remote user stopped screen sharing');
    });
  }

  async initializeCall(channelId, callType = 'voice') {
    try {
      // Ensure socket listeners are setup
      if (!this.socketListenersSetup) {
        this.setupSocketListeners();
      }
      
      this.currentCallType = callType;
      this.isCallActive = true;
      
      // Get user media
      const constraints = callType === 'video' 
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Create offer
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      
      // Send offer to remote peer
      socketService.emit('call:offer', {
        receiverId,
        offer,
        callType
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to initialize call:', error);
      this.endCall();
      throw error;
    }
  }

  createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.iceServers);
    
    // Handle ICE candidates
    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        socketService.emit('call:ice-candidate', {
          candidate: event.candidate
        });
      }
    };
    
    // Handle remote stream
    this.peerConnection.ontrack = (event) => {
      this.remoteStream = event.streams[0];
      if (this.onRemoteStream) {
        this.onRemoteStream(this.remoteStream);
      }
    };
    
    // Handle connection state changes
    this.peerConnection.onconnectionstatechange = () => {
      console.log('Connection state:', this.peerConnection.connectionState);
      if (this.peerConnection.connectionState === 'disconnected' || 
          this.peerConnection.connectionState === 'failed') {
        this.endCall();
      }
    };
  }

  async handleOffer(data) {
    try {
      const { offer, callType, callerId } = data;
      this.callType = callType;
      this.isCallActive = true;
      
      // Get user media
      const constraints = callType === 'video'
        ? { video: true, audio: true }
        : { video: false, audio: true };
      
      this.localStream = await navigator.mediaDevices.getUserMedia(constraints);
      
      // Create peer connection
      this.createPeerConnection();
      
      // Add local stream to peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
      
      // Set remote description
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
      
      // Create answer
      const answer = await this.peerConnection.createAnswer();
      await this.peerConnection.setLocalDescription(answer);
      
      // Send answer to remote peer
      socketService.emit('call:answer', {
        callerId,
        answer
      });
      
      return this.localStream;
    } catch (error) {
      console.error('Failed to handle offer:', error);
      this.endCall();
      throw error;
    }
  }

  async handleAnswer(data) {
    try {
      const { answer } = data;
      await this.peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    } catch (error) {
      console.error('Failed to handle answer:', error);
    }
  }

  async handleIceCandidate(data) {
    try {
      const { candidate } = data;
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error('Failed to add ICE candidate:', error);
    }
  }

  async startScreenShare() {
    try {
      // Get screen share stream with 1080p preference
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true
        }
      });
      
      // Replace video track with screen share
      if (this.peerConnection && this.localStream) {
        const videoTrack = this.screenStream.getVideoTracks()[0];
        const sender = this.peerConnection.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        } else {
          this.peerConnection.addTrack(videoTrack, this.screenStream);
        }
        
        // Listen for screen share end
        videoTrack.onended = () => {
          this.stopScreenShare();
        };
        
        // Notify remote peer
        socketService.emit('screenshare:started');
      }
      
      return this.screenStream;
    } catch (error) {
      console.error('Failed to start screen share:', error);
      throw error;
    }
  }

  async stopScreenShare() {
    try {
      if (this.screenStream) {
        this.screenStream.getTracks().forEach(track => track.stop());
        
        // Replace screen share with camera video if available
        if (this.peerConnection && this.localStream) {
          const videoTrack = this.localStream.getVideoTracks()[0];
          if (videoTrack) {
            const sender = this.peerConnection.getSenders().find(
              s => s.track && s.track.kind === 'video'
            );
            if (sender) {
              sender.replaceTrack(videoTrack);
            }
          }
        }
        
        // Notify remote peer
        socketService.emit('screenshare:stopped');
        this.screenStream = null;
      }
    } catch (error) {
      console.error('Failed to stop screen share:', error);
    }
  }

  toggleAudio(enabled) {
    if (this.localStream) {
      this.localStream.getAudioTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  toggleVideo(enabled) {
    if (this.localStream) {
      this.localStream.getVideoTracks().forEach(track => {
        track.enabled = enabled;
      });
    }
  }

  endCall() {
    // Stop all streams
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = null;
    }
    
    // Close peer connection
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
    
    // Reset state
    this.isCallActive = false;
    this.callType = null;
    this.currentCallId = null;
    
    // Notify about call end
    socketService.emit('call:end');
    
    if (this.onCallEnded) {
      this.onCallEnded();
    }
  }

  getLocalStream() {
    return this.localStream;
  }

  getRemoteStream() {
    return this.remoteStream;
  }

  isInCall() {
    return this.isCallActive;
  }
}

const webrtcService = new WebRTCService();
export default webrtcService;
