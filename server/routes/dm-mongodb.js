// Direct Message Routes with MongoDB
const express = require('express');
const router = express.Router();
const DirectMessage = require('../schemas/DirectMessage');
const User = require('../schemas/User');
const Friendship = require('../schemas/Friendship');
const auth = require('../middleware/auth-mongodb');

// Get DM conversation with a user
router.get('/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Check if users are friends or not blocked
    const isBlocked = await Friendship.isBlocked(req.userId, targetUserId);
    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    // Get messages
    const messages = await DirectMessage.getConversation(
      req.userId,
      targetUserId,
      limit,
      skip
    );
    
    // Mark messages as read
    await DirectMessage.updateMany(
      {
        receiver: req.userId,
        sender: targetUserId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );
    
    res.json(messages);
  } catch (error) {
    console.error('[DM] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send DM (HTTP endpoint - backup for Socket.io)
router.post('/', auth, async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    
    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver and content are required' });
    }
    
    // Check if receiver exists
    const receiver = await User.findById(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if users are not blocked
    const isBlocked = await Friendship.isBlocked(req.userId, receiverId);
    if (isBlocked) {
      return res.status(403).json({ error: 'Cannot message this user' });
    }
    
    // Create conversation ID
    const conversationId = DirectMessage.createConversationId(req.userId, receiverId);
    
    // Create message
    const dm = new DirectMessage({
      content,
      sender: req.userId,
      receiver: receiverId,
      conversation: conversationId
    });
    
    await dm.save();
    
    // Populate sender info
    await dm.populate('sender', 'username displayName avatar');
    
    res.status(201).json(dm);
  } catch (error) {
    console.error('[DM] Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.patch('/read/:userId', auth, async (req, res) => {
  try {
    const result = await DirectMessage.updateMany(
      {
        sender: req.params.userId,
        receiver: req.userId,
        read: false
      },
      {
        read: true,
        readAt: new Date()
      }
    );
    
    res.json({ 
      message: 'Messages marked as read',
      count: result.modifiedCount
    });
  } catch (error) {
    console.error('[DM] Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Delete DM
router.delete('/:messageId', auth, async (req, res) => {
  try {
    const message = await DirectMessage.findById(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }
    
    // Check if user is the sender
    if (message.sender.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Cannot delete this message' });
    }
    
    // Soft delete
    message.deleted = true;
    message.deletedAt = new Date();
    message.content = '[Message deleted]';
    await message.save();
    
    res.json({ message: 'Message deleted' });
  } catch (error) {
    console.error('[DM] Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Get unread count
router.get('/unread/count', auth, async (req, res) => {
  try {
    const count = await DirectMessage.getUnreadCount(req.userId);
    res.json({ count });
  } catch (error) {
    console.error('[DM] Error getting unread count:', error);
    res.status(500).json({ error: 'Failed to get unread count' });
  }
});

module.exports = router;
