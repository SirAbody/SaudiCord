// Voice Call Schema for MongoDB
const mongoose = require('mongoose');

const voiceCallSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['voice', 'video', 'screen_share'],
    required: true
  },
  channel: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    default: null // null for DM calls
  },
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    joinedAt: {
      type: Date,
      default: Date.now
    },
    leftAt: {
      type: Date,
      default: null
    },
    duration: {
      type: Number,
      default: 0 // in seconds
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
  initiator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date,
    default: null
  },
  duration: {
    type: Number,
    default: 0 // in seconds
  },
  status: {
    type: String,
    enum: ['active', 'ended', 'missed', 'declined'],
    default: 'active'
  },
  recordingUrl: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  collection: 'voicecalls'
});

// Indexes
voiceCallSchema.index({ channel: 1 });
voiceCallSchema.index({ 'participants.user': 1 });
voiceCallSchema.index({ initiator: 1 });
voiceCallSchema.index({ status: 1 });

// Add participant to call
voiceCallSchema.methods.addParticipant = async function(userId) {
  const exists = this.participants.some(p => p.user.toString() === userId.toString());
  if (!exists) {
    this.participants.push({
      user: userId,
      joinedAt: new Date()
    });
    await this.save();
  }
};

// Remove participant from call
voiceCallSchema.methods.removeParticipant = async function(userId) {
  const participant = this.participants.find(p => p.user.toString() === userId.toString());
  if (participant) {
    participant.leftAt = new Date();
    participant.duration = Math.floor((participant.leftAt - participant.joinedAt) / 1000);
    
    // Check if all participants have left
    const activeParticipants = this.participants.filter(p => !p.leftAt);
    if (activeParticipants.length === 0) {
      this.endCall();
    }
    
    await this.save();
  }
};

// End the call
voiceCallSchema.methods.endCall = async function() {
  this.endedAt = new Date();
  this.duration = Math.floor((this.endedAt - this.startedAt) / 1000);
  this.status = 'ended';
  
  // Set left time for all active participants
  this.participants.forEach(participant => {
    if (!participant.leftAt) {
      participant.leftAt = this.endedAt;
      participant.duration = Math.floor((participant.leftAt - participant.joinedAt) / 1000);
    }
  });
  
  await this.save();
};

// Get active calls for a user
voiceCallSchema.statics.getActiveCalls = async function(userId) {
  return await this.find({
    'participants.user': userId,
    status: 'active'
  }).populate('participants.user', 'username displayName avatar');
};

const VoiceCall = mongoose.model('VoiceCall', voiceCallSchema);
module.exports = VoiceCall;
