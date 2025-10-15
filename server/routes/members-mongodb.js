const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth-mongodb');
const Server = require('../schemas/Server');
const User = require('../schemas/User');
const ServerMember = require('../schemas/ServerMember');
const Role = require('../schemas/Role');

// Get all members of a server with roles
router.get('/servers/:serverId/members', auth, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Check if user is member of this server
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Get all server members with populated user data
    const members = await ServerMember.find({ server: serverId })
      .populate('user', 'username displayName avatar status bio customStatus activity')
      .populate('roles');
    
    // Format member data
    const formattedMembers = await Promise.all(members.map(async (member) => {
      const user = member.user;
      
      // Get role details
      const memberRoles = await Role.find({ 
        _id: { $in: member.roles || [] } 
      });
      
      return {
        _id: user._id,
        id: user._id,
        username: user.username,
        displayName: user.displayName || user.username,
        avatar: user.avatar,
        status: user.status || 'offline',
        bio: user.bio,
        customStatus: user.customStatus,
        activity: user.activity,
        roles: memberRoles,
        joinedAt: member.joinedAt,
        isOwner: server.owner.toString() === user._id.toString(),
        isMuted: member.isMuted,
        isDeafened: member.isDeafened,
        isBot: user.isBot || false
      };
    }));
    
    // Sort by role priority and status
    formattedMembers.sort((a, b) => {
      // Owner first
      if (a.isOwner) return -1;
      if (b.isOwner) return 1;
      
      // Then by highest role priority
      const aMaxPriority = Math.min(...(a.roles.map(r => r.priority || 999)), 999);
      const bMaxPriority = Math.min(...(b.roles.map(r => r.priority || 999)), 999);
      
      if (aMaxPriority !== bMaxPriority) {
        return aMaxPriority - bMaxPriority;
      }
      
      // Then by online status
      const statusOrder = { online: 0, idle: 1, dnd: 2, offline: 3 };
      const aStatus = statusOrder[a.status] || 3;
      const bStatus = statusOrder[b.status] || 3;
      
      if (aStatus !== bStatus) {
        return aStatus - bStatus;
      }
      
      // Finally by name
      return a.displayName.localeCompare(b.displayName);
    });
    
    res.json(formattedMembers);
  } catch (error) {
    console.error('Error fetching server members:', error);
    res.status(500).json({ error: 'Failed to fetch server members' });
  }
});

// Get server roles
router.get('/servers/:serverId/roles', auth, async (req, res) => {
  try {
    const { serverId } = req.params;
    
    // Check if server exists
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    // Get all roles for this server
    let roles = await Role.find({ server: serverId })
      .sort('priority');
    
    // If no roles exist, create default roles
    if (roles.length === 0) {
      const defaultRoles = [
        {
          name: 'Admin',
          server: serverId,
          color: '#ff0000',
          position: 1,
          permissions: {
            administrator: true
          }
        },
        {
          name: 'Moderator',
          server: serverId,
          color: '#00ff00',
          position: 2,
          permissions: {
            manageMessages: true,
            kickMembers: true,
            banMembers: true,
            muteMembers: true,
            deafenMembers: true
          }
        },
        {
          name: 'Member',
          server: serverId,
          color: '#808080',
          position: 3,
          permissions: {
            sendMessages: true,
            viewChannels: true,
            connect: true,
            speak: true
          }
        }
      ];
      
      roles = await Role.insertMany(defaultRoles);
      
      // Assign Admin role to server owner
      await ServerMember.findOneAndUpdate(
        { server: serverId, user: server.owner },
        { $addToSet: { roles: roles[0]._id } }
      );
    }
    
    res.json(roles);
  } catch (error) {
    console.error('Error fetching server roles:', error);
    res.status(500).json({ error: 'Failed to fetch server roles' });
  }
});

// Create a new role
router.post('/servers/:serverId/roles', auth, async (req, res) => {
  try {
    const { serverId } = req.params;
    const { name, color, priority, permissions } = req.body;
    
    // Check if user is server owner or admin
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.owner.toString() !== req.userId) {
      // Check if user has admin role
      const member = await ServerMember.findOne({ 
        server: serverId, 
        user: req.userId 
      }).populate('roles');
      
      const isAdmin = member?.roles?.some(role => 
        role.permissions?.includes('ADMINISTRATOR')
      );
      
      if (!isAdmin) {
        return res.status(403).json({ error: 'Only server owner or admins can create roles' });
      }
    }
    
    // Create role
    const role = new Role({
      name,
      server: serverId,
      color: color || '#808080',
      priority: priority || 999,
      permissions: permissions || ['SEND_MESSAGES', 'READ_MESSAGES'],
      createdBy: req.userId
    });
    
    await role.save();
    res.status(201).json(role);
  } catch (error) {
    console.error('Error creating role:', error);
    res.status(500).json({ error: 'Failed to create role' });
  }
});

// Assign role to member
router.post('/servers/:serverId/members/:userId/roles', auth, async (req, res) => {
  try {
    const { serverId, userId } = req.params;
    const { roleId } = req.body;
    
    // Check permissions
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.owner.toString() !== req.userId) {
      const member = await ServerMember.findOne({ 
        server: serverId, 
        user: req.userId 
      }).populate('roles');
      
      const canManageRoles = member?.roles?.some(role => 
        role.permissions?.includes('ADMINISTRATOR') || 
        role.permissions?.includes('MANAGE_ROLES')
      );
      
      if (!canManageRoles) {
        return res.status(403).json({ error: 'Insufficient permissions to manage roles' });
      }
    }
    
    // Assign role
    await ServerMember.findOneAndUpdate(
      { server: serverId, user: userId },
      { $addToSet: { roles: roleId } }
    );
    
    res.json({ message: 'Role assigned successfully' });
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// Remove role from member
router.delete('/servers/:serverId/members/:userId/roles/:roleId', auth, async (req, res) => {
  try {
    const { serverId, userId, roleId } = req.params;
    
    // Check permissions (same as assign)
    const server = await Server.findById(serverId);
    if (!server) {
      return res.status(404).json({ error: 'Server not found' });
    }
    
    if (server.owner.toString() !== req.userId) {
      const member = await ServerMember.findOne({ 
        server: serverId, 
        user: req.userId 
      }).populate('roles');
      
      const canManageRoles = member?.roles?.some(role => 
        role.permissions?.includes('ADMINISTRATOR') || 
        role.permissions?.includes('MANAGE_ROLES')
      );
      
      if (!canManageRoles) {
        return res.status(403).json({ error: 'Insufficient permissions to manage roles' });
      }
    }
    
    // Remove role
    await ServerMember.findOneAndUpdate(
      { server: serverId, user: userId },
      { $pull: { roles: roleId } }
    );
    
    res.json({ message: 'Role removed successfully' });
  } catch (error) {
    console.error('Error removing role:', error);
    res.status(500).json({ error: 'Failed to remove role' });
  }
});

module.exports = router;
