// WebRTC Configuration for Voice/Video Calls
const logger = require('../utils/logger');

// STUN/TURN server configuration
const getIceServers = () => {
  const iceServers = [
    {
      urls: process.env.STUN_SERVER || 'stun:stun.l.google.com:19302'
    },
    {
      urls: 'stun:stun1.l.google.com:19302'
    },
    {
      urls: 'stun:stun2.l.google.com:19302'
    }
  ];

  // Add TURN server if configured
  if (process.env.TURN_SERVER) {
    iceServers.push({
      urls: process.env.TURN_SERVER,
      username: process.env.TURN_USERNAME,
      credential: process.env.TURN_PASSWORD
    });
  }

  logger.debug('ICE servers configured', { 
    serverCount: iceServers.length,
    hasSTUN: true,
    hasTURN: !!process.env.TURN_SERVER
  });

  return iceServers;
};

// WebRTC constraints for media
const mediaConstraints = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleRate: 48000
  },
  video: {
    width: { min: 640, ideal: 1280, max: 1920 },
    height: { min: 360, ideal: 720, max: 1080 },
    frameRate: { ideal: 30, max: 60 }
  }
};

// Screen sharing constraints
const screenShareConstraints = {
  video: {
    cursor: 'always',
    displaySurface: 'browser'
  },
  audio: false
};

// Peer connection configuration
const peerConnectionConfig = {
  iceServers: getIceServers(),
  iceCandidatePoolSize: 10,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

// Validate WebRTC support
const validateWebRTCSupport = () => {
  const requirements = {
    RTCPeerConnection: typeof RTCPeerConnection !== 'undefined',
    getUserMedia: navigator.mediaDevices && navigator.mediaDevices.getUserMedia,
    getDisplayMedia: navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia
  };

  const unsupported = Object.entries(requirements)
    .filter(([, supported]) => !supported)
    .map(([feature]) => feature);

  if (unsupported.length > 0) {
    logger.warn('WebRTC features not fully supported', { unsupported });
  }

  return unsupported.length === 0;
};

module.exports = {
  getIceServers,
  mediaConstraints,
  screenShareConstraints,
  peerConnectionConfig,
  validateWebRTCSupport
};
