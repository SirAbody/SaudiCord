// Chat Store for managing messages and channels
import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

export const useChatStore = create((set, get) => ({
  servers: [],
  channels: [],
  currentChannel: null,
  messages: {},
  typingUsers: {},
  onlineUsers: new Set(),
  loading: false,

  // Fetch user's servers
  fetchServers: async () => {
    try {
      const response = await axios.get('/api/servers/me');
      set({ servers: response.data });
    } catch (error) {
      console.error('Failed to fetch servers:', error);
    }
  },

  // Fetch channels for a server
  fetchChannels: async (serverId) => {
    set({ loading: true });
    try {
      const response = await axios.get(`/api/channels/server/${serverId}`);
      set({ channels: response.data, loading: false });
    } catch (error) {
      console.error('Failed to fetch channels:', error);
      set({ loading: false });
    }
  },

  // Select a channel
  selectChannel: (channel) => {
    set({ currentChannel: channel });
    
    // Fetch messages for this channel
    if (channel) {
      get().fetchMessages(channel.id);
    }
  },

  // Fetch messages for a channel
  fetchMessages: async (channelId) => {
    try {
      const response = await axios.get(`/api/messages/channel/${channelId}`);
      set((state) => ({
        messages: {
          ...state.messages,
          [channelId]: response.data
        }
      }));
    } catch (error) {
      console.error('Failed to fetch messages:', error);
      toast.error('Failed to load messages');
    }
  },

  // Add new message
  addMessage: (channelId, message) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: [...(state.messages[channelId] || []), message]
      }
    }));
  },

  // Update message
  updateMessage: (channelId, messageId, updates) => {
    set((state) => ({
      messages: {
        ...state.messages,
        [channelId]: state.messages[channelId]?.map(msg =>
          msg.id === messageId ? { ...msg, ...updates } : msg
        ) || []
      }
    }));
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
      const response = await axios.post('/api/channels', {
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
      const response = await axios.post('/api/channels/dm', { targetUserId });
      return response.data;
    } catch (error) {
      toast.error('Failed to create DM channel');
      throw error;
    }
  }
}));
