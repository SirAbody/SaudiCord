// Server Routes with MongoDB
const express = require('express');
const router = express.Router();
const Server = require('../schemas/Server');
const Channel = require('../schemas/Channel');
const Role = require('../schemas/Role');
const User = require('../schemas/User');
const auth = require('../middleware/auth-mongodb');

// Get user's servers
router.get('/me', auth, async (req, res) => {
  try {
    const servers = await Server.find({
      'members.user': req.userId
    })
    .populate('owner', 'username displayName avatar')
    .populate('channels')
    .select('-bans');
    
    res.json(servers);
  } catch (error) {
    console.error('[Servers] Error fetching servers:', error);
    res.status(500).json({ error: 'Failed to fetch servers' });
  }
});

// Create new server
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, isPublic } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Server name is required' });
    }
    
    // Create server
    const server = new Server({
      name,
      description,
      owner: req.userId,
      isPublic: isPublic || false
    });
    
    // Generate invite code
    server.generateInviteCode();
    
    // Add owner as member (don't save yet)
    server.members.push({
      user: req.userId,
      joinedAt: new Date(),
      roles: []
    });
    
    // Create default channels
    const generalChannel = new Channel({
      name: 'general',
      type: 'text',
      server: server._id,
      position: 0
    });
    await generalChannel.save();
    
    const voiceChannel = new Channel({
      name: 'general-voice',
      type: 'voice',
      server: server._id,
      position: 1
    });
    await voiceChannel.save();
    
    // Update server with channels
    server.channels.push(generalChannel._id, voiceChannel._id);
    server.settings.defaultChannel = generalChannel._id;
    
    // Create default roles
    const everyoneRole = await Role.createDefaultRole(server._id);
    const adminRole = await Role.createAdminRole(server._id);
    
    server.roles.push(everyoneRole._id, adminRole._id);
    
    // Save server once with all data
    await server.save();
    
    // Add server to user's server list
    await User.findByIdAndUpdate(req.userId, {
      $push: { servers: server._id }
    });
    
    // Populate and return
    await server.populate('owner', 'username displayName avatar');
    await server.populate('channels');
    
    res.status(201).json(server);
  } catch (error) {
    console.error('[Servers] Error creating server:', error);
    res.status(500).json({ error: 'Failed to create server' });
  }
});

// Get server by ID
router.get('/:serverId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId)
      .populate('owner', 'username displayName avatar')
      .populate('channels')
      .populate('members.user', 'username displayName avatar status');
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is member
    if (!server.isMember(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    res.json(server);
  } catch (error) {
    console.error('[Servers] Error fetching server:', error);
    res.status(500).json({ error: 'Failed to fetch server' });
  }
});

// Update server settings
router.patch('/:serverId', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is owner or admin
    if (!server.isOwner(req.userId)) {
      return res.status(403).json({ error: 'Only server owner can update settings' });
    }
    
    // Update allowed fields
    const allowedUpdates = ['name', 'description', 'icon', 'banner', 'isPublic'];
    const updates = {};
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    Object.assign(server, updates);
    await server.save();
    
    res.json(server);
  } catch (error) {
    console.error('[Servers] Error updating server:', error);
    res.status(500).json({ error: 'Failed to update server' });
  }
});

