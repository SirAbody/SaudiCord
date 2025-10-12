// WebRTC Utilities for Voice/Video Calls
import errorLogger from './errorHandler';

// ICE servers configuration
const getIceServers = () => {
  return [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' }
  ];
};

// Check WebRTC support
export const checkWebRTCSupport = () => {
  const support = {
    webRTC: !!(window.RTCPeerConnection || window.webkitRTCPeerConnection),
    getUserMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    getDisplayMedia: !!(navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia),
    audioContext: !!(window.AudioContext || window.webkitAudioContext)
  };

  const unsupported = Object.entries(support)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);

  if (unsupported.length > 0) {
    errorLogger.log(new Error('WebRTC features not supported'), { unsupported });
  }

  return support;
};

// Get user media with error handling
export const getUserMedia = async (constraints = { audio: true, video: true }) => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    console.log('Got user media stream', { 
      audioTracks: stream.getAudioTracks().length,
      videoTracks: stream.getVideoTracks().length 
    });
    return stream;
  } catch (error) {
    errorLogger.log(error, { type: 'getUserMedia', constraints });
    
    // Specific error handling
    if (error.name === 'NotAllowedError') {
      throw new Error('Camera/Microphone permission denied');
    } else if (error.name === 'NotFoundError') {
      throw new Error('Camera/Microphone not found');
    } else if (error.name === 'NotReadableError') {
      throw new Error('Camera/Microphone is already in use');
    } else {
      throw new Error('Failed to access camera/microphone');
    }
  }
};

// Get display media for screen sharing
export const getDisplayMedia = async () => {
  try {
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: {
        cursor: 'always',
        displaySurface: 'browser'
      },
      audio: false
    });
    console.log('Got display media stream');
    return stream;
  } catch (error) {
    errorLogger.log(error, { type: 'getDisplayMedia' });
    
    if (error.name === 'NotAllowedError') {
      throw new Error('Screen sharing permission denied');
    } else {
      throw new Error('Failed to share screen');
    }
  }
};

// Create peer connection with configuration
export const createPeerConnection = (onIceCandidate, onTrack) => {
  const configuration = {
    iceServers: getIceServers(),
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
  };

  const pc = new RTCPeerConnection(configuration);

  // Set up event handlers
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  pc.ontrack = (event) => {
    console.log('Received remote track', { 
      kind: event.track.kind,
      id: event.track.id 
    });
    onTrack(event.streams[0]);
  };

  pc.oniceconnectionstatechange = () => {
    console.log('ICE connection state:', pc.iceConnectionState);
    if (pc.iceConnectionState === 'failed') {
      errorLogger.log(new Error('ICE connection failed'), { 
        state: pc.iceConnectionState 
      });
    }
  };

  pc.onconnectionstatechange = () => {
    console.log('Connection state:', pc.connectionState);
  };

  return pc;
};

// Add local stream to peer connection
export const addStreamToPeer = (pc, stream) => {
  stream.getTracks().forEach(track => {
    pc.addTrack(track, stream);
    console.log('Added track to peer connection', { 
      kind: track.kind,
      id: track.id 
    });
  });
};

// Clean up media stream
export const cleanupStream = (stream) => {
  if (stream) {
    stream.getTracks().forEach(track => {
      track.stop();
      console.log('Stopped track', { kind: track.kind });
    });
  }
};

// Monitor connection quality
export const monitorConnectionQuality = async (pc) => {
  if (!pc || pc.connectionState === 'closed') return null;

  try {
    const stats = await pc.getStats();
    const quality = {
      packetsLost: 0,
      jitter: 0,
      roundTripTime: 0,
      bitrate: 0
    };

    stats.forEach(report => {
      if (report.type === 'inbound-rtp' && report.mediaType === 'audio') {
        quality.packetsLost = report.packetsLost || 0;
        quality.jitter = report.jitter || 0;
      }
      if (report.type === 'candidate-pair' && report.state === 'succeeded') {
        quality.roundTripTime = report.currentRoundTripTime || 0;
      }
    });

    return quality;
  } catch (error) {
    errorLogger.log(error, { type: 'getStats' });
    return null;
  }
};

export default {
  checkWebRTCSupport,
  getUserMedia,
  getDisplayMedia,
  createPeerConnection,
  addStreamToPeer,
  cleanupStream,
  monitorConnectionQuality
};
