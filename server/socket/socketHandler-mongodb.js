// Socket.io Handler with MongoDB
const jwt = require('jsonwebtoken');
const User = require('../schemas/User');
const Message = require('../schemas/Message');
const Channel = require('../schemas/Channel');
const Server = require('../schemas/Server');
const DirectMessage = require('../schemas/DirectMessage');
const VoiceCall = require('../schemas/VoiceCall');
const Friendship = require('../schemas/Friendship');

// Active connections tracking
const activeUsers = new Map();
const userSockets = new Map();

module.exports = (io) => {
  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      
      if (!token) {
        console.log('[Socket] No token provided, allowing connection for later auth');
        return next();
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret-key-2024');
        
        // Fetch user from MongoDB
        const user = await User.findById(decoded.userId);
        
        if (user) {
          socket.user = user;
          socket.userId = user._id.toString();
          socket.username = user.username;
          console.log(`[Socket] Pre-auth successful for user: ${user.username}`);
          
          // Update last seen and status
          await user.updateLastSeen();
        } else {
          socket.userId = decoded.userId;
          socket.username = decoded.username || 'Unknown';
        }
      } catch (tokenErr) {
        console.log('[Socket] Invalid token, allowing connection');
      }
      
      next();
    } catch (err) {
      console.error('[Socket] Auth middleware error:', err);
      next();
    }
  });

  io.on('connection', (socket) => {
    console.log('[Socket] New connection:', socket.id);

    // Handle authentication
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret-key-2024');
        
        // Fetch user from MongoDB
        const user = await User.findById(decoded.userId);
        
        if (user) {
          socket.user = user;
          socket.userId = user._id.toString();
          
          user.status = 'online';
          await user.save();
          
          // Store in active users and sockets map
          activeUsers.set(socket.userId, user.toSafeObject());
          userSockets.set(socket.userId.toString(), socket.id);
          console.log(`[Socket] Stored socket ID ${socket.id} for user ${socket.userId}`);
      
      // Join user room for DMs and notifications
      socket.join(`user-${socket.userId}`);
      socket.join(`user-${socket.userId.toString()}`); // Join with string version too
      console.log(`[Socket] User ${socket.username} joined rooms: user-${socket.userId}`);
          
          // Broadcast online status
          socket.broadcast.emit('user:online', {
            userId: socket.userId,
            username: socket.username
          });
          
          // Send success response
          socket.emit('auth:success', {
            userId: socket.userId,
            username: socket.username
          });
          
          console.log(`[Socket] User ${socket.username} authenticated`);
        }
      } catch (err) {
        console.error('[Socket] Authentication failed:', err);
        socket.emit('auth:error', { message: 'Authentication failed' });
      }
    });

    // Join channel
    socket.on('join:channel', async (channelId) => {
      if (!socket.userId) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        // Leave previous channels
        const rooms = Array.from(socket.rooms);
        rooms.forEach(room => {
          if (room.startsWith('channel-') && room !== socket.id) {
            socket.leave(room);
          }
        });
        
        socket.join(`channel-${channelId}`);
        console.log(`[Socket] User ${socket.username} joined channel ${channelId}`);
        
        // Notify others
        socket.to(`channel-${channelId}`).emit('user:joined', {
          channelId,
          user: {
            id: socket.userId,
            username: socket.username,
            avatar: socket.user?.avatar
          }
        });
      } catch (error) {
        console.error('[Socket] Error joining channel:', error);
        socket.emit('error', { message: 'Failed to join channel' });
      }
    });

    // Send message
    socket.on('message:send', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const { channelId, content, tempId } = data;
        
        if (!channelId || !content) {
          socket.emit('error', { message: 'Channel ID and content are required' });
          return;
        }

        // Make sure sender is in the channel room
        if (!socket.rooms.has(`channel-${channelId}`)) {
          socket.join(`channel-${channelId}`);
        }

        // Get channel info
        const channel = await Channel.findById(channelId);
        if (!channel) {
          socket.emit('error', { message: 'Channel not found' });
          return;
        }

        // Create message in MongoDB
        const message = new Message({
          content,
          author: socket.userId,
          channel: channelId,
          server: channel.server
        });
        
        await message.save();
        
        // Populate author info
        await message.populate('author', 'username displayName avatar');
        
        const messageData = {
          _id: message._id,
          id: message._id,
          content: message.content,
          channelId: channelId,
          author: {
            id: message.author._id,
            username: message.author.username,
            displayName: message.author.displayName,
            avatar: message.author.avatar
          },
          createdAt: message.createdAt
        };

        // Send to everyone in channel except sender
        socket.broadcast.to(`channel-${channelId}`).emit('message:receive', messageData);
        
        // Send confirmation to sender
        socket.emit('message:sent', {
          tempId,
          messageId: message._id,
          message: messageData
        });
        
        // Update channel's last message
        channel.lastMessageId = message._id;
        channel.lastMessageAt = new Date();
        await channel.save();
        
        console.log(`[Socket] Message sent to channel ${channelId}`);
      } catch (error) {
        console.error('[Socket] Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Send direct message
    socket.on('dm:send', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const { receiverId, content } = data;
        
        if (!receiverId || !content) {
          socket.emit('error', { message: 'Receiver and content are required' });
          return;
        }

        // Check if users are friends or not blocked
        const isBlocked = await Friendship.isBlocked(socket.userId, receiverId);
        if (isBlocked) {
          socket.emit('error', { message: 'Cannot send message to this user' });
          return;
        }

        // Create conversation ID
        const conversationId = DirectMessage.createConversationId(socket.userId, receiverId);

        // Create DM in MongoDB
        const dm = new DirectMessage({
          content,
          sender: socket.userId,
          receiver: receiverId,
          conversation: conversationId
        });
        
        await dm.save();
        
        // Populate sender info
        await dm.populate('sender', 'username displayName avatar');
        
        const messageData = {
          id: dm._id,
          _id: dm._id,
          content: dm.content,
          senderId: dm.sender._id.toString(),
          receiverId: receiverId.toString(),
          senderName: dm.sender.username || dm.sender.displayName,
          sender: {
            _id: dm.sender._id.toString(),
            username: dm.sender.username,
            displayName: dm.sender.displayName,
            avatar: dm.sender.avatar
          },
          createdAt: dm.createdAt,
          timestamp: dm.createdAt
        };

        // Send to both receiver and sender for instant update
        const receiverSocketId = userSockets.get(receiverId.toString());
        const senderSocketId = socket.id;
        
        // Send to receiver
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('dm:receive', messageData);
          console.log(`[Socket] DM sent to receiver socket: ${receiverSocketId}`);
        }
        
        // Also send via user room for redundancy
        io.to(`user-${receiverId}`).emit('dm:receive', messageData);
        
        // Send to sender's other sessions
        io.to(`user-${socket.userId}`).except(senderSocketId).emit('dm:receive', messageData);
        
        // Send confirmation to sender
        socket.emit('dm:sent', {
          ...messageData,
          tempId: data.tempId
        });
        
        console.log(`[Socket] DM sent from ${socket.userId} to ${receiverId}`);
      } catch (error) {
        console.error('[Socket] Error sending DM:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Join voice channel
    socket.on('voice:join', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const { channelId } = data;
        
        // Get channel
        const channel = await Channel.findById(channelId);
        if (!channel || channel.type !== 'voice') {
          socket.emit('error', { message: 'Invalid voice channel' });
          return;
        }

        // Join voice channel in database
        await channel.joinVoiceChannel(socket.userId);
        
        // Join socket room
        socket.join(`voice:${channelId}`);
        
        // Get all users in channel
        await channel.populate('connectedUsers.user', 'username displayName avatar');
        const users = channel.connectedUsers.map(cu => ({
          id: cu.user._id,
          username: cu.user.username,
          displayName: cu.user.displayName,
          avatar: cu.user.avatar,
          isMuted: cu.isMuted,
          isDeafened: cu.isDeafened,
          isVideo: cu.isVideo
        }));
        
        // Store voice channel for user
        socket.voiceChannelId = channelId;
        
        // Notify all users in voice channel
        io.to(`voice:${channelId}`).emit('voice:users', {
          channelId,
          users
        });
        
        // Notify about user joining - send to everyone including the joiner
        io.to(`voice:${channelId}`).emit('voice:user:joined', {
          channelId,
          user: {
            id: socket.userId,
            username: socket.user.username,
            displayName: socket.user.displayName,
            avatar: socket.user.avatar
          }
        });
        
        console.log(`[Socket] User ${socket.username} joined voice channel ${channelId}`);
      } catch (error) {
        console.error('[Socket] Error joining voice channel:', error);
        socket.emit('error', { message: 'Failed to join voice channel' });
      }
    });

    // Handle WebRTC offer
    socket.on('webrtc:offer', (data) => {
      const { targetUserId, offer } = data;
      const targetSocketId = userSockets.get(targetUserId?.toString());
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:offer', {
          userId: socket.userId,
          offer
        });
      }
    });
    
    // Handle WebRTC answer
    socket.on('webrtc:answer', (data) => {
      const { targetUserId, answer } = data;
      const targetSocketId = userSockets.get(targetUserId?.toString());
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:answer', {
          userId: socket.userId,
          answer
        });
      }
    });
    
    // Handle ICE candidates
    socket.on('webrtc:ice-candidate', (data) => {
      const { targetUserId, candidate } = data;
      const targetSocketId = userSockets.get(targetUserId?.toString());
      
      if (targetSocketId) {
        io.to(targetSocketId).emit('webrtc:ice-candidate', {
          userId: socket.userId,
          candidate
        });
      }
    });
    
    // Leave voice channel
    socket.on('voice:leave', async (data) => {
      if (!socket.userId) return;

      try {
        const { channelId } = data;
        
        // Get channel
        const channel = await Channel.findById(channelId);
        if (channel) {
          // Leave voice channel in database
          await channel.leaveVoiceChannel(socket.userId);
        }
        
        // Leave socket room
        socket.leave(`voice:${channelId}`);
        
        // Notify others
        socket.to(`voice:${channelId}`).emit('voice:user:left', {
          userId: socket.userId,
          username: socket.user?.username
        });
        
        console.log(`[Socket] User ${socket.username} left voice channel ${channelId}`);
      } catch (error) {
        console.error('[Socket] Error leaving voice channel:', error);
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

    // Typing indicators
    socket.on('typing:start', (data) => {
      if (!socket.userId || !socket.user) return;
      
      socket.to(`channel-${data.channelId}`).emit('typing:start', {
        channelId: data.channelId,
        userId: socket.userId,
        username: socket.user.username
      });
    });

    socket.on('typing:stop', (data) => {
      if (!socket.userId) return;
      
      socket.to(`channel-${data.channelId}`).emit('typing:stop', {
        channelId: data.channelId,
        userId: socket.userId
      });
    });

    // Friend request events
    socket.on('friend:request:send', async (data) => {
      if (!socket.userId) return;
      
      try {
        const targetUser = await User.findOne({ username: data.targetUsername });
        if (!targetUser) {
          socket.emit('error', { message: 'User not found' });
          return;
        }
        
        // Send real-time notification to target user
        io.to(`user-${targetUser._id.toString()}`).emit('friend:request:received', {
          from: {
            id: socket.userId,
            username: socket.username,
            avatar: socket.user?.avatar,
            displayName: socket.user?.displayName
          },
          friendshipId: data.friendshipId,
          timestamp: new Date()
        });
        
        console.log(`[Socket] Friend request notification sent from ${socket.username} to ${targetUser.username}`);
      } catch (error) {
        console.error('[Socket] Error sending friend request notification:', error);
      }
    });

    // Friend request accepted
    socket.on('friend:request:accept', async (data) => {
      if (!socket.userId) return;
      
      try {
        // Notify the original requester
        io.to(`user-${data.requesterId}`).emit('friend:request:accepted', {
          by: {
            id: socket.userId,
            username: socket.username,
            avatar: socket.user?.avatar,
            displayName: socket.user?.displayName
          },
          friendshipId: data.friendshipId,
          timestamp: new Date()
        });
        
        console.log(`[Socket] Friend request accepted notification sent by ${socket.username}`);
      } catch (error) {
        console.error('[Socket] Error sending accept notification:', error);
      }
    });
    
    // DM notification
    socket.on('dm:notify', async (data) => {
      if (!socket.userId) return;
      
      try {
        // Notify recipient of new message
        io.to(`user-${data.recipientId}`).emit('dm:new_message', {
          from: {
            id: socket.userId,
            username: socket.username,
            avatar: socket.user?.avatar,
            displayName: socket.user?.displayName
          },
          message: data.message,
          timestamp: new Date()
        });
        
        console.log(`[Socket] DM notification sent from ${socket.username} to user ${data.recipientId}`);
      } catch (error) {
        console.error('[Socket] Error sending DM notification:', error);
      }
    });
    
    // Call initiation
    socket.on('call:initiate', async (data) => {
      if (!socket.userId) return;
      try {
        const { targetUserId, type, callerName } = data;
        console.log(`[Socket] ${socket.username} initiating ${type} call to user ${targetUserId}`);
        
        const callData = {
          callerId: socket.userId.toString(),
          callerName: callerName || socket.username || socket.user?.username,
          type: type || 'voice',
          timestamp: new Date()
        };
        
        // Find target socket
        const targetSocketId = userSockets.get(targetUserId.toString());
        
        if (targetSocketId) {
          // Send directly to target socket
          io.to(targetSocketId).emit('call:incoming', callData);
          console.log(`[Socket] Call notification sent to ${targetUserId} at socket ${targetSocketId}`);
          
          // Confirm to caller
          socket.emit('call:initiated', { targetUserId, status: 'ringing' });
        } else {
          // User not online
          socket.emit('call:error', { message: 'User is not online' });
          console.log(`[Socket] User ${targetUserId} not online for call`);
        }
      } catch (error) {
        console.error('[Socket] Error initiating call:', error);
        socket.emit('call:error', { message: 'Failed to initiate call' });
      }
    });
    
    // Call accepted
    socket.on('call:accept', async (data) => {
      
      const { callerId, type } = data;
      console.log(`[Socket] ${socket.username} accepted call from ${callerId}`);
      
      // Notify the caller that call was accepted
      io.to(`user-${callerId}`).emit('call:accepted', {
        acceptedBy: socket.userId,
        acceptedByName: socket.username,
        type: type
      });
    });
    
    // Call rejected
    socket.on('call:reject', async (data) => {
      if (!socket.userId) return;
      
      const { callerId } = data;
      console.log(`[Socket] ${socket.username} rejected call from ${callerId}`);
      
      // Notify the caller that call was rejected
      io.to(`user-${callerId}`).emit('call:rejected', {
        rejectedBy: socket.userId,
        rejectedByName: socket.username
      });
    });
    
    // Call ended
    socket.on('call:end', async (data) => {
      if (!socket.userId) return;
      
      const { targetUserId } = data;
      console.log(`[Socket] ${socket.username} ended call with ${targetUserId}`);
      
      // Notify the other user that call ended
      io.to(`user-${targetUserId}`).emit('call:ended', {
        endedBy: socket.userId,
        endedByName: socket.username
      });
    });

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      if (socket.userId && socket.user) {
        console.log(`[Socket] User ${socket.username} disconnected:`, reason);
        
        // Update user status in MongoDB
        try {
          const user = await User.findById(socket.userId);
          if (user) {
            user.status = 'offline';
            user.lastSeen = new Date();
            await user.save();
          }
        } catch (error) {
          console.error('[Socket] Error updating user status:', error);
        }
        
        // Remove from active users
        activeUsers.delete(socket.userId);
        userSockets.delete(socket.userId);
        
        // Broadcast offline status
        socket.broadcast.emit('user:offline', {
          userId: socket.userId
        });
      } else {
        console.log('[Socket] Unauthenticated socket disconnected');
      }
    });
  });
};
