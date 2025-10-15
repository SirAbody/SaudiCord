// Server Schema for MongoDB
const mongoose = require('mongoose');

const serverSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    minlength: 2,
    maxlength: 100
  },
  description: {
    type: String,
    maxlength: 500,
    default: ''
  },
  icon: {
    type: String,
    default: null
  },
  banner: {
    type: String,
    default: null
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  inviteCode: {
    type: String,
    unique: true,
    sparse: true
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  members: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    roles: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Role'
    }],
    joinedAt: {
      type: Date,
      default: Date.now
    },
    nickname: String
  }],
  channels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel'
  }],
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  bans: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    bannedAt: {
      type: Date,
      default: Date.now
    },
    bannedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  settings: {
    defaultChannel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel'
    },
    systemChannel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel'
    },
    afkChannel: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Channel'
    },
    afkTimeout: {
      type: Number,
      default: 300 // 5 minutes
    },
    verificationLevel: {
      type: String,
      enum: ['none', 'low', 'medium', 'high', 'highest'],
      default: 'low'
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  collection: 'servers'
});

// Indexes
serverSchema.index({ owner: 1 });
serverSchema.index({ inviteCode: 1 });
serverSchema.index({ 'members.user': 1 });

// Generate unique invite code
serverSchema.methods.generateInviteCode = function() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  this.inviteCode = code;
  return code;
};

// Add member to server
serverSchema.methods.addMember = async function(userId) {
  const memberExists = this.members.some(m => m.user.toString() === userId.toString());
  if (!memberExists) {
    this.members.push({
      user: userId,
      joinedAt: new Date()
    });
    await this.save();
  }
};

// Remove member from server
serverSchema.methods.removeMember = async function(userId) {
  this.members = this.members.filter(m => m.user.toString() !== userId.toString());
  await this.save();
};

// Check if user is member
serverSchema.methods.isMember = function(userId) {
  return this.members.some(m => m.user.toString() === userId.toString());
};

// Check if user is owner
serverSchema.methods.isOwner = function(userId) {
  return this.owner.toString() === userId.toString();
};

const Server = mongoose.model('Server', serverSchema);
module.exports = Server;
