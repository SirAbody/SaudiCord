// Channel Routes
const express = require('express');
const { Channel, Server, User, Message } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

// Get all channels accessible by the current user
router.get('/', authenticateToken, async (req, res) => {
  try {
    // Get user's servers
    const user = await User.findByPk(req.userId, {
      include: [{
        model: Server,
        as: 'servers',
        include: [{
          model: Channel,
          as: 'channels'
        }]
      }]
    });

    // Flatten all channels from all servers
    const channels = [];
    if (user && user.servers) {
      user.servers.forEach(server => {
        if (server.channels) {
          server.channels.forEach(channel => {
            channels.push({
              id: channel.id,
              name: channel.name,
              type: channel.type,
              description: channel.description,
              serverId: server.id,
              serverName: server.name,
              position: channel.position
            });
          });
        }
      });
    }

    res.json(channels);
  } catch (error) {
    console.error('Error fetching user channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Get all channels for a server
router.get('/server/:serverId', authenticateToken, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Check if user is member of server
    const server = await Server.findByPk(serverId, {
      include: [{
        model: User,
        as: 'members',
        where: { id: req.userId },
        required: false
      }]
    });

    if (!server || (server.members.length === 0 && server.ownerId !== req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const channels = await Channel.findAll({
      where: { serverId },
      order: [['position', 'ASC'], ['createdAt', 'ASC']]
    });

    res.json(channels);
  } catch (error) {
    console.error('Error fetching channels:', error);
    res.status(500).json({ error: 'Failed to fetch channels' });
  }
});

// Create a new channel
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, type, description, serverId, isPrivate } = req.body;

    // Verify user is server owner or admin
    const server = await Server.findByPk(serverId);
    if (!server || server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can create channels' });
    }

    const channel = await Channel.create({
      name,
      type: type || 'text',
      description,
      serverId,
      isPrivate: isPrivate || false
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('Error creating channel:', error);
    res.status(500).json({ error: 'Failed to create channel' });
  }
});

// Get channel details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id, {
      include: [{
        model: Server,
        as: 'server',
        include: [{
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status']
        }]
      }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Check if user has access to channel
    const isMember = channel.server.members.some(m => m.id === req.userId);
    const isOwner = channel.server.ownerId === req.userId;

    if (!isMember && !isOwner) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(channel);
  } catch (error) {
    console.error('Error fetching channel:', error);
    res.status(500).json({ error: 'Failed to fetch channel' });
  }
});

// Update channel
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, topic, position } = req.body;
    
    const channel = await Channel.findByPk(req.params.id, {
      include: [{
        model: Server,
        as: 'server'
      }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Only server owner can update channels
    if (channel.server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can update channels' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (topic !== undefined) updates.topic = topic;
    if (position !== undefined) updates.position = position;

    await channel.update(updates);

    res.json(channel);
  } catch (error) {
    console.error('Error updating channel:', error);
    res.status(500).json({ error: 'Failed to update channel' });
  }
});

// Delete channel
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id, {
      include: [{
        model: Server,
        as: 'server'
      }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    // Only server owner can delete channels
    if (channel.server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can delete channels' });
    }

    await channel.destroy();

    res.json({ message: 'Channel deleted successfully' });
  } catch (error) {
    console.error('Error deleting channel:', error);
    res.status(500).json({ error: 'Failed to delete channel' });
  }
});

// Get channel members (for voice/video channels)
router.get('/:id/members', authenticateToken, async (req, res) => {
  try {
    const channel = await Channel.findByPk(req.params.id, {
      include: [{
        model: Server,
        as: 'server',
        include: [{
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status']
        }]
      }]
    });

    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }

    res.json(channel.server.members);
  } catch (error) {
    console.error('Error fetching channel members:', error);
    res.status(500).json({ error: 'Failed to fetch channel members' });
  }
});

// Create direct message channel between two users
router.post('/dm', authenticateToken, async (req, res) => {
  try {
    const { targetUserId } = req.body;

    if (targetUserId === req.userId) {
      return res.status(400).json({ error: 'Cannot create DM with yourself' });
    }

    // Check if DM channel already exists
    const existingChannel = await Channel.findOne({
      where: {
        type: 'text',
        isPrivate: true,
        name: {
          [Op.or]: [
            `dm-${req.userId}-${targetUserId}`,
            `dm-${targetUserId}-${req.userId}`
          ]
        }
      }
    });

    if (existingChannel) {
      return res.json(existingChannel);
    }

    // Create new DM channel
    const channel = await Channel.create({
      name: `dm-${req.userId}-${targetUserId}`,
      type: 'text',
      isPrivate: true,
      description: 'Direct Message'
    });

    res.status(201).json(channel);
  } catch (error) {
    console.error('Error creating DM channel:', error);
    res.status(500).json({ error: 'Failed to create DM channel' });
  }
});

module.exports = router;
