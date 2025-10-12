// Simple Authentication Routes (Without Database)
// Made With Love By SirAbody

const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const router = express.Router();

// In-memory user storage (for testing without database)
const users = new Map();

// Add default users
async function initDefaultUsers() {
  const adminPassword = await bcrypt.hash('admin509', 10);
  const lionPassword = await bcrypt.hash('Lion509', 10);
  
  users.set('admin', {
    id: '1',
    username: 'admin',
    email: 'admin@saudicord.com',
    displayName: 'Administrator',
    password: adminPassword,
    avatar: null,
    status: 'online',
    createdAt: new Date()
  });
  
  users.set('Liongtas', {
    id: '2',
    username: 'Liongtas',
    email: 'liongtas@saudicord.com',
    displayName: 'Lion',
    password: lionPassword,
    avatar: null,
    status: 'online',
    createdAt: new Date()
  });
  
  console.log('[AUTH] Default users initialized:', Array.from(users.keys()));
}

initDefaultUsers();

// Generate JWT token
const generateToken = (userId, username) => {
  return jwt.sign(
    { userId, username },
    process.env.JWT_SECRET || 'saudicord-secret',
    { expiresIn: '7d' }
  );
};

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ 
    message: 'Auth routes working',
    users: Array.from(users.keys())
  });
});

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, username, displayName, password, confirmPassword } = req.body;
    
    console.log('[AUTH] Registration attempt:', { email, username });

    // Validate input
    if (!username || !email || !password || !confirmPassword) {
      return res.status(400).json({ 
        error: 'All fields are required' 
      });
    }
    
    // Check password match
    if (password !== confirmPassword) {
      return res.status(400).json({ 
        error: 'Passwords do not match' 
      });
    }

    // Check if user already exists
    if (users.has(username)) {
      return res.status(400).json({ 
        error: 'Username already exists' 
      });
    }
    
    // Check if email already exists
    for (const [key, user] of users.entries()) {
      if (user.email === email) {
        return res.status(400).json({ 
          error: 'Email already exists' 
        });
      }
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = {
      id: Date.now().toString(),
      username,
      email,
      displayName: displayName || username,
      password: hashedPassword,
      avatar: null,
      status: 'online',
      createdAt: new Date()
    };
    
    users.set(username, newUser);
    console.log('[AUTH] User registered successfully:', username);

    // Generate token
    const token = generateToken(newUser.id, newUser.username);

    // Return user data without password
    const { password: _, ...userData } = newUser;
    
    res.status(201).json({
      message: 'Registration successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('[AUTH] Registration error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    console.log('[AUTH] Login attempt:', { username });

    // Validate input
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password are required' 
      });
    }

    // Find user by username or email
    let user = users.get(username);
    
    if (!user) {
      // Try to find by email
      for (const [key, u] of users.entries()) {
        if (u.email === username) {
          user = u;
          break;
        }
      }
    }
    
    if (!user) {
      console.log('[AUTH] User not found:', username);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      console.log('[AUTH] Invalid password for user:', username);
      return res.status(401).json({ 
        error: 'Invalid credentials' 
      });
    }

    // Update user status
    user.status = 'online';
    user.lastSeen = new Date();

    // Generate token
    const token = generateToken(user.id, user.username);
    
    console.log('[AUTH] Login successful:', username);

    // Return user data without password
    const { password: _, ...userData } = user;

    res.json({
      message: 'Login successful',
      token,
      user: userData
    });
  } catch (error) {
    console.error('[AUTH] Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Get current user
router.get('/me', (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
    
    // Find user
    let user = null;
    for (const [key, u] of users.entries()) {
      if (u.id === decoded.userId) {
        user = u;
        break;
      }
    }
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Return user data without password
    const { password: _, ...userData } = user;
    
    res.json(userData);
  } catch (error) {
    console.error('[AUTH] Get user error:', error);
    res.status(401).json({ error: 'Invalid token' });
  }
});

// Verify token
router.get('/verify', (req, res) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.json({ valid: false, message: 'No token provided' });
    }

    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return res.json({ valid: false, message: 'No token provided' });
    }

    // Verify token
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'saudicord-secret');
      
      const user = users.get(Array.from(users.keys()).find(key => 
        users.get(key).id === decoded.userId
      ));

      if (!user) {
        return res.json({ valid: false, error: 'User not found' });
      }

      const { password: _, ...userData } = user;
      res.json({ valid: true, user: userData });
    } catch (err) {
      console.error('[AUTH] Token verification error:', err);
      res.json({ valid: false, error: 'Invalid token' });
    }
  } catch (error) {
    console.error('[AUTH] Token verification error:', error);
    res.json({ valid: false, error: 'Failed to verify token' });
  }
});

// Logout (optional, mainly for client-side)
router.post('/logout', (req, res) => {
  res.json({ message: 'Logout successful' });
});

module.exports = router;
