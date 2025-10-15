// Authentication Routes
const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const logger = require('../utils/logger');

const router = express.Router();

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET || 'saudicord-secret-key-2024',
    { expiresIn: '7d' }
  );
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, username, displayName, password, confirmPassword } = req.body;
    
    console.log('[AUTH] Registration attempt:', { email, username, displayName });
    logger.info('Registration attempt:', { email, username });

    // Validate input
    if (!username || !email || !password) {
      console.log('[AUTH] Missing required fields');
      return res.status(400).json({ 
        error: 'Username, email, and password are required' 
      });
    }
    
    // Check password match if confirmPassword is provided
    if (confirmPassword && password !== confirmPassword) {
      console.log('[AUTH] Passwords do not match');
      return res.status(400).json({ 
        error: 'Passwords do not match' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [{ username }, { email }]
      }
    });

    if (existingUser) {
      console.log('[AUTH] User already exists:', existingUser.username);
      return res.status(400).json({ 
        error: 'Username or email already exists' 
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user with all required fields
    const user = await User.create({
      email,
      username,
      displayName: displayName || username,
      password: hashedPassword,
      status: 'offline',
      avatar: null,
      bio: '',
      lastSeen: new Date()
    });

    // Generate token
    const token = generateToken(user.id);
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar
    };

    res.status(201).json({
      message: 'Registration successful',
      user: userData,
      token
    });
    
    logger.info('User registered successfully:', { 
      userId: user.id, 
      username: user.username 
    });
  } catch (error) {
    logger.error('Registration error:', error);
    res.status(500).json({ 
      error: 'Failed to register user',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('[AUTH] Login request body:', req.body);
    const { username, password } = req.body;

    // Validate input
    if (!username || !password) {
      console.log('[AUTH] Missing credentials:', { username: !!username, password: !!password });
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Find user by username or email
    const user = await User.findOne({
      where: {
        [require('sequelize').Op.or]: [
          { username },
          { email: username }
        ]
      }
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last seen
    await user.update({ lastSeen: new Date() });

    // Generate token
    const token = generateToken(user.id);

    // Return user data without password
    const userData = {
      id: user.id,
      username: user.username,
      email: user.email,
      displayName: user.displayName,
      avatar: user.avatar,
      status: user.status,
      bio: user.bio
    };

    res.json({
      message: 'Login successful',
      user: userData,
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Logout
router.post('/logout', authenticateToken, async (req, res) => {
  try {
    // Update user status
    await User.update(
      { status: 'offline', lastSeen: new Date() },
      { where: { id: req.userId } }
    );

    res.json({ message: 'Logout successful' });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Failed to logout' });
  }
});

// Rate limit storage for verify endpoint
const verifyRateLimit = new Map();

// Verify token
router.get('/verify', async (req, res) => {
  try {
    // Rate limiting - prevent spam
    const clientIP = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const lastCall = verifyRateLimit.get(clientIP) || 0;
    
    if (now - lastCall < 1000) { // Less than 1 second since last call
      console.log('[AUTH] Rate limit hit for IP:', clientIP);
      return res.status(429).json({ 
        valid: false, 
        error: 'Too many requests. Please wait.' 
      });
    }
    verifyRateLimit.set(clientIP, now);
    
    // Clean old entries every 100 requests
    if (verifyRateLimit.size > 100) {
      for (const [ip, time] of verifyRateLimit.entries()) {
        if (now - time > 60000) verifyRateLimit.delete(ip);
      }
    }
    
    // Debug logging (reduced)
    // console.log('[AUTH] Verify endpoint called');
    
    // Prevent caching of auth verification responses
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      console.log('[AUTH] No auth header provided');
      return res.json({ valid: false, message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      console.log('[AUTH] No token in header');
      return res.json({ valid: false, message: 'No token provided' });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret-key-2024');
    console.log('[AUTH] Token decoded for user:', decoded.userId);
    
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      console.log('[AUTH] User not found in database:', decoded.userId);
      return res.json({ valid: false, error: 'User not found' });
    }

    // console.log('[AUTH] User verified successfully:', user.username);
    res.json({ valid: true, user });
  } catch (error) {
    // console.error('[AUTH] Token verification error:', error.message);
    res.json({ valid: false, error: 'Invalid token' });
  }
});

// Refresh token
router.post('/refresh', authenticateToken, async (req, res) => {
  try {
    const token = generateToken(req.userId);
    res.json({ token });
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
