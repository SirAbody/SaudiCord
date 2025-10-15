// Chat Store for managing messages and channels
import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useChatStore = create((set, get) => ({
  servers: [],
  channels: [],
  currentServer: null,
  currentChannel: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  loading: false,
  lastMessageTime: null,

  // Fetch user's servers
  fetchServers: async () => {
    try {
      const response = await axios.get('/servers/me');
      set({ servers: response.data });
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  },

  // Set current server
  setCurrentServer: (server) => {
    set({ currentServer: server, currentChannel: null });
    // Fetch channels for the new server
    if (server) {
      get().fetchChannels(server.id);
    }
  },

  // Fetch channels for a server
  fetchChannels: async (serverId) => {
    set({ loading: true });
    try {
      const response = await axios.get(`/channels/server/${serverId}`);
      set({ channels: response.data, loading: false });
      // Auto-select first channel if available
      if (response.data.length > 0) {
        get().selectChannel(response.data[0]);
      }
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      set({ loading: false });
    }
  },

  // Select a channel
  selectChannel: (channel) => {
    set({ currentChannel: channel });
    
    // Join socket channel room for real-time messages
    const socketService = require('../services/socket').default;
    if (channel && socketService && typeof socketService.joinChannel === 'function') {
      socketService.joinChannel(channel.id);
      console.log('[ChatStore] Joined channel:', channel.id);
    }
    
    // Fetch messages for this channel
    if (channel) {
      get().fetchMessages(channel.id);
    }
  },

  // Fetch messages for a channel
  fetchMessages: async (channelId) => {
    if (!channelId) {
      console.warn('[ChatStore] No channelId provided for fetchMessages');
      return;
    }
    
    try {
      console.log('[ChatStore] Fetching messages for channel:', channelId);
      const response = await axios.get(`/messages/channel/${channelId}`);
      
      // Clear existing messages for the channel first
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: response.data || []
        }
      }));
      
      console.log(`[ChatStore] Loaded ${response.data?.length || 0} messages for channel ${channelId}`);
    } catch (error) {
      console.error('[ChatStore] Failed to fetch messages:', error);
      if (error.response?.status === 404) {
        toast.error('Channel not found');
      } else if (error.response?.status === 403) {
        toast.error('You do not have access to this channel');
      } else {
        toast.error('Failed to load messages');
      }
    }
  },

  // Add new message
  addMessage: (channelId, message) => {
    if (!channelId) {
      console.warn('[ChatStore] No channelId provided for addMessage');
      return;
    }
    
    set((state) => {
      const currentMessages = state.messages[channelId] || [];
      
      // Check if this is an update to a temporary message
      if (message.tempId) {
        const tempIndex = currentMessages.findIndex(msg => msg.id === message.tempId);
        if (tempIndex !== -1) {
          // Replace temp message with real message
          const updatedMessages = [...currentMessages];
          updatedMessages[tempIndex] = { ...message, pending: false };
          return {
            messages: {
              ...state.messages,
              [channelId]: updatedMessages
            }
          };
        }
      }
      
      // Check if message already exists (by ID)
      const messageExists = currentMessages.some(msg => msg.id === message.id);
      if (messageExists) {
        console.log('[ChatStore] Message already exists, skipping:', message.id);
        return state;
      }
      
      return {
        messages: {
          ...state.messages,
          [channelId]: [...currentMessages, message]
        }
      };
    });
  },

  // Update message
  updateMessage: (channelId, tempId, updates) => {
    set((state) => {
      // If channelId is not provided, search all channels
      if (!channelId) {
        const newMessages = { ...state.messages };
        Object.keys(newMessages).forEach(chId => {
          newMessages[chId] = newMessages[chId].map(msg =>
            (msg.id === tempId || msg.tempId === tempId) ? { ...msg, ...updates } : msg
          );
        });
        return { messages: newMessages };
      }
      
      return {
        messages: {
          ...state.messages,
          [channelId]: state.messages[channelId]?.map(msg =>
            (msg.id === tempId || msg.tempId === tempId) ? { ...msg, ...updates } : msg
          ) || []
        }
      };
    });
  },

  // Delete message
  deleteMessage: (channelId, messageId) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: state.messages[channelId]?.filter(msg => msg.id !== messageId) || []
      }
    }));
  },

  // Set typing user
  setTypingUser: (channelId, userId, isTyping) => {
    set((state) => {
      const typingInChannel = state.typingUsers[channelId] || [];
      if (isTyping && !typingInChannel.includes(userId)) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [channelId]: [...typingInChannel, userId]
          }
        };
      } else if (!isTyping) {
        return {
          typingUsers: {
            ...state.typingUsers,
            [channelId]: typingInChannel.filter(id => id !== userId)
          }
        };
      }
      return state;
    });
  },

  // Set online users
  setOnlineUsers: (users) => {
    set({ onlineUsers: new Set(users) });
  },

  // Add online user
  addOnlineUser: (userId) => {
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.add(userId);
      return { onlineUsers: newSet };
    });
  },

  // Remove online user
  removeOnlineUser: (userId) => {
    set((state) => {
      const newSet = new Set(state.onlineUsers);
      newSet.delete(userId);
      return { onlineUsers: newSet };
    });
  },

  // Create new channel
  createChannel: async (name, type, serverId, description) => {
    try {
      const response = await axios.post('/channels', {
        name,
        type,
        serverId,
        description
      });
      set((state) => ({
        channels: [...state.channels, response.data]
      }));
      toast.success('Channel created successfully');
      return response.data;
    } catch (error) {
      toast.error('Failed to create channel');
      throw error;
    }
  },
  
  // Create DM channel
  createDMChannel: async (targetUserId) => {
    try {
      const response = await axios.post('/channels/dm', { targetUserId });
      return response.data;
    } catch (error) {
      toast.error('Failed to create DM channel');
      throw error;
    }
  },

  // Send message
  sendMessage: (content, attachments = []) => {
    const state = get();
    const { currentChannel } = state;
    const authStore = require('./authStore').useAuthStore.getState();
    const user = authStore.user;
    
    if (!currentChannel) {
      toast.error('Please select a channel first');
      return;
    }

    if (!user) {
      toast.error('You must be logged in to send messages');
      return;
    }

    // Create optimistic message
    const optimisticMessage = {
      id: `temp-${Date.now()}`, // Temporary ID
      content,
      attachments,
      channelId: currentChannel.id,
      userId: user.id,
      author: {
        id: user.id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar
      },
      createdAt: new Date().toISOString(),
      pending: true // Mark as pending
    };

    // Add message optimistically to UI
    set((state) => ({
      messages: {
        ...state.messages,
        [currentChannel.id]: [...(state.messages[currentChannel.id] || []), optimisticMessage]
      }
    }));

    // Import socket at the top if not already imported
    const socketService = require('../services/socket').default;
    
    // Send via Socket.io
    if (socketService && typeof socketService.emit === 'function') {
      socketService.emit('message:send', {
        channelId: currentChannel.id,
        content,
        attachments,
        tempId: optimisticMessage.id // Send temp ID to match later
      });
    } else {
      console.error('[ChatStore] Socket not available for sending message');
      toast.error('Connection error. Please refresh and try again.');
      
      // Remove optimistic message on error
      set((state) => ({
        messages: {
          ...state.messages,
          [currentChannel.id]: state.messages[currentChannel.id]?.filter(
            msg => msg.id !== optimisticMessage.id
          ) || []
        }
      }));
    }
  },

  // Force re-render with timestamp
  setLastMessageTime: (time) => {
    set({ lastMessageTime: time });
  }
}));
