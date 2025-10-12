// Message Routes
const express = require('express');
const { Message, User, Channel, Server } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/attachments/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|txt|zip|mp3|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    
    if (extname) {
      return cb(null, true);
    } else {
      cb(new Error('File type not allowed'));
    }
  }
});

// Get messages for a channel
router.get('/channel/:channelId', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;
    const { limit = 50, before, after } = req.query;

    // Verify user has access to channel
    const channel = await Channel.findByPk(channelId, {
      include: [{
        model: Server,
        as: 'server',
        include: [{
          model: User,
          as: 'members',
          where: { id: req.userId },
          required: false
        }]
      }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if it's a DM channel or user is member of server
    const isDM = channel.isPrivate && channel.name.startsWith('dm-');
    if (!isDM && channel.server) {
      const isMember = channel.server.members.length > 0 || channel.server.ownerId === req.userId;
      if (!isMember) {
        return res.status(403).json({ error: 'Access denied' });
      }
    }

    // Build query
    const where = { channelId };
    if (before) {
      where.createdAt = { [require('sequelize').Op.lt]: new Date(before) };
    }
    if (after) {
      where.createdAt = { [require('sequelize').Op.gt]: new Date(after) };
    }

    const messages = await Message.findAll({
      where,
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'displayName', 'avatar']
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit)
    });

    res.json(messages.reverse()); // Reverse to get chronological order
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message (backup for when WebSocket fails)
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { channelId, content, type = 'text' } = req.body;

    // Verify user has access to channel
    const channel = await Channel.findByPk(channelId);
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    const message = await Message.create({
      content,
      type,
      channelId,
      userId: req.userId
    });

    const messageWithAuthor = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'displayName', 'avatar']
      }]
    });

    res.status(201).json(messageWithAuthor);
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Upload attachment
router.post('/upload', authenticateToken, upload.array('files', 5), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const attachments = req.files.map(file => ({
      filename: file.originalname,
      url: `/uploads/attachments/${file.filename}`,
      size: file.size,
      type: file.mimetype
    }));

    res.json({ attachments });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Failed to upload files' });
  }
});

// Edit message
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.userId !== req.userId) {
      return res.status(403).json({ error: 'Can only edit your own messages' });
    }

    await message.update({
      content,
      edited: true,
      editedAt: new Date()
    });

    const updatedMessage = await Message.findByPk(message.id, {
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'displayName', 'avatar']
      }]
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error editing message:', error);
    res.status(500).json({ error: 'Failed to edit message' });
  }
});

// Delete message
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.userId !== req.userId) {
      // Check if user is server owner
      const channel = await Channel.findByPk(message.channelId, {
        include: [{
          model: Server,
          as: 'server'
        }]
      });

      if (!channel.server || channel.server.ownerId !== req.userId) {
        return res.status(403).json({ error: 'Permission denied' });
      }
    }

    await message.destroy(); // Soft delete

    res.json({ message: 'Message deleted successfully' });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({ error: 'Failed to delete message' });
  }
});

// Add reaction to message
router.post('/:id/reactions', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.body;
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = message.reactions || {};
    if (!reactions[emoji]) {
      reactions[emoji] = [];
    }

    if (!reactions[emoji].includes(req.userId)) {
      reactions[emoji].push(req.userId);
    }

    await message.update({ reactions });

    res.json({ reactions });
  } catch (error) {
    console.error('Error adding reaction:', error);
    res.status(500).json({ error: 'Failed to add reaction' });
  }
});

// Remove reaction from message
router.delete('/:id/reactions/:emoji', authenticateToken, async (req, res) => {
  try {
    const { emoji } = req.params;
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    const reactions = message.reactions || {};
    if (reactions[emoji]) {
      reactions[emoji] = reactions[emoji].filter(id => id !== req.userId);
      if (reactions[emoji].length === 0) {
        delete reactions[emoji];
      }
    }

    await message.update({ reactions });

    res.json({ reactions });
  } catch (error) {
    console.error('Error removing reaction:', error);
    res.status(500).json({ error: 'Failed to remove reaction' });
  }
});

// Pin/unpin message
router.post('/:id/pin', authenticateToken, async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    await message.update({ isPinned: !message.isPinned });

    res.json({ isPinned: message.isPinned });
  } catch (error) {
    console.error('Error toggling pin:', error);
    res.status(500).json({ error: 'Failed to toggle pin' });
  }
});

// Get pinned messages for a channel
router.get('/channel/:channelId/pinned', authenticateToken, async (req, res) => {
  try {
    const { channelId } = req.params;

    const messages = await Message.findAll({
      where: { 
        channelId,
        isPinned: true
      },
      include: [{
        model: User,
        as: 'author',
        attributes: ['id', 'username', 'displayName', 'avatar']
      }],
      order: [['createdAt', 'DESC']]
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching pinned messages:', error);
    res.status(500).json({ error: 'Failed to fetch pinned messages' });
  }
});

module.exports = router;
