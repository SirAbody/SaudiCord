// Message Routes with MongoDB
const express = require('express');
const router = express.Router();
const Message = require('../schemas/Message');
const Channel = require('../schemas/Channel');
const Server = require('../schemas/Server');
const auth = require('../middleware/auth-mongodb');

// Get messages for a channel
router.get('/channel/:channelId', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const server = await Server.findById(channel.server);
    
    // Check if user is member
    if (!server.isMember(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const limit = parseInt(req.query.limit) || 50;
    const skip = parseInt(req.query.skip) || 0;
    
    const messages = await Message.find({ 
      channel: req.params.channelId,
      deleted: false
    })
    .populate('author', 'username displayName avatar')
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
    
    // Reverse to get chronological order
    messages.reverse();
    
    res.json(messages);
  } catch (error) {
    console.error('[Messages] Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

module.exports = router;
