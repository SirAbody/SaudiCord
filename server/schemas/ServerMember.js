const mongoose = require('mongoose');

const serverMemberSchema = new mongoose.Schema({
  server: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Server',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roles: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Role'
  }],
  nickname: {
    type: String,
    maxLength: 32
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
  permissions: [{
    type: String
  }]
}, {
  timestamps: true
});

// Compound index to ensure a user can only be in a server once
serverMemberSchema.index({ server: 1, user: 1 }, { unique: true });

// Instance methods
serverMemberSchema.methods.hasPermission = function(permission) {
  // Check if member has specific permission
  if (this.permissions && this.permissions.includes(permission)) {
    return true;
  }
  
  // Check role permissions
  if (this.roles && this.roles.length > 0) {
    return this.roles.some(role => 
      role.permissions && role.permissions.includes(permission)
    );
  }
  
  return false;
};

serverMemberSchema.methods.hasRole = function(roleId) {
  return this.roles && this.roles.some(role => 
    role._id.toString() === roleId.toString()
  );
};

module.exports = mongoose.model('ServerMember', serverMemberSchema);
