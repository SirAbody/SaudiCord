// Socket.io Handler for Real-time Communication
const jwt = require('jsonwebtoken');

// Safely load models (might fail if database is not connected)
let User, Message, Channel;
try {
  const models = require('../models');
  User = models.User;
  Message = models.Message;
  Channel = models.Channel;
} catch (err) {
  console.warn('Models not loaded - database might be unavailable');
}

// Simple logger for production
const logger = {
  info: (...args) => console.log('[INFO]', ...args),
  error: (...args) => console.error('[ERROR]', ...args),
  warn: (...args) => console.warn('[WARN]', ...args),
  debug: (...args) => process.env.NODE_ENV !== 'production' && console.log('[DEBUG]', ...args)
};

// Store active connections
const activeUsers = new Map();
const userSockets = new Map();

module.exports = (io) => {
  // Middleware for socket authentication (always non-blocking for production)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        logger.debug('No token provided, allowing connection for later auth');
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
        
        // Only try to fetch user if User model is available and database is connected
        if (User) {
          try {
            const user = await User.findByPk(decoded.userId);
            
            if (user) {
              socket.user = user;
              socket.userId = user.id;
              socket.username = user.username;
              logger.debug(`Socket pre-auth successful for user: ${user.username}`);
            } else {
              // User from token but not in DB
              socket.userId = decoded.userId;
              socket.username = decoded.username || 'Unknown';
            }
          } catch (dbErr) {
            // Database query failed, use token data
            socket.userId = decoded.userId;
            socket.username = decoded.username || 'Unknown';
            logger.warn('Database unavailable during socket auth, using token data');
          }
        } else {
          // No database models, use token data
          socket.user = { id: decoded.userId, username: decoded.username || 'Unknown' };
          socket.userId = decoded.userId;
          socket.username = decoded.username || 'Unknown';
        }
      } catch (tokenErr) {
        logger.debug('Invalid token during socket auth, allowing connection');
      }
      
      next();
    } catch (err) {
      logger.error('Unexpected error in socket auth middleware', { error: err.message });
      // Never block connection in production
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info('New socket connection', { socketId: socket.id });

    // Handle user authentication - SIMPLIFIED
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
        
        // Use token data directly - avoid DB call in critical path
        socket.userId = decoded.userId;
        socket.username = decoded.username || 'Unknown';
        socket.user = { 
          id: decoded.userId, 
          username: decoded.username || 'Unknown',
          displayName: decoded.displayName || decoded.username || 'Unknown'
        };
        
        // Store in memory maps
        activeUsers.set(socket.userId, socket.user);
        userSockets.set(socket.userId, socket);
        
        // Join user room
        socket.join(`user-${socket.userId}`);

        // Broadcast online (but don't update DB every time)
        socket.broadcast.emit('user:online', {
          userId: socket.userId,
          username: socket.username
        });
        
        // Success response
        socket.emit('auth:success', {
          userId: decoded.userId,
          username: socket.username
        });
        
        logger.info(`User ${socket.username} connected (fast auth)`, {
          socketId: socket.id,
          userId: socket.userId
        });
      } catch (err) {
        logger.warn('Socket authentication failed', { error: err.message });
        socket.emit('auth:error', { message: 'Authentication failed' });
      }
    });

    // Handle joining channels/servers
    socket.on('join:channel', async (channelId) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        socket.join(`channel-${channelId}`);
        logger.debug(`User ${socket.user.username} joined channel ${channelId}`);
        
        // Notify others in channel
        socket.to(`channel-${channelId}`).emit('user:joined', {
          channelId,
          user: {
            id: socket.userId,
            username: socket.user.username,
            avatar: socket.user.avatar
          }
        });
      } catch (error) {
        logger.error('Error joining channel', { error, channelId, userId: socket.userId });
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Handle leaving channels
    socket.on('leave:channel', (channelId) => {
      socket.leave(`channel-${channelId}`);
      socket.to(`channel-${channelId}`).emit('user:left', {
        channelId,
        userId: socket.userId
      });
    });

    // Handle getting users list
    socket.on('users:get', async () => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        if (!User) {
          const onlineUsers = Array.from(activeUsers.values());
          socket.emit('users:list', onlineUsers);
          return;
        }
        
        const users = await User.findAll({
          where: { status: { [require('sequelize').Op.ne]: null } },
          attributes: ['id', 'username', 'displayName', 'avatar', 'status', 'lastSeen']
        });
        
        socket.emit('users:list', { users });
      } catch (error) {
        logger.error('Error fetching users', { error });
      }
    });

    // Handle sending messages
    socket.on('message:send', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }
      
      try {
        const { channelId, content, attachments = [], tempId } = data;
        
        if (!channelId || !content) {
          socket.emit('error', { message: 'Channel ID and content are required' });
          return;
        }
        
        // Create message in database
        if (!Message || !User) {
          // If no database, create a simple message object
          const simpleMessage = {
            id: Date.now().toString(),
            content,
            channelId,
            userId: socket.userId,
            tempId, // Include tempId for optimistic updates
            author: {
              id: socket.userId,
              username: socket.username || 'Unknown',
              displayName: socket.username || 'Unknown',
              avatar: socket.user?.avatar || null
            },
            createdAt: new Date().toISOString()
          };
          
          // Send to all in channel including sender
          io.to(`channel:${channelId}`).emit('message:receive', simpleMessage);
          logger.info(`Message sent (no database): ${content.substring(0, 50)}...`);
          return;
        }
        
        const message = await Message.create({
          content,
          channelId,
          userId: socket.userId,
          serverId: data.serverId
        });

        // Get full message with author info
        const fullMessage = await Message.findByPk(message.id, {
          include: [
            {
              model: User,
              as: 'author',
              attributes: ['id', 'username', 'displayName', 'avatar']
            }
          ]
        });

        // Emit to all users in channel (including tempId for optimistic updates)
        const messageWithTempId = { ...fullMessage.toJSON(), tempId };
        io.to(`channel-${channelId}`).emit('message:receive', messageWithTempId);
        
        logger.debug('Message sent successfully', { 
          messageId: message.id, 
          channelId: data.channelId, 
          userId: socket.userId 
        });
      } catch (error) {
        logger.error('Error sending message:', { error, channelId: data.channelId, userId: socket.userId });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message editing
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;
        
        if (!Message) {
          logger.warn('Message editing not available without database');
          return;
        }
        
        const message = await Message.findByPk(messageId);
        if (message && message.userId === socket.userId) {
          await message.update({
            content,
            edited: true,
            editedAt: new Date()
          });

          io.to(`channel-${message.channelId}`).emit('message:edited', {
            messageId,
            content,
            editedAt: message.editedAt
          });
        }
      } catch (error) {
        console.error('Error editing message:', error);
        socket.emit('error', { message: 'Failed to edit message' });
      }
    });

    // Handle message deletion
    socket.on('message:delete', async (data) => {
      try {
        const { messageId } = data;
        
        if (!Message) {
          logger.warn('Message deletion not available without database');
          return;
        }
        
        const message = await Message.findByPk(messageId);
        if (message && message.userId === socket.userId) {
          const channelId = message.channelId;
          await message.destroy(); // Soft delete
          
          io.to(`channel-${channelId}`).emit('message:deleted', { messageId });
        }
      } catch (error) {
        console.error('Error deleting message:', error);
        socket.emit('error', { message: 'Failed to delete message' });
      }
    });

    // Handle typing indicators
    socket.on('typing:start', (data) => {
      if (!socket.userId || !socket.user) {
        return;
      }
      socket.to(`channel-${data.channelId}`).emit('typing:user', {
        channelId: data.channelId,
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('typing:stop', (data) => {
      if (!socket.userId || !socket.user) {
        return;
      }
      socket.to(`channel-${data.channelId}`).emit('typing:user:stop', {
        channelId: data.channelId,
        userId: socket.userId
      });
    });

    // Voice Channel Management
    socket.on('voice:join', async (data) => {
      const { channelId } = data;
      if (!channelId || !socket.userId) {
        socket.emit('error', { message: 'Channel ID and authentication required' });
        return;
      }
      
      // Join voice room
      socket.join(`voice:${channelId}`);
      
      // Initialize voice rooms map if needed
      if (!global.voiceRooms) {
        global.voiceRooms = new Map();
      }
      
      // Create channel entry if not exists
      if (!global.voiceRooms.has(channelId)) {
        global.voiceRooms.set(channelId, new Set());
      }
      
      // Add user to voice channel
      const userInfo = {
        userId: socket.userId,
        username: socket.username || 'Unknown',
        socketId: socket.id
      };
      
      global.voiceRooms.get(channelId).add(JSON.stringify(userInfo));
      
      // Get all users in room
      const usersInRoom = Array.from(global.voiceRooms.get(channelId))
        .map(userStr => JSON.parse(userStr));
      
      // Notify all users in voice channel
      io.to(`voice:${channelId}`).emit('voice:users', {
        channelId,
        users: usersInRoom
      });
      
      logger.info(`User ${socket.username} joined voice channel ${channelId}`);
    });
    
    socket.on('voice:leave', async (data) => {
      const { channelId } = data;
      if (!channelId || !socket.userId) return;
      
      // Leave voice room
      socket.leave(`voice:${channelId}`);
      
      // Remove from voice state
      if (global.voiceRooms && global.voiceRooms.has(channelId)) {
        const users = global.voiceRooms.get(channelId);
        
        // Find and remove user
        const userToRemove = Array.from(users)
          .find(userStr => {
            const user = JSON.parse(userStr);
            return user.userId === socket.userId;
          });
          
        if (userToRemove) {
          users.delete(userToRemove);
        }
        
        // Clean up empty channels
        if (users.size === 0) {
          global.voiceRooms.delete(channelId);
        } else {
          // Notify remaining users
          const usersInRoom = Array.from(users)
            .map(userStr => JSON.parse(userStr));
          
          io.to(`voice:${channelId}`).emit('voice:users', {
            channelId,
            users: usersInRoom
          });
        }
      }
      
      logger.info(`User ${socket.username} left voice channel ${channelId}`);
    });

    // WebRTC Signaling for Voice/Video Calls
    socket.on('call:initiate', async (data) => {
      const { targetUserId, callType, channelId } = data;
      const targetSocket = userSockets.get(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('call:incoming', {
          callerId: socket.userId,
          callerName: socket.user.username,
          callType,
          channelId
        });
      }
    });

    socket.on('call:accept', (data) => {
      const { callerId } = data;
      const callerSocket = userSockets.get(callerId);
      
      if (callerSocket) {
        callerSocket.emit('call:accepted', {
          accepterId: socket.userId
        });
      }
    });

    socket.on('call:reject', (data) => {
      const { callerId } = data;
      const callerSocket = userSockets.get(callerId);
      
      if (callerSocket) {
        callerSocket.emit('call:rejected', {
          rejecterId: socket.userId
        });
      }
    });

    // Direct Message Handlers
    socket.on('dm:send', async (data) => {
      const { receiverId, content } = data;
      const receiverSocket = userSockets.get(receiverId);
      
      // Create message object
      const message = {
        id: Date.now().toString(),
        senderId: socket.userId,
        receiverId: receiverId,
        senderName: socket.username || socket.user?.username || 'Unknown',
        content,
        createdAt: new Date().toISOString(),
        timestamp: new Date()
      };
      
      // Send to receiver if online
      if (receiverSocket) {
        receiverSocket.emit('dm:receive', message);
      }
      
      // Send back to sender for confirmation
      socket.emit('dm:receive', message);
      
      logger.info(`DM sent from ${socket.userId} to ${receiverId}`);
    });

    // Screen Sharing Handlers
    socket.on('screenshare:started', (data) => {
      const { receiverId } = data;
      const receiverSocket = userSockets.get(receiverId);
      
      if (receiverSocket) {
        receiverSocket.emit('screenshare:started', {
          senderId: socket.userId
        });
      }
    });

    socket.on('screenshare:stopped', (data) => {
      const { receiverId } = data;
      const receiverSocket = userSockets.get(receiverId);
      
      if (receiverSocket) {
        receiverSocket.emit('screenshare:stopped', {
          senderId: socket.userId
        });
      }
    });

    socket.on('call:answer', (data) => {
      const { callerId, answer } = data;
      const callerSocket = userSockets.get(callerId);
      
      if (callerSocket) {
        callerSocket.emit('call:answer', {
          answererId: socket.userId,
          answer
        });
      }
    });

    socket.on('call:ice-candidate', (data) => {
      const { targetUserId, candidate } = data;
      const targetSocket = userSockets.get(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('call:ice-candidate', {
          senderId: socket.userId,
          candidate
        });
      }
    });

    // Legacy WebRTC signaling (keeping for compatibility)
    socket.on('webrtc:offer', (data) => {
      const { targetUserId, offer } = data;
      const targetSocket = userSockets.get(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('webrtc:offer', {
          senderId: socket.userId,
          offer
        });
      }
    });

    socket.on('webrtc:answer', (data) => {
      const { targetUserId, answer } = data;
      const targetSocket = userSockets.get(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('webrtc:answer', {
          senderId: socket.userId,
          answer
        });
      }
    });

    socket.on('webrtc:ice-candidate', (data) => {
      const { targetUserId, candidate } = data;
      const targetSocket = userSockets.get(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('webrtc:ice-candidate', {
          senderId: socket.userId,
          candidate
        });
      }
    });

    // Handle call end
    socket.on('call:end', (data) => {
      // Handle both targetUserId and channelId for voice calls
      if (!data || (!data.targetUserId && !data.channelId)) {
        // Don't log as error - this is normal when leaving voice channels
        return;
      }
      
      if (data.targetUserId) {
        const targetUserId = data.targetUserId;
        const targetSocket = userSockets.get(targetUserId);
        
        if (targetSocket) {
          targetSocket.emit('call:ended', {
            enderId: socket.userId
          });
        }
      }
      
      if (data.channelId) {
        // Leave voice channel
        socket.to(`voice:${data.channelId}`).emit('voice:user:left', {
          userId: socket.userId,
          username: socket.username
        });
      }
    });

    // Handle disconnection - NO DATABASE CALLS
    socket.on('disconnect', (reason) => {
      if (socket.userId && socket.user) {
        logger.info(`User ${socket.user.username} disconnected`, {
          socketId: socket.id,
          userId: socket.userId,
          reason
        });
        
        // Remove from memory only - no DB updates
        activeUsers.delete(socket.userId);
        userSockets.delete(socket.userId);
        
        // Broadcast offline status
        socket.broadcast.emit('user:offline', {
          userId: socket.userId
        });
      } else {
        logger.info(`Unauthenticated socket disconnected`, { socketId: socket.id });
      }
    });
  });
};

module.exports.activeUsers = activeUsers;
module.exports.userSockets = userSockets;
