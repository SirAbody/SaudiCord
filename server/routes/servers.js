// Server Routes
const express = require('express');
const { Server, User, Channel } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');

const router = express.Router();

// Configure multer for server icon uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/servers/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `server-${req.params.id || uuidv4()}-${Date.now()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get user's servers
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [{
        model: Server,
        as: 'servers',
        include: [{
          model: Channel,
          as: 'channels',
          limit: 1 // Just get one channel for preview
        }]
      }]
    });

    res.json(user.servers || []);
  } catch (error) {
    console.error('Error fetching servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// Create a new server
router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }

    // Generate unique invite code
    const inviteCode = uuidv4().substring(0, 8);

    // Create server
    const server = await Server.create({
      name,
      description,
      ownerId: req.userId,
      inviteCode,
      isPublic: isPublic || false,
      memberCount: 1
    });

    // Add creator as member
    const user = await User.findByPk(req.userId);
    await server.addMember(user);

    // Create default channels
    const defaultChannels = [
      { name: 'general', type: 'text', position: 0 },
      { name: 'announcements', type: 'text', position: 1 },
      { name: 'General Voice', type: 'voice', position: 2 }
    ];

    for (const channelData of defaultChannels) {
      await Channel.create({
        ...channelData,
        serverId: server.id
      });
    }

    // Fetch complete server with channels
    const completeServer = await Server.findByPk(server.id, {
      include: [{
        model: Channel,
        as: 'channels'
      }]
    });

    res.status(201).json(completeServer);
  } catch (error) {
    console.error('Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Get server details
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id, {
      include: [
        {
          model: Channel,
          as: 'channels',
          order: [['position', 'ASC']]
        },
        {
          model: User,
          as: 'members',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status']
        }
      ]
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if user is member
    const isMember = server.members.some(m => m.id === req.userId);
    if (!isMember && server.ownerId !== req.userId && !server.isPublic) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(server);
  } catch (error) {
    console.error('Error fetching server:', error);
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

// Update server
router.patch('/:id', authenticateToken, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can update server' });
    }

    const updates = {};
    if (name) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (isPublic !== undefined) updates.isPublic = isPublic;

    await server.update(updates);

    res.json(server);
  } catch (error) {
    console.error('Error updating server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Upload server icon
router.post('/:id/icon', authenticateToken, upload.single('icon'), async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can update icon' });
    }

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const iconUrl = `/uploads/servers/${req.file.filename}`;
    await server.update({ icon: iconUrl });

    res.json({ icon: iconUrl });
  } catch (error) {
    console.error('Error uploading icon:', error);
    res.status(500).json({ error: 'Failed to upload icon' });
  }
});

// Join server by invite code
router.post('/join/:inviteCode', authenticateToken, async (req, res) => {
  try {
    const { inviteCode } = req.params;

    const server = await Server.findOne({ 
      where: { inviteCode },
      include: [{
        model: User,
        as: 'members',
        where: { id: req.userId },
        required: false
      }]
    });

    if (!server) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }

    // Check if already member
    if (server.members.length > 0) {
      return res.status(400).json({ error: 'Already a member of this server' });
    }

    // Add user as member
    const user = await User.findByPk(req.userId);
    await server.addMember(user);
    await server.increment('memberCount');

    res.json({ 
      message: 'Successfully joined server',
      server: {
        id: server.id,
        name: server.name,
        icon: server.icon
      }
    });
  } catch (error) {
    console.error('Error joining server:', error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Leave server
router.post('/:id/leave', authenticateToken, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId === req.userId) {
      return res.status(400).json({ error: 'Server owner cannot leave. Transfer ownership or delete the server.' });
    }

    const user = await User.findByPk(req.userId);
    await server.removeMember(user);
    await server.decrement('memberCount');

    res.json({ message: 'Successfully left server' });
  } catch (error) {
    console.error('Error leaving server:', error);
    res.status(500).json({ error: 'Failed to leave server' });
  }
});

// Delete server
router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can delete server' });
    }

    // Delete all channels
    await Channel.destroy({ where: { serverId: server.id } });
    
    // Delete server
    await server.destroy();

    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    console.error('Error deleting server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Get server invite link
router.get('/:id/invite', authenticateToken, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id, {
      include: [{
        model: User,
        as: 'members',
        where: { id: req.userId },
        required: false
      }]
    });

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    // Check if user is member or owner
    const isMember = server.members.length > 0 || server.ownerId === req.userId;
    if (!isMember) {
      return res.status(403).json({ error: 'Must be a member to get invite link' });
    }

    res.json({ 
      inviteCode: server.inviteCode,
      inviteLink: `${process.env.CLIENT_URL}/invite/${server.inviteCode}`
    });
  } catch (error) {
    console.error('Error getting invite:', error);
    res.status(500).json({ error: 'Failed to get invite link' });
  }
});

// Regenerate invite code
router.post('/:id/invite/regenerate', authenticateToken, async (req, res) => {
  try {
    const server = await Server.findByPk(req.params.id);

    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }

    if (server.ownerId !== req.userId) {
      return res.status(403).json({ error: 'Only server owner can regenerate invite code' });
    }

    const newInviteCode = uuidv4().substring(0, 8);
    await server.update({ inviteCode: newInviteCode });

    res.json({ 
      inviteCode: newInviteCode,
      inviteLink: `${process.env.CLIENT_URL}/invite/${newInviteCode}`
    });
  } catch (error) {
    console.error('Error regenerating invite:', error);
    res.status(500).json({ error: 'Failed to regenerate invite code' });
  }
});

module.exports = router;
