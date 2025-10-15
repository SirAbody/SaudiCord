// Voice Call Routes
// Made With Love By SirAbody

const express = require('express');
const router = express.Router();

// Simple logger
const logger = {
  info: (...args) => console.log('[VOICE]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[VOICE ERROR]', new Date().toISOString(), ...args)
};
// Get available STUN/TURN servers
router.get('/ice-servers', (req, res) => {
  res.json({
    iceServers: [
      {
        urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302']
      },
      {
        urls: 'stun:stun.stunprotocol.org:3478'
      },
      {
        urls: 'stun:stun.services.mozilla.com:3478'
      },
      // Free TURN servers for better connectivity
      {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      },
      {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject'
      }
    ]
  });
});
router.post('/call/start', (req, res) => {
  try {
    const { callerId, receiverId, type } = req.body;
    
    const callSession = {
      id: Date.now().toString(),
      callerId,
      receiverId,
      type: type || 'voice',
      startedAt: new Date(),
      status: 'pending'
    };
    
    logger.info('Voice call started:', callSession);
    
    res.json({
      success: true,
      callSession
    });
  } catch (error) {
    logger.error('Error starting call:', error);
    res.status(500).json({ error: 'Failed to start call' });
  }
});

// End a voice call
router.post('/call/end', (req, res) => {
  try {
    const { callId } = req.body;
    
    logger.info('Voice call ended:', callId);
    
    res.json({
      success: true,
      message: 'Call ended successfully'
    });
  } catch (error) {
    logger.error('Error ending call:', error);
    res.status(500).json({ error: 'Failed to end call' });
  }
});

// Get call status
router.get('/call/:callId/status', (req, res) => {
  try {
    const { callId } = req.params;
    
    res.json({
      callId,
      status: 'active',
      duration: 0
    });
  } catch (error) {
    logger.error('Error getting call status:', error);
    res.status(500).json({ error: 'Failed to get call status' });
  }
});

module.exports = router;
