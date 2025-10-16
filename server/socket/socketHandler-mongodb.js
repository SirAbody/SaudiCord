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
    
    // Immediate auth if token exists in handshake
    if (socket.userId && socket.username) {
      // Already authenticated
      // Store in memory maps - use string ID for consistency
      const userIdStr = socket.userId || socket.userIdString;
      activeUsers.set(userIdStr, socket.user);
      userSockets.set(userIdStr, socket);
      userSockets.set(socket.userId.toString(), socket);
      
      // Join user room
      socket.join(`user-${socket.userId}`);
      socket.join(`user-${socket.userId.toString()}`);
      
      // Emit auth success
      socket.emit('auth:success', {
        userId: socket.userId,
        username: socket.username
      });
      
      console.log(`[Socket] User ${socket.username} auto-authenticated`);
    }

    // Handle authentication
    socket.on('authenticate', async (token) => {
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret-key-2024');
        
        // Fetch user from MongoDB
        const user = await User.findById(decoded.userId);
        
        if (user) {
          socket.user = user;
          socket.userId = user._id.toString();
          socket.userIdString = user._id.toString();
          socket.username = user.username;
          
          user.status = 'online';
          await user.save();
          
          // Store in active users and sockets map
          activeUsers.set(socket.userId, user.toSafeObject());
          userSockets.set(socket.userId.toString(), socket);
          console.log(`[Socket] Stored socket for user ${socket.userId}`);
      
          // Join user room for DMs and notifications - MUST BE INSIDE IF BLOCK
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

    // Send direct message - ENHANCED FOR REAL-TIME
    socket.on('dm:send', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const { receiverId, content, tempId } = data;
        
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

        // Find all receiver's sockets (they might have multiple sessions)
        const receiverSocketIds = [];
        activeUsers.forEach((userData, userId) => {
          if (userId === receiverId.toString()) {
            // Find all sockets for this user
            io.sockets.sockets.forEach((sock, sockId) => {
              if (sock.userId === receiverId.toString()) {
                receiverSocketIds.push(sockId);
              }
            });
          }
        });
        
        // Check if receiver is online and in room
        const receiverRoom = `user-${receiverId.toString()}`;
        const roomSockets = io.sockets.adapter.rooms.get(receiverRoom);
        console.log(`[Socket] Receiver room ${receiverRoom} has ${roomSockets ? roomSockets.size : 0} connections`);
        
        // Send to receiver using room (all their sessions will get it once)
        io.to(receiverRoom).emit('dm:receive', messageData);
        console.log(`[Socket] DM sent to receiver room: ${receiverRoom}`);
        
        // Send to sender's other sessions (not current socket)
        socket.to(`user-${socket.userId}`).emit('dm:receive', messageData);
        
        // Send confirmation to sender with tempId
        socket.emit('dm:sent', {
          ...messageData,
          tempId: tempId || data.tempId,
          confirmed: true
        });
        
        console.log(`[Socket] DM sent from ${socket.userId} to ${receiverId}`);
      } catch (error) {
        console.error('[Socket] Error sending DM:', error);
        socket.emit('dm:error', { 
          message: 'Failed to send message',
          tempId: data.tempId,
          error: error.message
        });
      }
    });

    // Join voice channel
    socket.on('voice:join', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const { channelId, serverId } = data;
        console.log(`[Socket] User ${socket.userId} joining voice channel ${channelId}`);
        
        // Join voice room
        const voiceRoom = `voice-${channelId}`;
        socket.join(voiceRoom);
        
        // Get existing participants in the room
        const roomSockets = io.sockets.adapter.rooms.get(voiceRoom);
        const participants = [];
        
        if (roomSockets) {
          for (const socketId of roomSockets) {
            const participantSocket = io.sockets.sockets.get(socketId);
            if (participantSocket && participantSocket.userId !== socket.userId) {
              participants.push({
                id: participantSocket.userId,
                username: participantSocket.username,
                socketId: socketId
              });
            }
          }
        }
        
        // Notify existing participants about new user
        socket.to(voiceRoom).emit('voice:user-joined', {
          user: {
            id: socket.userId,
            username: socket.username,
            socketId: socket.id
          }
        });
        
        // Send existing participants to new user
        socket.emit('voice:existing-participants', {
          participants
        });
        
        console.log(`[Socket] User ${socket.userId} joined voice channel with ${participants.length} existing participants`);
        
        // Store voice channel for user
        socket.voiceChannelId = channelId;
      } catch (error) {
        console.error('[Socket] Error joining voice channel:', error);
        socket.emit('error', { message: 'Failed to join voice channel' });
      }
    });

    // Leave voice channel
    socket.on('voice:leave', async (data) => {
      try {
        const { channelId } = data;
        const voiceRoom = `voice-${channelId}`;
        
        // Leave the room
        socket.leave(voiceRoom);
        
        // Notify others in the channel
        socket.to(voiceRoom).emit('voice:user-left', {
          userId: socket.userId
        });
        
        // Clear voice channel from socket
        socket.voiceChannelId = null;
        
        console.log(`[Socket] User ${socket.userId} left voice channel ${channelId}`);
      } catch (error) {
        console.error('[Socket] Error leaving voice channel:', error);
      }
    });
    
    // WebRTC Signaling - Offer
    socket.on('voice:offer', (data) => {
      const { to, offer } = data;
      console.log(`[Socket] Relaying offer from ${socket.userId} to ${to}`);
      
      // Find target socket - check multiple ID formats for MongoDB compatibility
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => {
          const sId = s.userId?.toString();
          const toId = to?.toString();
          return sId === toId || s.userId === to || s.userIdString === to;
        });
      
      if (targetSocket) {
        targetSocket.emit('voice:offer', {
          from: socket.userId,
          offer: offer
        });
      } else {
        console.log(`[Socket] Target socket not found for user ${to}`);
      }
    });
    
    // WebRTC Signaling - Answer
    socket.on('voice:answer', (data) => {
      const { to, answer } = data;
      console.log(`[Socket] Relaying answer from ${socket.userId} to ${to}`);
      
      // Find target socket
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === to);
      
      if (targetSocket) {
        targetSocket.emit('voice:answer', {
          from: socket.userId,
          answer: answer
        });
      }
    });
    
    // WebRTC Signaling - ICE Candidate
    socket.on('voice:ice-candidate', (data) => {
      const { to, candidate } = data;
      console.log(`[Socket] Relaying ICE candidate from ${socket.userId} to ${to}`);
      
      // Find target socket
      const targetSocket = Array.from(io.sockets.sockets.values())
        .find(s => s.userId === to);
      
      if (targetSocket) {
        targetSocket.emit('voice:ice-candidate', {
          from: socket.userId,
          candidate: candidate
        });
      }
    });
    
    // Mute/Unmute status
    socket.on('voice:mute-status', (data) => {
      const { channelId, isMuted } = data;
      const voiceRoom = `voice-${channelId}`;
      
      // Notify others in the channel
      socket.to(voiceRoom).emit('voice:user-status', {
        userId: socket.userId,
        isMuted: isMuted
      });
    });
    
    // Deafen status
    socket.on('voice:deafen-status', (data) => {
      const { channelId, isDeafened, isMuted } = data;
      const voiceRoom = `voice-${channelId}`;
      
      // Notify others in the channel
      socket.to(voiceRoom).emit('voice:user-status', {
        userId: socket.userId,
        isDeafened: isDeafened,
        isMuted: isMuted
      });
    });
    
    // Handle WebRTC offer for DM calls
    socket.on('webrtc:offer', (data) => {
      const { targetUserId, offer } = data;
      console.log(`[Socket] WebRTC offer from ${socket.userId} to ${targetUserId}`);
      
      // Try multiple ways to find the target socket
      let targetSocket = userSockets.get(targetUserId?.toString());
      
      // If not found, try without toString
      if (!targetSocket) {
        targetSocket = userSockets.get(targetUserId);
      }
      
      if (targetSocket) {
        console.log(`[Socket] Found target socket for ${targetUserId}`);
        targetSocket.emit('webrtc:offer', {
          senderId: socket.userId,
          userId: socket.userId, // Keep for backwards compatibility
          offer
        });
      } else {
        console.log(`[Socket] Target socket not found for ${targetUserId}`);
        // Try to find socket by iterating
        const targetSocketFromAll = Array.from(io.sockets.sockets.values())
          .find(s => s.userId?.toString() === targetUserId?.toString());
        
        if (targetSocketFromAll) {
          targetSocketFromAll.emit('webrtc:offer', {
            senderId: socket.userId,
            userId: socket.userId,
            offer
          });
        }
      }
    });
    
    // Handle WebRTC answer
    socket.on('webrtc:answer', (data) => {
      const { targetUserId, answer } = data;
      console.log(`[Socket] WebRTC answer from ${socket.userId} to ${targetUserId}`);
      
      let targetSocket = userSockets.get(targetUserId?.toString());
      if (!targetSocket) {
        targetSocket = userSockets.get(targetUserId);
      }
      
      if (targetSocket) {
        targetSocket.emit('webrtc:answer', {
          senderId: socket.userId,
          userId: socket.userId, // Keep for backwards compatibility
          answer
        });
      } else {
        // Try to find socket by iterating
        const targetSocketFromAll = Array.from(io.sockets.sockets.values())
          .find(s => s.userId?.toString() === targetUserId?.toString());
        
        if (targetSocketFromAll) {
          targetSocketFromAll.emit('webrtc:answer', {
            senderId: socket.userId,
            userId: socket.userId,
            answer
          });
        }
      }
    });
    
    // Handle ICE candidates
    socket.on('webrtc:ice-candidate', (data) => {
      if (!socket.userId) return;
      
      const { targetUserId, candidate } = data;
      let targetSocket = userSockets.get(targetUserId?.toString());
      
      if (!targetSocket) {
        targetSocket = userSockets.get(targetUserId);
      }
      
      if (targetSocket) {
        targetSocket.emit('webrtc:ice-candidate', {
          senderId: socket.userId,
          userId: socket.userId,
          candidate
        });
      } else {
        console.log(`[Socket] Target socket not found for ICE candidate to ${targetUserId}`);
        // Try to find socket by iterating
        const targetSocketFromAll = Array.from(io.sockets.sockets.values())
          .find(s => s.userId?.toString() === targetUserId?.toString());
        
        if (targetSocketFromAll) {
          targetSocketFromAll.emit('webrtc:ice-candidate', {
            senderId: socket.userId,
            userId: socket.userId,
            candidate
          });
        }
      }
    });
    
    // Leave voice channel
    socket.on('voice:leave', async (data) => {
      if (!socket.userId) return;

      try {
        const { channelId } = data;
        
        // Check if channelId is valid
        if (!channelId || channelId === 'undefined') {
          console.log(`[Socket] Invalid channelId received from ${socket.username}`);
          return;
        }
        
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
        
        console.log(`[Socket] User ${socket.username} left voice channel ${channel?.name || channelId}`);
      } catch (error) {
        console.error('[Socket] Error leaving voice channel:', error);
      }
    });

    // REMOVED DUPLICATE - Already handled above

    // REMOVED DUPLICATE - ICE candidate handler already exists above

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

    // ============ CALL SYSTEM HANDLERS ============
    // Initiate call
    socket.on('call:initiate', async (data) => {
      if (!socket.userId || !socket.user) {
        socket.emit('error', { message: 'Not authenticated' });
        return;
      }

      try {
        const { targetUserId, callType, type, callerName } = data;
        const callTypeToUse = callType || type || 'voice';
        console.log(`[Socket] ${socket.username} initiating ${callTypeToUse} call to user ${targetUserId}`);
        
        // Find target user's socket(s)
        const targetSocketIds = [];
        io.sockets.sockets.forEach((sock, sockId) => {
          if (sock.userId === targetUserId || sock.userId === targetUserId.toString()) {
            targetSocketIds.push(sockId);
          }
        });
        
        if (targetSocketIds.length > 0) {
          // Send to user room once (all sessions will get it)
          const callData = {
            callerId: socket.userId,
            callerName: callerName || socket.username,
            type: callTypeToUse,
            timestamp: new Date()
          };
          
          io.to(`user-${targetUserId}`).emit('call:incoming', callData);
          console.log(`[Socket] Call notification sent to user ${targetUserId}`);
        } else {
          socket.emit('call:user-offline', {
            message: 'User is offline',
            targetUserId
          });
        }
      } catch (error) {
        console.error('[Socket] Error initiating call:', error);
        socket.emit('error', { message: 'Failed to initiate call' });
      }
    });

    // Accept call
    socket.on('call:accept', async (data) => {
      if (!socket.userId) return;
      
      const { callerId } = data;
      console.log(`[Socket] ${socket.username} accepted call from ${callerId}`);
      
      // Notify caller
      io.to(`user-${callerId}`).emit('call:accepted', {
        acceptedBy: socket.userId,
        acceptedByName: socket.username
      });
    });

    // Reject call
    socket.on('call:reject', async (data) => {
      if (!socket.userId) return;
      
      const { callerId } = data;
      console.log(`[Socket] ${socket.username} rejected call from ${callerId}`);
      
      // Notify caller
      io.to(`user-${callerId}`).emit('call:rejected', {
        rejectedBy: socket.userId,
        rejectedByName: socket.username
      });
    });

    // End call
    socket.on('call:end', async (data) => {
      if (!socket.userId) return;
      
      const { targetUserId } = data;
      console.log(`[Socket] ${socket.username} ended call with ${targetUserId}`);
      
      // Notify other party
      io.to(`user-${targetUserId}`).emit('call:ended', {
        endedBy: socket.userId,
        endedByName: socket.username
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
    
    // Duplicate handlers removed - already defined above

    // Handle disconnection
    socket.on('disconnect', async (reason) => {
      if (socket.userId && socket.user) {
        console.log(`[Socket] User ${socket.user.username} disconnected:`, reason);
        
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
