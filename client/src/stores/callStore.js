// WebRTC Call Store for managing voice/video calls
import { create } from 'zustand';
import SimplePeer from 'simple-peer';
import toast from 'react-hot-toast';

export const useCallStore = create((set, get) => ({
  currentCall: null,
  incomingCall: null,
  localStream: null,
  remoteStream: null,
  peer: null,
  isCallActive: false,
  isMuted: false,
  isVideoEnabled: true,
  isScreenSharing: false,
  screenStream: null,

  // Initialize call
  initiateCall: async (targetUser, callType, socket) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true
      });

      set({ 
        localStream: stream, 
        currentCall: {
          targetUser,
          callType,
          isInitiator: true
        }
      });

      // Emit call initiation via socket
      socket.emit('call:initiate', {
        targetUserId: targetUser.id,
        callType
      });

      return true;
    } catch (error) {
      console.error('Failed to initiate call:', error);
      toast.error('Failed to access camera/microphone');
      return false;
    }
  },

  // Handle incoming call
  handleIncomingCall: (callData) => {
    set({ incomingCall: callData });
  },

  // Accept call
  acceptCall: async (socket) => {
    const { incomingCall } = get();
    if (!incomingCall) return;

    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        video: incomingCall.callType === 'video',
        audio: true
      });

      set({ 
        localStream: stream,
        currentCall: {
          targetUser: { 
            id: incomingCall.callerId, 
            username: incomingCall.callerName 
          },
          callType: incomingCall.callType,
          isInitiator: false
        },
        incomingCall: null,
        isCallActive: true
      });

      // Create peer connection
      const peer = new SimplePeer({
        initiator: false,
        trickle: false,
        stream
      });

      // Handle peer signals
      peer.on('signal', (data) => {
        socket.emit('webrtc:answer', {
          targetUserId: incomingCall.callerId,
          answer: data
        });
      });

      peer.on('stream', (remoteStream) => {
        set({ remoteStream });
      });

      peer.on('error', (err) => {
        console.error('Peer error:', err);
        get().endCall(socket);
      });

      peer.on('close', () => {
        get().endCall(socket);
      });

      set({ peer });

      // Emit acceptance via socket
      socket.emit('call:accept', {
        callerId: incomingCall.callerId
      });

      return true;
    } catch (error) {
      console.error('Failed to accept call:', error);
      toast.error('Failed to access camera/microphone');
      return false;
    }
  },

  // Reject call
  rejectCall: (socket) => {
    const { incomingCall } = get();
    if (incomingCall) {
      socket.emit('call:reject', {
        callerId: incomingCall.callerId
      });
      set({ incomingCall: null });
    }
  },

  // Handle call accepted (for initiator)
  handleCallAccepted: async (socket) => {
    const { localStream, currentCall } = get();
    
    // Create peer connection as initiator
    const peer = new SimplePeer({
      initiator: true,
      trickle: false,
      stream: localStream
    });

    peer.on('signal', (data) => {
      socket.emit('webrtc:offer', {
        targetUserId: currentCall.targetUser.id,
        offer: data
      });
    });

    peer.on('stream', (remoteStream) => {
      set({ remoteStream });
    });

    peer.on('error', (err) => {
      console.error('Peer error:', err);
      get().endCall(socket);
    });

    peer.on('close', () => {
      get().endCall(socket);
    });

    set({ peer, isCallActive: true });
  },

  // Handle WebRTC offer
  handleWebRTCOffer: (data) => {
    const { peer } = get();
    if (peer && !peer.destroyed) {
      peer.signal(data.offer);
    }
  },

  // Handle WebRTC answer
  handleWebRTCAnswer: (data) => {
    const { peer } = get();
    if (peer && !peer.destroyed) {
      peer.signal(data.answer);
    }
  },

  // Handle ICE candidate
  handleIceCandidate: (data) => {
    const { peer } = get();
    if (peer && !peer.destroyed) {
      peer.signal(data.candidate);
    }
  },

  // Toggle mute
  toggleMute: () => {
    const { localStream, isMuted } = get();
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = isMuted;
      });
      set({ isMuted: !isMuted });
    }
  },

  // Toggle video
  toggleVideo: () => {
    const { localStream, isVideoEnabled } = get();
    if (localStream) {
      localStream.getVideoTracks().forEach(track => {
        track.enabled = !isVideoEnabled;
      });
      set({ isVideoEnabled: !isVideoEnabled });
    }
  },

  // Start screen sharing
  startScreenShare: async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });

      const { peer, localStream } = get();
      if (peer && localStream) {
        // Replace video track with screen share
        const videoTrack = screenStream.getVideoTracks()[0];
        const sender = peer._pc.getSenders().find(
          s => s.track && s.track.kind === 'video'
        );
        
        if (sender) {
          sender.replaceTrack(videoTrack);
        }

        // Handle screen share end
        videoTrack.onended = () => {
          get().stopScreenShare();
        };

        set({ isScreenSharing: true, screenStream });
      }
    } catch (error) {
      console.error('Failed to share screen:', error);
      toast.error('Failed to share screen');
    }
  },

  // Stop screen sharing
  stopScreenShare: () => {
    const { screenStream, localStream, peer } = get();
    
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }

    if (peer && localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      const sender = peer._pc.getSenders().find(
        s => s.track && s.track.kind === 'video'
      );
      
      if (sender && videoTrack) {
        sender.replaceTrack(videoTrack);
      }
    }

    set({ isScreenSharing: false, screenStream: null });
  },

  // End call
  endCall: (socket) => {
    const { localStream, remoteStream, peer, currentCall, screenStream } = get();
    
    // Stop all tracks
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
    }
    
    // Destroy peer connection
    if (peer) {
      peer.destroy();
    }

    // Emit call end via socket
    if (socket && currentCall) {
      socket.emit('call:end', {
        targetUserId: currentCall.targetUser.id
      });
    }

    // Reset state
    set({
      currentCall: null,
      incomingCall: null,
      localStream: null,
      remoteStream: null,
      peer: null,
      isCallActive: false,
      isMuted: false,
      isVideoEnabled: true,
      isScreenSharing: false,
      screenStream: null
    });
  }
}));
