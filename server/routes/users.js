// User Routes
const express = require('express');
const { User } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Configure multer for avatar uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/avatars/');
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.userId}-${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Get current user profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: User,
          as: 'friends',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status']
        }
      ]
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Update user profile
router.patch('/me', authenticateToken, async (req, res) => {
  try {
    const { displayName, bio, status } = req.body;
    const updates = {};

    if (displayName) updates.displayName = displayName;
    if (bio !== undefined) updates.bio = bio;
    if (status) updates.status = status;

    await User.update(updates, {
      where: { id: req.userId }
    });

    const updatedUser = await User.findByPk(req.userId, {
      attributes: { exclude: ['password'] }
    });

    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload avatar
router.post('/me/avatar', authenticateToken, upload.single('avatar'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    await User.update(
      { avatar: avatarUrl },
      { where: { id: req.userId } }
    );

    res.json({ avatar: avatarUrl });
  } catch (error) {
    console.error('Error uploading avatar:', error);
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// Get user by ID
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id, {
      attributes: ['id', 'username', 'displayName', 'avatar', 'status', 'bio', 'lastSeen']
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Search users
router.get('/search/:query', authenticateToken, async (req, res) => {
  try {
    const { query } = req.params;
    
    const users = await User.findAll({
      where: {
        [require('sequelize').Op.or]: [
          { 
            username: { 
              [require('sequelize').Op.iLike]: `%${query}%` 
            } 
          },
          { 
            displayName: { 
              [require('sequelize').Op.iLike]: `%${query}%` 
            } 
          }
        ]
      },
      attributes: ['id', 'username', 'displayName', 'avatar', 'status'],
      limit: 20
    });

    res.json(users);
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ error: 'Failed to search users' });
  }
});

// Add friend
router.post('/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    
    if (friendId === req.userId) {
      return res.status(400).json({ error: 'Cannot add yourself as a friend' });
    }

    const user = await User.findByPk(req.userId);
    const friend = await User.findByPk(friendId);

    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.addFriend(friend);
    await friend.addFriend(user);

    res.json({ message: 'Friend added successfully' });
  } catch (error) {
    console.error('Error adding friend:', error);
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// Remove friend
router.delete('/friends/:friendId', authenticateToken, async (req, res) => {
  try {
    const { friendId } = req.params;
    
    const user = await User.findByPk(req.userId);
    const friend = await User.findByPk(friendId);

    if (!friend) {
      return res.status(404).json({ error: 'User not found' });
    }

    await user.removeFriend(friend);
    await friend.removeFriend(user);

    res.json({ message: 'Friend removed successfully' });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Get friends list
router.get('/me/friends', authenticateToken, async (req, res) => {
  try {
    const user = await User.findByPk(req.userId, {
      include: [
        {
          model: User,
          as: 'friends',
          attributes: ['id', 'username', 'displayName', 'avatar', 'status', 'lastSeen']
        }
      ]
    });

    res.json(user.friends || []);
  } catch (error) {
    console.error('Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

module.exports = router;
