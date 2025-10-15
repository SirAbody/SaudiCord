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
      console.log(`[Auth] User not found: ${username}`);
      return res.status(401).json({
        error: 'Invalid username or password'
      });
    }
    
    // Verify password
    const isValidPassword = await user.comparePassword(password);
    
    if (!isValidPassword) {
      console.log(`[Auth] Invalid password for user: ${username}`);
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

// Verify token - FIXED TO NOT FAIL ON NETWORK ISSUES
router.get('/verify', async (req, res) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ valid: false, error: 'No token provided' });
    }
    
    // Verify token
    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (jwtError) {
      console.log('[Auth] JWT verification failed:', jwtError.message);
      return res.status(401).json({ valid: false, error: 'Invalid token' });
    }
    
    // Find user - but don't fail if DB is slow
    try {
      const user = await User.findById(decoded.userId);
      
      if (!user) {
        // User deleted? Token is technically valid but user doesn't exist
        return res.status(404).json({ valid: false, error: 'User not found' });
      }
      
      // Update last seen (non-blocking)
      user.updateLastSeen().catch(err => 
        console.log('[Auth] Failed to update last seen:', err)
      );
      
      // Return success with user data
      res.json({
        valid: true,
        user: user.toSafeObject()
      });
    } catch (dbError) {
      // Database error - but token is valid!
      console.error('[Auth] Database error during verify:', dbError);
      // Return basic user info from token since DB failed
      res.json({
        valid: true,
        user: {
          id: decoded.userId,
          _id: decoded.userId,
          username: decoded.username || 'User',
          email: decoded.email,
          isAdmin: decoded.isAdmin || false
        }
      });
    }
  } catch (error) {
    console.error('[Auth] Unexpected error during verification:', error);
    res.status(500).json({ valid: false, error: 'Server error' });
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
