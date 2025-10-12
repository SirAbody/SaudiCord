// Socket.io Service
import io from 'socket.io-client';
import { useChatStore } from '../stores/chatStore';
import { useCallStore } from '../stores/callStore';
import toast from 'react-hot-toast';

class SocketService {
  constructor() {
    this.socket = null;
  }

  connect(token) {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Use same origin in production, full URL in development
    const serverUrl = process.env.NODE_ENV === 'production'
      ? window.location.origin
      : (process.env.REACT_APP_SERVER_URL || 'http://localhost:10000');
    
    this.socket = io(serverUrl, {
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    this.setupEventHandlers(token);
    return this.socket;
  }

  setupEventHandlers(token) {
    const chatStore = useChatStore.getState();
    const callStore = useCallStore.getState();

    // Connection events
    this.socket.on('connect', () => {
      console.log('Connected to SaudiCord server');
      toast.success('Connected to server');
      // Send authentication after connecting
      this.socket.emit('authenticate', token);
    });

    // Authentication events
    this.socket.on('auth:success', (data) => {
      console.log('Authentication successful', data);
    });

    this.socket.on('auth:error', (data) => {
      console.error('Authentication failed:', data.message);
      toast.error('Authentication failed. Please login again.');
      window.location.href = '/login';
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Disconnected from server:', reason);
      if (reason === 'io server disconnect') {
        // Server disconnected, try to reconnect
        this.socket.connect();
      }
    });

    this.socket.on('connect_error', (error) => {
      console.error('Connection error:', error.message);
      if (error.message === 'Authentication error') {
        toast.error('Authentication failed. Please login again.');
        // Redirect to login
        window.location.href = '/login';
      }
    });

    // User status events
    this.socket.on('user:online', (data) => {
      chatStore.addOnlineUser(data.userId);
    });

    this.socket.on('user:offline', (data) => {
      chatStore.removeOnlineUser(data.userId);
    });

    // Message events
    this.socket.on('message:new', (message) => {
      const channelId = message.channelId;
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
  }

  // Emit events
  joinChannel(channelId) {
    if (this.socket) {
      this.socket.emit('join:channel', channelId);
    }
  }

  leaveChannel(channelId) {
    if (this.socket) {
      this.socket.emit('leave:channel', channelId);
    }
  }

  sendMessage(channelId, content, attachments = []) {
    if (this.socket) {
      this.socket.emit('message:send', {
        channelId,
        content,
        attachments
      });
    }
  }

  editMessage(messageId, content) {
    if (this.socket) {
      this.socket.emit('message:edit', {
        messageId,
        content
      });
    }
  }

  deleteMessage(messageId) {
    if (this.socket) {
      this.socket.emit('message:delete', {
        messageId
      });
    }
  }

  startTyping(channelId) {
    if (this.socket) {
      this.socket.emit('typing:start', { channelId });
    }
  }

  stopTyping(channelId) {
    if (this.socket) {
      this.socket.emit('typing:stop', { channelId });
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
  }

  getSocket() {
    return this.socket;
  }
}

const socketService = new SocketService();
export default socketService;
