// Production Configuration for SaudiCord Client
// Made With Love By SirAbody

const config = {
  // API Configuration
  API_URL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:5000/api',
  
  // Socket Configuration
  SOCKET_URL: process.env.NODE_ENV === 'production' ? window.location.origin : 'http://localhost:5000',
  
  // Socket Options
  SOCKET_OPTIONS: {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
    autoConnect: true,
    // Force new connection on reconnect
    forceNew: false
  },
  
  // Auth Configuration
  AUTH_TIMEOUT: 10000, // 10 seconds
  
  // Error Messages
  ERRORS: {
    NETWORK: 'Network error. Please check your connection.',
    AUTH_FAILED: 'Authentication failed. Please login again.',
    SERVER_ERROR: 'Server error. Please try again later.',
    CONNECTION_LOST: 'Connection lost. Attempting to reconnect...'
  },
  
  // Feature Flags
  FEATURES: {
    ENABLE_VIDEO_CALLS: true,
    ENABLE_VOICE_CALLS: true,
    ENABLE_SCREEN_SHARE: true,
    ENABLE_FILE_UPLOAD: true,
    MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB
    ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  },
  
  // Retry Configuration
  RETRY: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 1000,
    EXPONENTIAL_BACKOFF: true
  }
};

export default config;
