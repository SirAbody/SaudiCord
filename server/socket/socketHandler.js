// Socket.io Handler for Real-time Communication
const jwt = require('jsonwebtoken');
const { User, Message, Channel } = require('../models');
const logger = require('../utils/logger');

// Store active connections
const activeUsers = new Map();
const userSockets = new Map();

module.exports = (io) => {
  // Middleware for socket authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
      const user = await User.findByPk(decoded.userId);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user.id;
      socket.user = user;
      logger.debug(`Socket authentication successful for user: ${user.username}`);
      next();
    } catch (err) {
      logger.warn('Socket authentication failed', { error: err.message });
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    logger.info(`User ${socket.user.username} connected`, { 
      socketId: socket.id, 
      userId: socket.userId 
    });
    
    // Store user socket connection
    activeUsers.set(socket.userId, socket.id);
    userSockets.set(socket.userId, socket);

    // Update user status to online
    User.update(
      { status: 'online', lastSeen: new Date() },
      { where: { id: socket.userId } }
    );

    // Join user to their personal room
    socket.join(`user-${socket.userId}`);

    // Broadcast user online status
    socket.broadcast.emit('user:online', {
      userId: socket.userId,
      username: socket.user.username
    });

    // Handle joining channels/servers
    socket.on('join:channel', async (channelId) => {
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

    // Handle text messages
    socket.on('message:send', async (data) => {
      try {
        const { channelId, content, attachments = [] } = data;
        
        // Create message in database
        const message = await Message.create({
          content,
          channelId,
          userId: socket.userId,
          attachments
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
          channelId, 
          userId: socket.userId 
        });
      } catch (error) {
        logger.error('Error sending message:', { error, channelId, userId: socket.userId });
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle message editing
    socket.on('message:edit', async (data) => {
      try {
        const { messageId, content } = data;
        
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
      socket.to(`channel-${data.channelId}`).emit('typing:user', {
        channelId: data.channelId,
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('typing:stop', (data) => {
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

    // WebRTC signaling
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
      logger.info(`User ${socket.user.username} disconnected`, {
        socketId: socket.id,
        userId: socket.userId
      });
      
      // Remove from active users
      activeUsers.delete(socket.userId);
      userSockets.delete(socket.userId);
      
      // Update user status
      await User.update(
        { status: 'offline', lastSeen: new Date() },
        { where: { id: socket.userId } }
      );
      
      // Broadcast user offline status
      socket.broadcast.emit('user:offline', {
        userId: socket.userId
      });
    });
  });
};
