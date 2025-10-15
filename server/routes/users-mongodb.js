// User Routes with MongoDB
const express = require('express');
const router = express.Router();
const User = require('../schemas/User');
const auth = require('../middleware/auth-mongodb');

// Get current user profile
router.get('/me', auth, async (req, res) => {
  try {
    res.json(req.user.toSafeObject());
  } catch (error) {
    console.error('[Users] Error fetching profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/me', auth, async (req, res) => {
  try {
    const allowedUpdates = ['displayName', 'bio', 'avatar', 'banner', 'customStatus'];
    const updates = {};
    
    for (const field of allowedUpdates) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }
    
    Object.assign(req.user, updates);
    await req.user.save();
    
    res.json(req.user.toSafeObject());
  } catch (error) {
    console.error('[Users] Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Get user by ID
router.get('/:userId', auth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
      .select('-password -email');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user);
  } catch (error) {
    console.error('[Users] Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Search users
router.get('/search/:query', auth, async (req, res) => {
  try {
    const users = await User.find({
      $or: [
        { username: new RegExp(req.params.query, 'i') },
        { displayName: new RegExp(req.params.query, 'i') }
      ]
    })
    .select('username displayName avatar status')
    .limit(20);
    
    res.json(users);
  } catch (error) {
    console.error('[Users] Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

module.exports = router;
