// Friends Routes
const express = require('express');
const { User, Friendship, DirectMessage } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const router = express.Router();

// Get all friends and friend requests
router.get('/', authenticateToken, async (req, res) => {
  try {
    const friendships = await Friendship.findAll({
      where: {
        [Op.or]: [
          { userId: req.userId },
          { friendId: req.userId }
        ]
      },
      include: [
        { model: User, as: 'user', attributes: ['id', 'username', 'displayName', 'avatar', 'status'] },
        { model: User, as: 'friend', attributes: ['id', 'username', 'displayName', 'avatar', 'status'] },
        { model: User, as: 'initiator', attributes: ['id', 'username'] }
      ]
    });

    // Transform to get the actual friend data
    const friends = friendships.map(friendship => {
      const isSender = friendship.userId === req.userId;
      const friend = isSender ? friendship.friend : friendship.user;
      return {
        id: friend.id,
        friendshipId: friendship.id,
        username: friend.username,
        displayName: friend.displayName,
        avatar: friend.avatar,
        status: friend.status,
        friendshipStatus: friendship.status,
        initiatedBy: friendship.initiatedBy,
        createdAt: friendship.createdAt
      };
    });

    res.json(friends);
  } catch (error) {
    logger.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Send friend request
router.post('/request', authenticateToken, async (req, res) => {
  try {
    const { username } = req.body;
    
    // Find user by username
    const friend = await User.findOne({ where: { username } });
    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (friend.id === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.userId, friendId: friend.id },
          { userId: friend.id, friendId: req.userId }
        ]
      }
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'blocked') {
        return res.status(400).json({ error: 'Cannot send friend request to blocked user' });
      }
      return res.status(400).json({ error: 'Friend request already exists or you are already friends' });
    }

    // Create friend request
    const friendship = await Friendship.create({
      userId: req.userId,
      friendId: friend.id,
      status: 'pending',
      initiatedBy: req.userId
    });

    const user = await User.findByPk(req.userId);
    
    // Emit socket event to notify the friend
    const io = req.app.get('io');
    io.to(`user-${friend.id}`).emit('friend:request', {
      friendshipId: friendship.id,
      userId: user.id,
      username: user.username,
      displayName: user.displayName
    });

    res.json({ message: 'Friend request sent successfully', friendship });
  } catch (error) {
    logger.error('Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/accept/:friendshipId', authenticateToken, async (req, res) => {
  try {
    const friendship = await Friendship.findByPk(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }

    // Verify the user is the recipient of the friend request
    if (friendship.friendId !== req.userId && friendship.userId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to accept this friend request' });
    }

    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request already processed' });
    }

    // Accept the friend request
    friendship.status = 'accepted';
    await friendship.save();

    const friend = await User.findByPk(
      friendship.userId === req.userId ? friendship.friendId : friendship.userId
    );

    // Notify the sender
    const io = req.app.get('io');
    io.to(`user-${friend.id}`).emit('friend:accepted', {
      friendshipId: friendship.id,
      userId: req.userId
    });

    res.json({ message: 'Friend request accepted', friendship });
  } catch (error) {
    logger.error('Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Block user
router.post('/block/:userId', authenticateToken, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Find existing friendship
    const friendship = await Friendship.findOne({
      where: {
        [Op.or]: [
          { userId: req.userId, friendId: targetUserId },
          { userId: targetUserId, friendId: req.userId }
        ]
      }
    });

    if (friendship) {
      friendship.status = 'blocked';
      friendship.initiatedBy = req.userId; // Track who blocked
      await friendship.save();
    } else {
      // Create new blocked relationship
      await Friendship.create({
        userId: req.userId,
        friendId: targetUserId,
        status: 'blocked',
        initiatedBy: req.userId
      });
    }

    res.json({ message: 'User blocked successfully' });
  } catch (error) {
    logger.error('Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Remove friend or decline request
router.delete('/:friendshipId', authenticateToken, async (req, res) => {
  try {
    const friendship = await Friendship.findByPk(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }

    // Verify the user is part of this friendship
    if (friendship.userId !== req.userId && friendship.friendId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to remove this friendship' });
    }

    await friendship.destroy();
    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    logger.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Get conversations (users with messages)
router.get('/conversations', authenticateToken, async (req, res) => {
  try {
    // Get all users that have messages with the current user
    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: req.userId },
          { receiverId: req.userId }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'displayName', 'avatar', 'status'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'displayName', 'avatar', 'status'] }
      ],
      order: [['createdAt', 'DESC']]
      // Removed GROUP BY - will handle unique conversations in code
    });

    // Extract unique users
    const conversationUsers = new Map();
    messages.forEach(msg => {
      const otherUser = msg.senderId === req.userId ? msg.receiver : msg.sender;
      if (!conversationUsers.has(otherUser.id)) {
        conversationUsers.set(otherUser.id, {
          ...otherUser.toJSON(),
          lastMessage: msg.content,
          lastMessageTime: msg.createdAt
        });
      }
    });

    res.json(Array.from(conversationUsers.values()));
  } catch (error) {
    logger.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
