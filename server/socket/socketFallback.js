// Socket.io Fallback Handler for when database is unavailable
// This allows basic socket functionality even without database

const jwt = require('jsonwebtoken');

// In-memory storage for fallback mode
const activeUsers = new Map();
const userSockets = new Map();

// Simple logger
const logger = {
  info: (...args) => console.log('[SOCKET]', ...args),
  error: (...args) => console.error('[SOCKET]', ...args),
  warn: (...args) => console.warn('[SOCKET]', ...args),
  debug: (...args) => process.env.NODE_ENV !== 'production' && console.log('[SOCKET DEBUG]', ...args)
};

module.exports = (io) => {
  // Non-blocking authentication - allow connection even without token
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || 
                   socket.handshake.query?.token ||
                   socket.handshake.headers?.authorization?.split(' ')[1];
      
      if (!token) {
        logger.debug('No token provided, allowing connection for later auth');
        // Allow connection without token - client will authenticate after connect
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret-key-2024');
        socket.userId = decoded.userId;
        socket.username = decoded.username || 'User';
        logger.info(`Socket pre-authenticated for user: ${socket.username}`);
      } catch (err) {
        logger.debug('Token verification failed during handshake:', err.message);
        // Still allow connection - client can re-authenticate
      }
      
      next();
    } catch (error) {
      logger.warn('Socket middleware error:', error);
      // Never block connections in production
      next();
    }
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id}, User: ${socket.username || 'unauthenticated'}`);
    
    // Handle authentication event from client
    socket.on('authenticate', (token) => {
      try {
        if (!token) {
          socket.emit('auth:error', { message: 'Token required' });
          return;
        }
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret-key-2024');
        socket.userId = decoded.userId;
        socket.username = decoded.username || 'User';
        
        // Store user socket
        if (!userSockets.has(socket.userId)) {
          userSockets.set(socket.userId, new Set());
        }
        userSockets.get(socket.userId).add(socket.id);
        
        // Mark user as online
        activeUsers.set(socket.userId, {
          id: socket.userId,
          username: socket.username,
          status: 'online',
          socketId: socket.id
        });

        // Emit authentication success
        socket.emit('auth:success', {
          user: {
            id: socket.userId,
            username: socket.username
          }
        });

        // Broadcast user online status
        socket.broadcast.emit('user:online', { userId: socket.userId });
        
        logger.info(`Socket authenticated: ${socket.username}`);
      } catch (error) {
        logger.error('Authentication error:', error);
        socket.emit('auth:error', { message: 'Authentication failed' });
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      logger.info(`User disconnected: ${socket.username} (${socket.id})`);
      
      // Remove socket from user's socket list
      if (userSockets.has(socket.userId)) {
        userSockets.get(socket.userId).delete(socket.id);
        if (userSockets.get(socket.userId).size === 0) {
          userSockets.delete(socket.userId);
          activeUsers.delete(socket.userId);
          // Broadcast user offline status
          socket.broadcast.emit('user:offline', socket.userId);
        }
      }
    });

    // Handle basic ping/pong for connection health
    socket.on('ping', () => {
      socket.emit('pong');
    });

    // Handle message send (basic relay without database)
    socket.on('message:send', (data) => {
      logger.debug(`Message from ${socket.username}: ${data.content}`);
      
      // Create message object
      const message = {
        id: Date.now().toString(),
        content: data.content,
        userId: socket.userId,
        channelId: data.channelId,
        username: socket.username,
        createdAt: new Date().toISOString()
      };

      // Emit to all clients in the channel (simplified)
      io.emit('message:new', message);
    });

    // Handle typing indicators
    socket.on('typing:start', (channelId) => {
      socket.to(channelId).emit('typing:user', {
        userId: socket.userId,
        username: socket.username,
        channelId
      });
    });

    socket.on('typing:stop', (channelId) => {
      socket.to(channelId).emit('typing:user:stop', {
        userId: socket.userId,
        channelId
      });
    });

    // Join channel room
    socket.on('channel:join', (channelId) => {
      socket.join(channelId);
      logger.debug(`${socket.username} joined channel ${channelId}`);
    });

    // Leave channel room
    socket.on('channel:leave', (channelId) => {
      socket.leave(channelId);
      logger.debug(`${socket.username} left channel ${channelId}`);
    });
  });

  return io;
};
