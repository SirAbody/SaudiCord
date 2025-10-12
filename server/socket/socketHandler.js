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
  // Middleware for socket authentication (non-blocking)
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth && socket.handshake.auth.token;
      if (!token) {
        // Allow connection; client will authenticate after connect
        return next();
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
      
      // Only try to fetch user if User model is available
      if (User) {
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
          // Proceed unauthenticated; client will re-authenticate
          return next();
        }

        socket.user = user;
        socket.userId = user.id;
        socket.username = user.username;
        logger.debug(`Socket pre-auth successful for user: ${user.username}`);
      } else {
        // If no database, use decoded token data
        socket.user = { id: decoded.userId, username: decoded.username || 'Unknown' };
        socket.userId = decoded.userId;
        socket.username = decoded.username || 'Unknown';
        logger.debug('Socket pre-auth successful (no database)');
      }
      next();
    } catch (err) {
      logger.warn('Socket pre-auth failed', { error: err.message });
      // Do not block connection; rely on runtime authenticate event
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info('New socket connection', { socketId: socket.id });

    // Handle user authentication
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
        
        if (!User) {
          socket.userId = decoded.userId;
          socket.username = decoded.username || 'Unknown';
          activeUsers.set(socket.userId, { id: socket.userId, username: socket.username });
          userSockets.set(socket.userId, socket);
          socket.emit('auth:success', { user: { id: socket.userId, username: socket.username } });
          logger.info(`User authenticated (no database): ${socket.username}`);
          return;
        }
        
        const user = await User.findByPk(decoded.userId);
        
        if (!user) {
          socket.emit('auth:error', { message: 'User not found' });
          return;
        }

        socket.userId = user.id;
        socket.user = user;
        
        // Store user socket connection
        activeUsers.set(socket.userId, socket.id);
        userSockets.set(socket.userId, socket);
        
        // Update user status to online
        if (User) {
          await User.update(
            { status: 'online', lastSeen: new Date() },
            { where: { id: socket.userId } }
          );
        }

        // Join user to their personal room
        socket.join(`user-${socket.userId}`);

        // Broadcast user online status
        socket.broadcast.emit('user:online', {
          userId: socket.userId,
          username: socket.user.username
        });
        
        // Send success confirmation
        socket.emit('auth:success', {
          userId: user.id,
          username: user.username
        });
        
        logger.info(`User ${user.username} connected`, {
          socketId: socket.id,
          userId: user.id
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
        const { channelId, content, attachments = [] } = data;
        
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
            author: {
              id: socket.userId,
              username: socket.username || 'Unknown',
              displayName: socket.username || 'Unknown'
            },
            createdAt: new Date()
          };
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

        // Emit to all users in channel
        io.to(`channel-${channelId}`).emit('message:new', fullMessage);
        
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
      
      if (receiverSocket) {
        receiverSocket.emit('dm:receive', {
          senderId: socket.userId,
          senderName: socket.user.username,
          content,
          timestamp: new Date()
        });
      }
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

    // WebRTC signaling for calls
    socket.on('call:offer', (data) => {
      const { receiverId, offer, callType } = data;
      const receiverSocket = userSockets.get(receiverId);
      
      if (receiverSocket) {
        receiverSocket.emit('call:offer', {
          callerId: socket.userId,
          callerName: socket.user.username,
          offer,
          callType
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
      const { targetUserId } = data;
      const targetSocket = userSockets.get(targetUserId);
      
      if (targetSocket) {
        targetSocket.emit('call:ended', {
          enderId: socket.userId
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      if (socket.userId && socket.user) {
        logger.info(`User ${socket.user.username} disconnected`, {
          socketId: socket.id,
          userId: socket.userId
        });
        
        // Remove from active users
        activeUsers.delete(socket.userId);
        userSockets.delete(socket.userId);
        
        // Update user status
        if (User) {
          await User.update(
            { status: 'offline', lastSeen: new Date() },
            { where: { id: socket.userId } }
          );
        }
        
        // Broadcast user offline status
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