// Generate invite code for server
router.post('/:serverId/invite', auth, async (req, res) => {
  try {
    const server = await Server.findById(req.params.serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is member
    if (!server.isMember(req.userId)) {
      return res.status(403).json({ error: 'You must be a member to create invites' });
    }
    
    // Generate new invite code if doesn't exist or requested
    if (!server.inviteCode || req.body.regenerate) {
      server.generateInviteCode();
      await server.save();
    }
    
    res.json({ 
      code: server.inviteCode,
      url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/invite/${server.inviteCode}`
    });
  } catch (error) {
    console.error('[Servers] Error generating invite:', error);
    res.status(500).json({ error: 'Failed to generate invite' });
  }
});

// Delete server
router.delete('/:serverId', auth, async (req, res) => {
  try {
    // Validate server ID
    if (!req.params.serverId || req.params.serverId === 'undefined') {
      return res.status(400).json({ error: 'Invalid server ID' });
    }
    
    const server = await Server.findById(req.params.serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is owner
    if (!server.isOwner(req.userId)) {
      return res.status(403).json({ error: 'Only server owner can delete server' });
    }
    
    // Delete all channels
    await Channel.deleteMany({ server: server._id });
    
    // Delete all roles
    await Role.deleteMany({ server: server._id });
    
    // Remove server from all users
    await User.updateMany(
      { servers: server._id },
      { $pull: { servers: server._id } }
    );
    
    // Delete server
    await server.deleteOne();
    
    res.json({ message: 'Server deleted successfully' });
  } catch (error) {
    console.error('[Servers] Error deleting server:', error);
    res.status(500).json({ error: 'Failed to delete server' });
  }
});

// Get server members
router.get('/:serverId/members', auth, async (req, res) => {
  try {
    // Validate serverId
    if (!req.params.serverId || req.params.serverId === 'undefined' || req.params.serverId === 'null') {
      return res.status(400).json({ error: 'Invalid server ID' });
    }
    
    const server = await Server.findById(req.params.serverId)
      .populate('members.user', 'username displayName avatar status lastSeen bio');
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user is member
    if (!server.isMember(req.userId)) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const members = server.members.map(m => ({
      id: m.user._id,
      ...m.user.toObject(),
      joinedAt: m.joinedAt,
      nickname: m.nickname,
      roles: m.roles
    }));
    
    res.json(members);
  } catch (error) {
    console.error('[Servers] Error fetching members:', error);
    res.status(500).json({ error: 'Failed to fetch members' });
  }
});

// Kick member
router.delete('/:serverId/members/:memberId', auth, async (req, res) => {
  try {
    // Validate serverId
    if (!req.params.serverId || req.params.serverId === 'undefined' || req.params.serverId === 'null') {
      return res.status(400).json({ error: 'Invalid server ID' });
    }
    
    const server = await Server.findById(req.params.serverId);
    
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Check if user has permission to kick
    if (!server.isOwner(req.userId)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    
    // Cannot kick owner
    if (server.isOwner(req.params.memberId)) {
      return res.status(400).json({ error: 'Cannot kick server owner' });
    }
    
    // Remove member
    await server.removeMember(req.params.memberId);
    
    // Remove server from user's list
    await User.findByIdAndUpdate(req.params.memberId, {
      $pull: { servers: server._id }
    });
    
    res.json({ message: 'Member kicked successfully' });
  } catch (error) {
    console.error('[Servers] Error kicking member:', error);
    res.status(500).json({ error: 'Failed to kick member' });
  }
});

// Join server by invite code
router.post('/join/:inviteCode', auth, async (req, res) => {
  try {
    const server = await Server.findOne({ inviteCode: req.params.inviteCode });
    
    if (!server) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    // Check if already member
    if (server.isMember(req.userId)) {
      return res.status(400).json({ error: 'Already a member of this server' });
    }
    
    // Add member
    await server.addMember(req.userId);
    
    // Add server to user's list
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { servers: server._id }
    });
    
    // Populate and return
    await server.populate('owner', 'username displayName avatar');
    await server.populate('channels');
    
    res.json(server);
  } catch (error) {
    console.error('[Servers] Error joining server:', error);
    res.status(500).json({ error: 'Failed to join server' });
  }
});

// Get server invite info
router.get('/invite/:inviteCode/info', async (req, res) => {
  try {
    const server = await Server.findOne({ inviteCode: req.params.inviteCode })
      .select('name description icon memberCount')
      .populate('owner', 'username displayName avatar');
    
    if (!server) {
      return res.status(404).json({ error: 'Invalid invite code' });
    }
    
    res.json({
      name: server.name,
      description: server.description,
      icon: server.icon,
      ownerName: server.owner.displayName || server.owner.username,
      memberCount: server.members.length
    });
  } catch (error) {
    console.error('[Servers] Error fetching invite info:', error);
    res.status(500).json({ error: 'Failed to fetch invite info' });
  }
});

// Get server roles
router.get('/:serverId/roles', auth, async (req, res) => {
  try {
    // Validate serverId
    if (!req.params.serverId || req.params.serverId === 'undefined' || req.params.serverId === 'null') {
      return res.status(400).json({ error: 'Invalid server ID' });
    }
    
    const roles = await Role.find({ server: req.params.serverId })
      .sort({ position: 1 });
    
    res.json(roles);
  } catch (error) {
    console.error('[Servers] Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

module.exports = router;
