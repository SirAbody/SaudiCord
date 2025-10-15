// Authentication Routes with MongoDB
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../schemas/User');

const JWT_SECRET = process.env.JWT_SECRET || 'saudicord-secret-key-2024';

// Generate JWT token
function generateToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      username: user.username,
      email: user.email,
      isAdmin: user.isAdmin
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

// Register
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, displayName } = req.body;
    
    // Validate input
    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Username, email, and password are required'
      });
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });
    
    if (existingUser) {
      return res.status(409).json({
        error: existingUser.username === username.toLowerCase() 
          ? 'Username already taken' 
          : 'Email already registered'
      });
    }
    
    // Create new user
    const user = new User({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      displayName: displayName || username
    });
    
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Return user data
    res.status(201).json({
      token,
      user: user.toSafeObject()
    });
    
    console.log(`[Auth] New user registered: ${username}`);
  } catch (error) {
    console.error('[Auth] Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    // Validate input
    if (!username || !password) {
      return res.status(400).json({
        error: 'Username and password are required'
      });
    }
    
    // Find user
    const user = await User.findOne({
      $or: [
        { username: username.toLowerCase() },
        { email: username.toLowerCase() }
      ]
    });
    
    if (!user) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // Verify password
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // Update last seen
    await user.updateLastSeen();
    
    // Generate token
    const token = generateToken(user);
    
    // Return user data
    res.json({
      token,
      user: user.toSafeObject()
    });
    
    console.log(`[Auth] User logged in: ${username}`);
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Find user
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update last seen
    await user.updateLastSeen();
    
    // Return user data
    res.json({
      user: user.toSafeObject()
    });
  } catch (error) {
    console.error('[Auth] Token verification error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Logout (just for tracking)
router.post('/logout', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId);
      
      if (user) {
        user.status = 'offline';
        user.lastSeen = new Date();
        await user.save();
      }
    }
    
    res.json({ message: 'Logged out successfully' });
  } catch (error) {
    res.json({ message: 'Logged out' });
  }
});

module.exports = router;
