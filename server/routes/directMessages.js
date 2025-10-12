// Direct Messages Routes
const express = require('express');
const { DirectMessage, User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');
const logger = require('../utils/logger');

const router = express.Router();

// Get messages with a specific user
router.get('/dm/:userId', authenticateToken, async (req, res) => {
  try {
    const messages = await DirectMessage.findAll({
      where: {
        [Op.or]: [
          { senderId: req.userId, receiverId: req.params.userId },
          { senderId: req.params.userId, receiverId: req.userId }
        ]
      },
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'displayName', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'displayName', 'avatar'] }
      ],
      order: [['createdAt', 'ASC']],
      limit: 100
    });

    res.json(messages);
  } catch (error) {
    logger.error('Error fetching direct messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a direct message
router.post('/dm', authenticateToken, async (req, res) => {
  try {
    const { receiverId, content, messageType = 'text' } = req.body;

    if (!receiverId || !content) {
      return res.status(400).json({ error: 'Receiver ID and content are required' });
    }

    // Check if receiver exists
    const receiver = await User.findByPk(receiverId);
    if (!receiver) {
      return res.status(404).json({ error: 'Receiver not found' });
    }

    // Create message
    const message = await DirectMessage.create({
      senderId: req.userId,
      receiverId,
      content,
      messageType
    });

    // Fetch complete message with user details
    const fullMessage = await DirectMessage.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'displayName', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'displayName', 'avatar'] }
      ]
    });

    // Emit socket event to receiver
    const io = req.app.get('io');
    io.to(`user-${receiverId}`).emit('dm:receive', fullMessage);

    res.json(fullMessage);
  } catch (error) {
    logger.error('Error sending direct message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Mark messages as read
router.put('/dm/read/:userId', authenticateToken, async (req, res) => {
  try {
    await DirectMessage.update(
      { isRead: true },
      {
        where: {
          senderId: req.params.userId,
          receiverId: req.userId,
          isRead: false
        }
      }
    );

    res.json({ message: 'Messages marked as read' });
  } catch (error) {
    logger.error('Error marking messages as read:', error);
    res.status(500).json({ error: 'Failed to mark messages as read' });
  }
});

// Delete a message (soft delete)
router.delete('/dm/:messageId', authenticateToken, async (req, res) => {
  try {
    const message = await DirectMessage.findByPk(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can delete their own message
    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to delete this message' });
    }

    await message.destroy();
    
    // Notify receiver about deleted message
    const io = req.app.get('io');
    io.to(`user-${message.receiverId}`).emit('dm:deleted', { messageId: message.id });

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Edit a message
router.put('/dm/:messageId', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await DirectMessage.findByPk(req.params.messageId);
    
    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    // Only sender can edit their own message
    if (message.senderId !== req.userId) {
      return res.status(403).json({ error: 'Unauthorized to edit this message' });
    }

    message.content = content;
    message.editedAt = new Date();
    await message.save();

    const updatedMessage = await DirectMessage.findByPk(message.id, {
      include: [
        { model: User, as: 'sender', attributes: ['id', 'username', 'displayName', 'avatar'] },
        { model: User, as: 'receiver', attributes: ['id', 'username', 'displayName', 'avatar'] }
      ]
    });

    // Notify receiver about edited message
    const io = req.app.get('io');
    io.to(`user-${message.receiverId}`).emit('dm:edited', updatedMessage);

    res.json(updatedMessage);
  } catch (error) {
    logger.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

module.exports = router;
