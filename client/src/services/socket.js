// Socket.io Service with Enhanced Error Handling
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
    this.connectionAttempts = 0;
    this.pendingHandlers = {};
  }

  // Get the io function from either npm or CDN
  getIoFunction() {
    // Try CDN first (more reliable in production)
    if (typeof window !== 'undefined') {
      if (window.IO && typeof window.IO === 'function') {
        console.log('[Socket] Using global IO from CDN');
        return window.IO;
      }
      if (window.io && typeof window.io === 'function') {
        console.log('[Socket] Using global io from CDN');
        return window.io;
      }
    }
    console.warn('[Socket] No Socket.io library available');
    return null;
  }

  connect(token) {
    console.log('[Socket] Attempting to connect...');
    
    try {
      // Check if socket.io is available
      const io = this.getIoFunction();
      if (!io) {
        console.error('[Socket] Socket.io library not available');
        return;
      }

      // Disconnect any existing connection first
      if (this.socket) {
        this.socket.removeAllListeners();
        this.socket.disconnect();
        this.socket = null;
      }

      const serverUrl = process.env.NODE_ENV === 'production' 
        ? window.location.origin 
        : 'http://localhost:5000';

      this.socket = io(serverUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
        timeout: 20000,
        forceNew: true
      });

      this.setupEventListeners();
      
      // Connection events
      this.socket.on('connect', () => {
        console.log('[Socket] Connected successfully');
        toast.success('Connected to server');
        
        // Apply any pending handlers
        if (this.pendingHandlers) {
          Object.entries(this.pendingHandlers).forEach(([event, handlers]) => {
            handlers.forEach(handler => {
              this.socket.on(event, handler);
            });
          });
          this.pendingHandlers = {};
        }
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
        if (reason === 'io server disconnect') {
          toast.error('Server disconnected');
        }
      });

      this.socket.on('connect_error', (error) => {
        console.error('[Socket] Connection error:', error);
        if (this.connectionAttempts < 3) {
          this.connectionAttempts++;
          setTimeout(() => this.connect(token), 2000);
        }
      });

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
    this.socket.on('message:receive', (message) => {
      console.log('[Socket] Message received:', message);
      const chatStore = useChatStore.getState();
      const currentChannel = chatStore.currentChannel;
      
      // Handle both channel ID formats
      const channelId = message.channelId || message.channel_id;
      
      // Check if message already exists
      if (message.tempId) {
        const existingMessages = chatStore.messages[channelId] || [];
        const exists = existingMessages.some(m => 
          m.tempId === message.tempId || m.id === message.id
        );
        if (exists) {
          chatStore.updateMessage(channelId, message.tempId, message);
          return;
        }
      }
      
      // Add the message
      chatStore.addMessage(channelId, message);
      
      // Force update
      if (chatStore.setLastMessageTime) {
        chatStore.setLastMessageTime(Date.now());
      }
      
      // Play notification sound if not in current channel
      if (!currentChannel || currentChannel.id !== channelId) {
        import('./soundService').then(module => {
          module.default.playMessage();
        }).catch(console.error);
        
        toast(`New message from ${message.author?.username || 'Unknown'}`, {
          icon: '💬'
        });
      }
    });

    // Message sent confirmation
    this.socket.on('message:sent', (data) => {
      console.log('[Socket] Message sent confirmation:', data);
      const chatStore = useChatStore.getState();
      if (data.tempId && data.message) {
        // Replace the temporary message with the real one
        const channelId = data.message.channelId;
        chatStore.updateMessage(channelId, data.tempId, {
          ...data.message,
          pending: false
        });
      } else if (data.tempId && data.messageId) {
        // Fallback for simple ID update
        chatStore.updateMessage(null, data.tempId, {
          id: data.messageId,
          pending: false
        });
      }
    });

    // Friend events
    this.socket.on('friend:request', (data) => {
      console.log('[Socket] Friend request received:', data);
      toast(`${data.username} sent you a friend request!`, {
        icon: '👥',
        duration: 5000
      });
      // Force refresh friends list
      window.dispatchEvent(new CustomEvent('friendsUpdate'));
    });

    this.socket.on('friend:accepted', (data) => {
      console.log('[Socket] Friend request accepted:', data);
      toast(`${data.username} accepted your friend request!`, {
        icon: '✅',
        duration: 5000
      });
      // Force refresh friends list
      window.dispatchEvent(new CustomEvent('friendsUpdate'));
    });

    // Voice channel events
    this.socket.on('voice:users:update', (data) => {
      console.log('[Socket] Voice users update:', data);
      // Dispatch event for components to listen
      window.dispatchEvent(new CustomEvent('voiceUsersUpdate', { detail: data }));
    });

    this.socket.on('voice:user:joined', (data) => {
      console.log('[Socket] User joined voice:', data);
      toast(`${data.username} joined the voice channel`);
    });

    this.socket.on('voice:user:left', (data) => {
      console.log('[Socket] User left voice:', data);
      toast(`${data.username} left the voice channel`);
    });

    // Call events
    this.socket.on('call:incoming', (data) => {
      console.log('[Socket] Incoming call:', data);
      const callStore = useCallStore.getState();
      callStore.setIncomingCall(data);
    });

    this.socket.on('call:accepted', (data) => {
      console.log('[Socket] Call accepted:', data);
      const callStore = useCallStore.getState();
      callStore.setCallAccepted(true);
    });

    this.socket.on('call:rejected', (data) => {
      console.log('[Socket] Call rejected:', data);
      const callStore = useCallStore.getState();
      callStore.endCall();
      toast('Call was rejected');
    });

    this.socket.on('call:ended', (data) => {
      console.log('[Socket] Call ended:', data);
      const callStore = useCallStore.getState();
      callStore.endCall();
    });

    // WebRTC signaling
    this.socket.on('webrtc:offer', (data) => {
      console.log('[Socket] WebRTC offer received');
      window.dispatchEvent(new CustomEvent('webrtc:offer', { detail: data }));
    });

    this.socket.on('webrtc:answer', (data) => {
      console.log('[Socket] WebRTC answer received');
      window.dispatchEvent(new CustomEvent('webrtc:answer', { detail: data }));
    });

    this.socket.on('webrtc:ice-candidate', (data) => {
      console.log('[Socket] ICE candidate received');
      window.dispatchEvent(new CustomEvent('webrtc:ice-candidate', { detail: data }));
    });

    // Typing indicators
    this.socket.on('typing:start', (data) => {
      const chatStore = useChatStore.getState();
      if (chatStore.addTypingUser) {
        chatStore.addTypingUser(data.channelId, data.userId, data.username);
      }
    });

    this.socket.on('typing:stop', (data) => {
      const chatStore = useChatStore.getState();
      if (chatStore.removeTypingUser) {
        chatStore.removeTypingUser(data.channelId, data.userId);
      }
    });
  }

  disconnect() {
    if (this.socket) {
      console.log('[Socket] Disconnecting...');
      this.socket.removeAllListeners();
      this.socket.disconnect();
      this.socket = null;
    }
  }

  // Safe event handler methods
  on(event, handler) {
    if (this.socket && typeof this.socket.on === 'function') {
      return this.socket.on(event, handler);
    }
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
    console.warn(`[Socket] Cannot emit ${event} - not connected`);
  }

  // Channel methods
  joinChannel(channelId) {
    if (this.socket && this.socket.connected) {
      console.log('[Socket] Joining channel:', channelId);
      this.socket.emit('join:channel', channelId);
    }
  }

  leaveChannel(channelId) {
    if (this.socket && this.socket.connected) {
      console.log('[Socket] Leaving channel:', channelId);
      this.socket.emit('leave:channel', channelId);
    }
  }

  // Messaging methods
  sendMessage(channelId, content, tempId) {
    if (this.socket && this.socket.connected) {
      console.log('[Socket] Sending message to channel:', channelId);
      this.socket.emit('message:send', {
        channelId,
        content,
        tempId,
        timestamp: new Date().toISOString()
      });
      return true;
    }
    console.error('[Socket] Cannot send message - not connected');
    return false;
  }

  // Voice methods
  joinVoiceChannel(channelId) {
    if (this.socket && this.socket.connected) {
      console.log('[Socket] Joining voice channel:', channelId);
      this.socket.emit('voice:join', { channelId });
    }
  }

  leaveVoiceChannel(channelId) {
    if (this.socket && this.socket.connected) {
      console.log('[Socket] Leaving voice channel:', channelId);
      this.socket.emit('voice:leave', { channelId });
    }
  }

  // Status methods
  updateStatus(status) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('user:status', status);
    }
  }

  // Typing indicators
  startTyping(channelId, userId, username) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:start', { channelId, userId, username });
    }
  }

  stopTyping(channelId, userId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('typing:stop', { channelId, userId });
    }
  }

  // Call methods
  initiateCall(targetUserId, isVideo = false) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('call:initiate', { targetUserId, isVideo });
      return true;
    }
    return false;
  }

  acceptCall(callerId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('call:accept', { callerId });
    }
  }

  rejectCall(callerId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('call:reject', { callerId });
    }
  }

  endCall(targetUserId) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('call:end', { targetUserId });
    }
  }

  // WebRTC signaling
  sendOffer(targetUserId, offer) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('webrtc:offer', { targetUserId, offer });
    }
  }

  sendAnswer(targetUserId, answer) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('webrtc:answer', { targetUserId, answer });
    }
  }

  sendIceCandidate(targetUserId, candidate) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('webrtc:ice-candidate', { targetUserId, candidate });
    }
  }
}

const socketService = new SocketService();
export default socketService;
