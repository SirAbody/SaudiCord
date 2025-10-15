// Socket.io Service - CDN Version (Fixed)
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionAttempts = 0;
    this.pendingHandlers = {};
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 5;
  }

  connect(token) {
    console.log('[Socket] Attempting to connect...');
    
    // Wait for Socket.io CDN to load
    if (typeof window.io === 'undefined') {
      console.warn('[Socket] Waiting for Socket.io CDN...');
      setTimeout(() => this.connect(token), 500);
      return null;
    }

    try {
      // Disconnect existing connection
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      const serverUrl = process.env.NODE_ENV === 'production' 
        ? 'https://saudicord.onrender.com'
        : 'http://localhost:10000';

      // Create new connection
      this.socket = window.io(serverUrl, {
        transports: ['websocket', 'polling'],
        auth: { token },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5,
        timeout: 20000
      });

      // Connection events
      this.socket.on('connect', () => {
        console.log('[Socket] Connected successfully');
        this.connectionAttempts = 0;
        this.reconnectAttempts = 0;
        
        // Send authentication - using 'authenticate' event as backend expects
        if (token) {
          console.log('[Socket] Sending authentication token');
          this.socket.emit('authenticate', token);
          // Also emit old 'auth' for compatibility
          this.socket.emit('auth', { token });
        }
        
        // Apply pending handlers
        this.applyPendingHandlers();
      });

      this.socket.on('auth:success', (data) => {
        console.log('[Socket] Authentication successful:', data);
      });

      this.socket.on('auth:error', (error) => {
        console.error('[Socket] Authentication failed:', error);
        toast.error('Authentication failed');
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason === 'io server disconnect') {
          // Server initiated disconnect, try to reconnect
          setTimeout(() => this.connect(token), 1000);
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        this.reconnectAttempts++;
        
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('[Socket] Max reconnection attempts reached');
        }
      });

      this.socket.on('error', (error) => {
        console.error('[Socket] Socket error:', error);
      });

      // Setup event listeners
      this.setupEventListeners();

      return this.socket;
    } catch (error) {
      console.error('[Socket] Failed to connect:', error);
      return null;
    }
  }

  setupEventListeners() {
    if (!this.socket) return;

    // User status events
    this.socket.on('user:online', (data) => {
      console.log('[Socket] User online:', data);
      const chatStore = useChatStore.getState();
      if (chatStore.addOnlineUser) {
        chatStore.addOnlineUser(data.userId);
      }
    });

    this.socket.on('user:offline', (data) => {
      console.log('[Socket] User offline:', data);
      const chatStore = useChatStore.getState();
      if (chatStore.removeOnlineUser) {
        chatStore.removeOnlineUser(data.userId);
      }
    });

    // Message events
    this.socket.on('message:new', (message) => {
      console.log('[Socket] New message received:', message);
      const chatStore = useChatStore.getState();
      if (chatStore.addMessage) {
        chatStore.addMessage(message);
      }
    });

    this.socket.on('message:sent', (data) => {
      console.log('[Socket] Message sent confirmation:', data);
      const chatStore = useChatStore.getState();
      if (chatStore.confirmMessage) {
        chatStore.confirmMessage(data.tempId, data.message);
      }
    });

    // Typing indicators
    this.socket.on('typing:start', (data) => {
      const chatStore = useChatStore.getState();
      if (chatStore.setTypingUser) {
        chatStore.setTypingUser(data.userId, true);
      }
    });

    this.socket.on('typing:stop', (data) => {
      const chatStore = useChatStore.getState();
      if (chatStore.setTypingUser) {
        chatStore.setTypingUser(data.userId, false);
      }
    });

    // Voice/Call events
    this.socket.on('voice:user:joined', (data) => {
      console.log('[Socket] User joined voice channel:', data);
      const callStore = useCallStore.getState();
      if (callStore.addUserToChannel) {
        callStore.addUserToChannel(data.channelId, data.user);
      }
    });

    this.socket.on('voice:user:left', (data) => {
      console.log('[Socket] User left voice channel:', data);
      const callStore = useCallStore.getState();
      if (callStore.removeUserFromChannel) {
        callStore.removeUserFromChannel(data.channelId, data.userId);
      }
    });

    // WebRTC signaling
    this.socket.on('webrtc:offer', (data) => {
      console.log('[Socket] WebRTC offer received:', data);
      if (window.webrtcService) {
        window.webrtcService.handleOffer(data);
      }
    });

    this.socket.on('webrtc:answer', (data) => {
      console.log('[Socket] WebRTC answer received:', data);
      if (window.webrtcService) {
        window.webrtcService.handleAnswer(data);
      }
    });

    this.socket.on('webrtc:ice-candidate', (data) => {
      console.log('[Socket] ICE candidate received:', data);
      if (window.webrtcService) {
        window.webrtcService.handleIceCandidate(data);
      }
    });
  }

  applyPendingHandlers() {
    if (!this.socket || !this.pendingHandlers) return;
    
    Object.entries(this.pendingHandlers).forEach(([event, handlers]) => {
      handlers.forEach(handler => {
        this.socket.on(event, handler);
      });
    });
    
    this.pendingHandlers = {};
  }

  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.disconnect();
      this.socket = null;
    }
  }

  emit(event, data) {
    if (this.socket && this.socket.connected) {
      this.socket.emit(event, data);
      return true;
    } else {
      console.warn(`[Socket] Cannot emit ${event}, not connected`);
      return false;
    }
  }

  on(event, handler) {
    if (this.socket && this.socket.connected) {
      this.socket.on(event, handler);
    } else {
      // Store for later
      if (!this.pendingHandlers[event]) {
        this.pendingHandlers[event] = [];
      }
      this.pendingHandlers[event].push(handler);
    }
  }

  off(event, handler) {
    if (this.socket) {
      if (handler) {
        this.socket.off(event, handler);
      } else {
        this.socket.off(event);
      }
    }
    
    // Remove from pending
    if (this.pendingHandlers[event]) {
      if (handler) {
        this.pendingHandlers[event] = this.pendingHandlers[event].filter(h => h !== handler);
      } else {
        delete this.pendingHandlers[event];
      }
    }
  }

  // Channel methods
  joinChannel(channelId) {
    this.emit('channel:join', { channelId });
  }

  leaveChannel(channelId) {
    this.emit('channel:leave', { channelId });
  }

  // Message methods
  sendMessage(channelId, content, tempId) {
    this.emit('message:send', { channelId, content, tempId });
  }

  // Voice methods
  joinVoiceChannel(channelId) {
    this.emit('voice:join', { channelId });
  }

  leaveVoiceChannel(channelId) {
    this.emit('voice:leave', { channelId });
  }

  // WebRTC methods
  sendOffer(targetUserId, offer) {
    this.emit('webrtc:offer', { targetUserId, offer });
  }

  sendAnswer(targetUserId, answer) {
    this.emit('webrtc:answer', { targetUserId, answer });
  }

  sendIceCandidate(targetUserId, candidate) {
    this.emit('webrtc:ice-candidate', { targetUserId, candidate });
  }
  
  // Check if socket is connected
  isConnected() {
    return this.socket && this.socket.connected;
  }
}

const socketService = new SocketService();

// Make it globally accessible for debugging
if (typeof window !== 'undefined') {
  window.socketService = socketService;
}

export default socketService;
