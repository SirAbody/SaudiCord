// Socket.io Service with Enhanced Error Handling
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionAttempts = 0;
    this.mockSocket = null;
  }

  // Create a mock socket that prevents errors
  createMockSocket() {
    if (this.mockSocket) return this.mockSocket;
    
    console.warn('Creating mock socket - real-time features disabled');
    this.mockSocket = {
      connected: false,
      on: () => {},
      emit: () => {},
      off: () => {},
      removeAllListeners: () => {},
      disconnect: () => {},
      connect: () => {},
      id: 'mock-socket'
    };
    return this.mockSocket;
  }

  connect(token) {
    try {
      // Check if already connected
      if (this.socket && this.socket.connected && this.socket !== this.mockSocket) {
        console.log('Socket already connected');
        return this.socket;
      }

      // Clean up any existing real socket
      if (this.socket && this.socket !== this.mockSocket) {
        console.log('Cleaning up existing socket');
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      // Check if Socket.io is available from CDN
      if (!window.io || typeof window.io !== 'function') {
        console.warn('Socket.io not available, using mock socket');
        this.socket = this.createMockSocket();
        return this.socket;
      }

      // Use same origin in production, full URL in development
      const serverUrl = process.env.NODE_ENV === 'production'
        ? window.location.origin
        : (process.env.REACT_APP_SERVER_URL || 'http://localhost:5000');
      
      console.log('Attempting socket connection to:', serverUrl);
      
      // Get io from window (loaded from CDN)
      const io = window.io;
      
      // Create socket with defensive options
      this.socket = io(serverUrl, {
        transports: ['polling', 'websocket'], // Start with polling
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        auth: {
          token: token || ''
        },
        // Force new connection
        forceNew: true,
        // Upgrade from polling to websocket when possible
        upgrade: true
      });

      // Check if socket was created successfully
      if (!this.socket) {
        throw new Error('Failed to create socket instance');
      }

      this.setupEventHandlers(token);
      this.connectionAttempts++;
      
      return this.socket;
    } catch (error) {
      console.error('Socket connection error:', error);
      toast.error('Connection failed. Some features may be limited.');
      // Return null instead of throwing to prevent app crash
      return null;
    }
  }

  setupEventHandlers(token) {
    if (!this.socket) {
      console.error('Cannot setup handlers: socket is null');
      return;
    }

    // Defensive check for socket.on function
    if (!this.socket || typeof this.socket.on !== 'function') {
      console.error('Socket.on is not a function, using mock socket');
      this.socket = this.createMockSocket();
      return this.socket;
    }

    // Apply any pending handlers that were added before socket was ready
    if (this.pendingHandlers) {
      console.log('[Socket] Applying pending handlers...');
      Object.entries(this.pendingHandlers).forEach(([event, handlers]) => {
        handlers.forEach(handler => {
          this.socket.on(event, handler);
        });
      });
      this.pendingHandlers = {};
    }

    try {
      const chatStore = useChatStore.getState();
      const callStore = useCallStore.getState();
      // Connection events with error handling
      this.socket.on('connect', () => {
        console.log('Connected to SaudiCord server');
        this.connectionAttempts = 0; // Reset on successful connection
        toast.success('Connected to server');
        // Send authentication after connecting
        if (token) {
          this.socket.emit('authenticate', token);
        }
      });

    // Authentication events
    this.socket.on('auth:success', (data) => {
      console.log('Authentication successful', data);
    });

    this.socket.on('auth:error', (data) => {
      console.error('Authentication failed:', data.message);
      toast.error('Authentication failed. Please login again.');
      // Do not hard-redirect; keep UI usable without realtime
      // Optionally disconnect to prevent loops
      try { this.socket.disconnect(); } catch {}
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message || error);
      
      // Only show toast for first few attempts
      if (this.connectionAttempts < 3) {
        if (error.message === 'Authentication error') {
          toast.error('Authentication failed. Please login again.');
        } else if (this.connectionAttempts === 2) {
          toast.error('Connection issues. Some features may be limited.');
        }
      }
      
      // Do not disconnect on error - let it retry
    });

    this.socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
    
    // User status events
    this.socket.on('user:online', (data) => {
      if (data && data.userId) {
        chatStore.addOnlineUser(data.userId);
      }
    });

    // Message events with store integration
    this.socket.on('message:receive', (message) => {
      console.log('Received message:', message);
      
      // Get chat store
      const chatStore = useChatStore.getState();
      const authStore = require('../stores/authStore').useAuthStore.getState();
      const currentUser = authStore.user;
      
      // Check if this is our own message with tempId
      const channelId = message.channelId;
      if (message.tempId && currentUser && message.userId === currentUser.id) {
        // Replace optimistic message with real one
        const currentMessages = chatStore.messages[channelId] || [];
        const updatedMessages = currentMessages.map(msg => 
          msg.id === message.tempId 
            ? { ...message, pending: false } 
            : msg
        );
        
        // Only update if we found the temp message
        if (currentMessages.some(msg => msg.id === message.tempId)) {
          chatStore.set((state) => ({
            messages: {
              ...state.messages,
              [channelId]: updatedMessages
            }
          }));
          return; // Don't add duplicate
        }
      }
      
      // Add message to store (for messages from others or if no tempId)
      chatStore.addMessage(channelId, message);
      
      // Show notification if not in current channel
      const currentChannel = chatStore.currentChannel;
      if (!currentChannel || currentChannel.id !== channelId) {
        toast(`New message from ${message.author.username}`, {
          icon: '💬'
        });
      }
    });

    this.socket.on('message:edited', (data) => {
      const { messageId, content, editedAt } = data;
      // Find and update message in store
      const messages = chatStore.messages;
      Object.keys(messages).forEach(channelId => {
        const message = messages[channelId]?.find(m => m.id === messageId);
        if (message) {
          chatStore.updateMessage(channelId, messageId, { 
            content, 
            edited: true, 
            editedAt 
          });
        }
      });
    });

    this.socket.on('message:deleted', (data) => {
      const { messageId } = data;
      // Find and delete message from store
      const messages = chatStore.messages;
      Object.keys(messages).forEach(channelId => {
        const message = messages[channelId]?.find(m => m.id === messageId);
        if (message) {
          chatStore.deleteMessage(channelId, messageId);
        }
      });
    });

    // Typing events
    this.socket.on('typing:user', (data) => {
      chatStore.setTypingUser(data.channelId, data.userId, true);
    });

    this.socket.on('typing:user:stop', (data) => {
      chatStore.setTypingUser(data.channelId, data.userId, false);
    });

    // Call events
    this.socket.on('call:incoming', (data) => {
      callStore.handleIncomingCall(data);
      toast(`Incoming ${data.callType} call from ${data.callerName}`, {
        icon: data.callType === 'video' ? '📹' : '📞',
        duration: 10000
      });
    });

    this.socket.on('call:accepted', (data) => {
      callStore.handleCallAccepted(this.socket);
      toast.success('Call accepted');
    });

    this.socket.on('call:rejected', (data) => {
      toast.error('Call rejected');
      callStore.endCall(this.socket);
    });

    this.socket.on('call:ended', (data) => {
      toast('Call ended');
      callStore.endCall(null);
    });

    // WebRTC signaling
    this.socket.on('webrtc:offer', (data) => {
      callStore.handleWebRTCOffer(data);
    });

    this.socket.on('webrtc:answer', (data) => {
      callStore.handleWebRTCAnswer(data);
    });

    this.socket.on('webrtc:ice-candidate', (data) => {
      callStore.handleIceCandidate(data);
    });
    
    } catch (error) {
      console.error('Error setting up socket handlers:', error);
    }
  }

  // Emit events
  joinChannel(channelId) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('join:channel', channelId);
    }
  }

  leaveChannel(channelId) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('leave:channel', channelId);
    }
  }

  sendMessage(channelId, content, attachments = []) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('message:send', {
        channelId,
        content,
        attachments
      });
    }
  }

  sendTyping(channelId, userId, username) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('typing:start', { channelId, userId, username });
    }
  }

  stopTyping(channelId, userId) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('typing:stop', { channelId, userId });
    }
  }

  updateStatus(status) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('user:status', status);
    }
  }

  joinVoiceChannel(channelId) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('voice:join', channelId);
    }
  }

  leaveVoiceChannel(channelId) {
    if (this.socket && typeof this.socket.emit === 'function') {
      this.socket.emit('voice:leave', channelId);
    }
  }

  disconnect() {
    if (this.socket) {
      // Remove all listeners to prevent memory leaks
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
      this.pendingHandlers = {};
    }
  }

  getSocket() {
    return this.socket || this.createMockSocket();
  }

  isConnected() {
    return this.socket && this.socket.connected && this.socket !== this.mockSocket;
  }
  // Proxy methods for direct socket access (with safety checks)
  on(event, handler) {
    if (this.socket && typeof this.socket.on === 'function') {
      return this.socket.on(event, handler);
    }
    console.warn(`[Socket] Cannot add listener for ${event} - socket not ready`);
    // Store handlers for later if socket not ready
    if (!this.pendingHandlers) this.pendingHandlers = {};
    if (!this.pendingHandlers[event]) this.pendingHandlers[event] = [];
    this.pendingHandlers[event].push(handler);
  }

  off(event, handler) {
    if (this.socket && typeof this.socket.off === 'function') {
      return this.socket.off(event, handler);
    }
  }

  emit(event, ...args) {
    if (this.socket && typeof this.socket.emit === 'function') {
      return this.socket.emit(event, ...args);
    }
    console.warn(`[Socket] Cannot emit ${event} - socket not ready`);
  }
}

const socketService = new SocketService();
export default socketService;
export { socketService };
