const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth-mongodb');

// Store active voice sessions
const voiceSessions = new Map();

// Join voice channel
router.post('/join', auth, async (req, res) => {
  try {
    const { channelId, serverId } = req.body;
    const userId = req.userId;
    
    // Add user to voice session
    if (!voiceSessions.has(channelId)) {
      voiceSessions.set(channelId, new Set());
    }
    
    voiceSessions.get(channelId).add(userId);
    
    res.json({ 
      success: true, 
      participants: Array.from(voiceSessions.get(channelId))
    });
  } catch (error) {
    console.error('Error joining voice channel:', error);
    res.status(500).json({ error: 'Failed to join voice channel' });
  }
});

// Leave voice channel
router.post('/leave', auth, async (req, res) => {
  try {
    const { channelId } = req.body;
    const userId = req.userId;
    
    // Remove user from voice session
    if (voiceSessions.has(channelId)) {
      voiceSessions.get(channelId).delete(userId);
      
      // Clean up empty sessions
      if (voiceSessions.get(channelId).size === 0) {
        voiceSessions.delete(channelId);
      }
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving voice channel:', error);
    res.status(500).json({ error: 'Failed to leave voice channel' });
  }
});

// Get participants in channel
router.get('/participants/:channelId', auth, async (req, res) => {
  try {
    const { channelId } = req.params;
    const participants = voiceSessions.has(channelId) 
      ? Array.from(voiceSessions.get(channelId))
      : [];
    
    res.json({ participants });
  } catch (error) {
    console.error('Error getting participants:', error);
    res.status(500).json({ error: 'Failed to get participants' });
  }
});

module.exports = router;
