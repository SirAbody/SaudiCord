// Error Logging Route for Client-side Errors
const express = require('express');
const { authenticateToken, optionalAuth } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Log client-side errors
router.post('/log', optionalAuth, (req, res) => {
  const { message, stack, context, url, userAgent, timestamp } = req.body;
  
  logger.error('Client-side error', {
    message,
    stack,
    context,
    url,
    userAgent,
    timestamp,
    userId: req.userId || 'anonymous',
    ip: req.ip
  });

  res.json({ success: true });
});

// Get error logs (admin only)
router.get('/logs', authenticateToken, async (req, res) => {
  try {
    // Only allow admin users (you can implement admin check here)
    // For now, just return a message
    res.json({ 
      message: 'Error logs available in server logs',
      logsPath: 'server/logs/' 
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

module.exports = router;
