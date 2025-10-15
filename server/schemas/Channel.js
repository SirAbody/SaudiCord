// Channel Schema for MongoDB
const mongoose = require('mongoose');

const channelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-_]+$/,
    minlength: 1,
    maxlength: 100
  },
  type: {
    type: String,
    enum: ['text', 'voice', 'announcement', 'stage'],
    default: 'text',
    required: true
  },
  description: {
    type: String,
    maxlength: 1024,
    default: ''
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  position: {
    type: Number,
    default: 0
  },
  topic: {
    type: String,
    maxlength: 1024,
    default: ''
  },
  nsfw: {
    type: Boolean,
    default: false
  },
  rateLimitPerUser: {
    type: Number,
    default: 0, // seconds
    min: 0,
    max: 21600 // 6 hours max
  },
  // Voice channel specific fields
  userLimit: {
    type: Number,
    default: 0, // 0 means unlimited
    min: 0,
    max: 99
  },
  bitrate: {
    type: Number,
    default: 64000, // 64kbps
    min: 8000,
    max: 384000
  },
  connectedUsers: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    isMuted: {
      type: Boolean,
      default: false
    },
    isDeafened: {
      type: Boolean,
      default: false
    },
    isVideo: {
      type: Boolean,
      default: false
    },
    isScreenSharing: {
      type: Boolean,
      default: false
    }
  }],
  // Permissions
  permissionOverrides: [{
    targetType: {
      type: String,
      enum: ['role', 'user'],
      required: true
    },
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    allow: {
      type: Number,
      default: 0
    },
    deny: {
      type: Number,
      default: 0
    }
  }],
  lastMessageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Message',
    default: null
  },
  lastMessageAt: {
    type: Date,
    default: null
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
  collection: 'channels'
});

// Indexes
channelSchema.index({ server: 1, name: 1 });
channelSchema.index({ server: 1, position: 1 });
channelSchema.index({ type: 1 });

// Join voice channel
channelSchema.methods.joinVoiceChannel = async function(userId) {
  // Check if user is already connected
  const isConnected = this.connectedUsers.some(u => u.user.toString() === userId.toString());
  
  if (!isConnected) {
    // Check user limit
    if (this.userLimit > 0 && this.connectedUsers.length >= this.userLimit) {
      throw new Error('Channel is full');
    }
    
    this.connectedUsers.push({
      user: userId,
      joinedAt: new Date()
    });
    
    await this.save();
  }
};

// Leave voice channel
channelSchema.methods.leaveVoiceChannel = async function(userId) {
  this.connectedUsers = this.connectedUsers.filter(u => u.user.toString() !== userId.toString());
  await this.save();
};

// Update user voice state
channelSchema.methods.updateVoiceState = async function(userId, updates) {
  const user = this.connectedUsers.find(u => u.user.toString() === userId.toString());
  if (user) {
    Object.assign(user, updates);
    await this.save();
  }
};

const Channel = mongoose.model('Channel', channelSchema);
module.exports = Channel;
