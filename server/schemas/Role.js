// Role Schema for MongoDB
const mongoose = require('mongoose');

const roleSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 100
  },
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  color: {
    type: String,
    default: '#99AAB5' // Discord default role color
  },
  hoist: {
    type: Boolean,
    default: false // Display role members separately
  },
  position: {
    type: Number,
    default: 0
  },
  permissions: {
    administrator: { type: Boolean, default: false },
    manageServer: { type: Boolean, default: false },
    manageRoles: { type: Boolean, default: false },
    manageChannels: { type: Boolean, default: false },
    kickMembers: { type: Boolean, default: false },
    banMembers: { type: Boolean, default: false },
    createInvite: { type: Boolean, default: true },
    changeNickname: { type: Boolean, default: true },
    manageNicknames: { type: Boolean, default: false },
    manageEmojis: { type: Boolean, default: false },
    manageWebhooks: { type: Boolean, default: false },
    viewChannels: { type: Boolean, default: true },
    sendMessages: { type: Boolean, default: true },
    sendTTSMessages: { type: Boolean, default: false },
    manageMessages: { type: Boolean, default: false },
    embedLinks: { type: Boolean, default: true },
    attachFiles: { type: Boolean, default: true },
    readMessageHistory: { type: Boolean, default: true },
    mentionEveryone: { type: Boolean, default: false },
    useExternalEmojis: { type: Boolean, default: true },
    addReactions: { type: Boolean, default: true },
    connect: { type: Boolean, default: true },
    speak: { type: Boolean, default: true },
    video: { type: Boolean, default: true },
    muteMembers: { type: Boolean, default: false },
    deafenMembers: { type: Boolean, default: false },
    moveMembers: { type: Boolean, default: false },
    useVoiceActivity: { type: Boolean, default: true },
    prioritySpeaker: { type: Boolean, default: false },
    stream: { type: Boolean, default: true },
    viewAuditLog: { type: Boolean, default: false }
  },
  mentionable: {
    type: Boolean,
    default: false
  },
  isDefault: {
    type: Boolean,
    default: false // @everyone role
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
  collection: 'roles'
});

// Indexes
roleSchema.index({ server: 1, position: 1 });
roleSchema.index({ server: 1, name: 1 });

// Check if role has permission
roleSchema.methods.hasPermission = function(permission) {
  return this.permissions.administrator || this.permissions[permission];
};

// Create default @everyone role for server
roleSchema.statics.createDefaultRole = async function(serverId) {
  return await this.create({
    name: '@everyone',
    server: serverId,
    isDefault: true,
    position: 0,
    permissions: {
      viewChannels: true,
      sendMessages: true,
      embedLinks: true,
      attachFiles: true,
      readMessageHistory: true,
      useExternalEmojis: true,
      addReactions: true,
      connect: true,
      speak: true,
      video: true,
      useVoiceActivity: true,
      stream: true,
      createInvite: true,
      changeNickname: true
    }
  });
};

// Create admin role
roleSchema.statics.createAdminRole = async function(serverId) {
  return await this.create({
    name: 'Admin',
    server: serverId,
    color: '#E74C3C',
    hoist: true,
    position: 100,
    permissions: {
      administrator: true
    }
  });
};

const Role = mongoose.model('Role', roleSchema);
module.exports = Role;
