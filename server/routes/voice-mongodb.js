// Voice/Video Call Routes with MongoDB
const express = require('express');
const router = express.Router();
const VoiceCall = require('../schemas/VoiceCall');
const Channel = require('../schemas/Channel');
const auth = require('../middleware/auth-mongodb');

// Get ICE servers configuration
router.get('/ice-servers', auth, (req, res) => {
  res.json({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun3.l.google.com:19302' },
      { urls: 'stun:stun4.l.google.com:19302' },
      { urls: 'stun:stun.stunprotocol.org:3478' },
      { urls: 'stun:stun.services.mozilla.com:3478' },
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  });
});

// Start a voice call
router.post('/call/start', auth, async (req, res) => {
  try {
    const { type, channelId, targetUserId } = req.body;
    
    // Create new call record
    const call = new VoiceCall({
      type: type || 'voice',
      channel: channelId || null,
      initiator: req.userId,
      participants: [{
        user: req.userId,
        joinedAt: new Date()
      }]
    });
    
    // If it's a DM call, add the target user
    if (targetUserId) {
      call.participants.push({
        user: targetUserId,
        joinedAt: null // Will be set when they join
      });
    }
    
    await call.save();
    
    res.status(201).json({
      callId: call._id,
      type: call.type,
      status: call.status
    });
  } catch (error) {
    console.error('[Voice] Error starting call:', error);
    res.status(500).json({ error: 'Failed to start call' });
  }
});

// Join a call
router.post('/call/:callId/join', auth, async (req, res) => {
  try {
    const call = await VoiceCall.findById(req.params.callId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    if (call.status !== 'active') {
      return res.status(400).json({ error: 'Call is not active' });
    }
    
    await call.addParticipant(req.userId);
    
    res.json({ message: 'Joined call successfully' });
  } catch (error) {
    console.error('[Voice] Error joining call:', error);
    res.status(500).json({ error: 'Failed to join call' });
  }
});

// Leave a call
router.post('/call/:callId/leave', auth, async (req, res) => {
  try {
    const call = await VoiceCall.findById(req.params.callId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    await call.removeParticipant(req.userId);
    
    res.json({ message: 'Left call successfully' });
  } catch (error) {
    console.error('[Voice] Error leaving call:', error);
    res.status(500).json({ error: 'Failed to leave call' });
  }
});

// End a call
router.post('/call/:callId/end', auth, async (req, res) => {
  try {
    const call = await VoiceCall.findById(req.params.callId);
    
    if (!call) {
      return res.status(404).json({ error: 'Call not found' });
    }
    
    // Check if user is the initiator
    if (call.initiator.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Only call initiator can end the call' });
    }
    
    await call.endCall();
    
    res.json({ message: 'Call ended successfully' });
  } catch (error) {
    console.error('[Voice] Error ending call:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get active calls for user
router.get('/calls/active', auth, async (req, res) => {
  try {
    const calls = await VoiceCall.getActiveCalls(req.userId);
    res.json(calls);
  } catch (error) {
    console.error('[Voice] Error fetching active calls:', error);
    res.status(500).json({ error: 'Failed to fetch active calls' });
  }
});

// Get call history
router.get('/calls/history', auth, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    
    const calls = await VoiceCall.find({
      'participants.user': req.userId,
      status: { $in: ['ended', 'missed', 'declined'] }
    })
    .populate('participants.user', 'username displayName avatar')
    .populate('initiator', 'username displayName avatar')
    .sort({ startedAt: -1 })
    .limit(limit);
    
    res.json(calls);
  } catch (error) {
    console.error('[Voice] Error fetching call history:', error);
    res.status(500).json({ error: 'Failed to fetch call history' });
  }
});

// Get voice channel users
router.get('/channel/:channelId/users', auth, async (req, res) => {
  try {
    const channel = await Channel.findById(req.params.channelId)
      .populate('connectedUsers.user', 'username displayName avatar');
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const users = channel.connectedUsers.map(cu => ({
      id: cu.user._id,
      username: cu.user.username,
      displayName: cu.user.displayName,
      avatar: cu.user.avatar,
      isMuted: cu.isMuted,
      isDeafened: cu.isDeafened,
      isVideo: cu.isVideo,
      isScreenSharing: cu.isScreenSharing,
      joinedAt: cu.joinedAt
    }));
    
    res.json(users);
  } catch (error) {
    console.error('[Voice] Error fetching channel users:', error);
    res.status(500).json({ error: 'Failed to fetch channel users' });
  }
});

// Update voice state
router.patch('/channel/:channelId/state', auth, async (req, res) => {
  try {
    const { isMuted, isDeafened, isVideo, isScreenSharing } = req.body;
    
    const channel = await Channel.findById(req.params.channelId);
    
    if (!channel) {
      return res.status(404).json({ error: 'Channel not found' });
    }
    
    const updates = {};
    if (isMuted !== undefined) updates.isMuted = isMuted;
    if (isDeafened !== undefined) updates.isDeafened = isDeafened;
    if (isVideo !== undefined) updates.isVideo = isVideo;
    if (isScreenSharing !== undefined) updates.isScreenSharing = isScreenSharing;
    
    await channel.updateVoiceState(req.userId, updates);
    
    res.json({ message: 'Voice state updated' });
  } catch (error) {
    console.error('[Voice] Error updating voice state:', error);
    res.status(500).json({ error: 'Failed to update voice state' });
  }
});

module.exports = router;
