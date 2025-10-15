// Channel Routes with MongoDB
const express = require('express');
const router = express.Router();
const Channel = require('../schemas/Channel');
const Server = require('../schemas/Server');
const authenticateToken = require('../middleware/auth-mongodb');

// Get channels for a server
router.get('/server/:serverId', authenticateToken, async (req, res) => {
  try {
    // Validate serverId
    if (!req.params.serverId || req.params.serverId === 'undefined') {
      return res.status(400).json({ error: 'Invalid server ID' });
    }
    
    const server = await Server.findById(req.params.serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    // Check if user is member
    if (!server.isMember(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const channels = await Channel.find({ server: req.params.serverId })
      .sort({ position: 1, createdAt: 1 });
    
    res.json(channels);
  } catch (error) {
    console.error('[Channels] Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Create channel
router.post('/', auth, async (req, res) => {
  try {
    const { name, type, serverId, description } = req.body;
    
    if (!name || !serverId) {
      return res.status(400).json({ error: 'Name and server ID are required' });
    }
    
    const server = await Server.findById(serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is owner or has manage channels permission
    if (!server.isOwner(req.userId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Create channel
    const channel = new Channel({
      name: name.toLowerCase().replace(/\s+/g, '-'),
      type: type || 'text',
      description,
      server: serverId,
      position: server.channels.length
    });
    
    await channel.save();
    
    // Add channel to server
    server.channels.push(channel._id);
    await server.save();
    
    res.status(201).json(channel);
  } catch (error) {
    console.error('[Channels] Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Update channel
router.patch('/:channelId', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const server = await Server.findById(channel.server);
    
    // Check permissions
    if (!server.isOwner(req.userId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'topic', 'nsfw', 'rateLimitPerUser', 'userLimit', 'bitrate'];
    const updates = {};
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    Object.assign(channel, updates);
    await channel.save();
    
    res.json(channel);
  } catch (error) {
    console.error('[Channels] Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// Delete channel
router.delete('/:channelId', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const server = await Server.findById(channel.server);
    
    // Check permissions
    if (!server.isOwner(req.userId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Remove channel from server
    server.channels = server.channels.filter(c => c.toString() !== channel._id.toString());
    await server.save();
    
    // Delete channel
    await channel.deleteOne();
    
    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('[Channels] Error deleting channel:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

module.exports = router;
