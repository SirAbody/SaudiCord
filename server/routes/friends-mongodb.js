// Friends Routes with MongoDB
const express = require('express');
const router = express.Router();
const Friendship = require('../schemas/Friendship');
const User = require('../schemas/User');
const auth = require('../middleware/auth-mongodb');

// Get all friends and friend requests
router.get('/', auth, async (req, res) => {
  try {
    const friendships = await Friendship.find({
      $or: [
        { requester: req.userId },
        { recipient: req.userId }
      ]
    })
    .populate('requester', 'username displayName avatar status lastSeen')
    .populate('recipient', 'username displayName avatar status lastSeen');
    
    // Format the response
    const friends = friendships.map(f => {
      const isRequester = f.requester._id.toString() === req.userId.toString();
      const friend = isRequester ? f.recipient : f.requester;
      
      return {
        id: friend._id,
        friendshipId: f._id,
        username: friend.username,
        displayName: friend.displayName,
        avatar: friend.avatar,
        status: friend.status,
        lastSeen: friend.lastSeen,
        friendshipStatus: f.status,
        isReceiver: !isRequester && f.status === 'pending',
        initiatedBy: isRequester ? req.userId : friend._id
      };
    });
    
    res.json(friends);
  } catch (error) {
    console.error('[Friends] Error fetching friends:', error);
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// Send friend request
router.post('/request', auth, async (req, res) => {
  try {
    const { username } = req.body;
    
    if (!username) {
      return res.status(400).json({ error: 'Username is required' });
    }
    
    // Find target user
    const targetUser = await User.findOne({ username: username.toLowerCase() });
    
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Cannot send request to yourself
    if (targetUser._id.toString() === req.userId.toString()) {
      return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }
    
    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { requester: req.userId, recipient: targetUser._id },
        { requester: targetUser._id, recipient: req.userId }
      ]
    });
    
    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        return res.status(400).json({ error: 'Already friends with this user' });
      }
      if (existingFriendship.status === 'pending') {
        return res.status(400).json({ error: 'Friend request already pending' });
      }
      if (existingFriendship.status === 'blocked') {
        return res.status(400).json({ error: 'Cannot send friend request to this user' });
      }
    }
    
    // Create friend request
    const friendship = new Friendship({
      requester: req.userId,
      recipient: targetUser._id,
      status: 'pending'
    });
    
    await friendship.save();
    
    // Populate and return
    await friendship.populate('requester', 'username displayName avatar');
    await friendship.populate('recipient', 'username displayName avatar');
    
    res.status(201).json({
      id: friendship._id,
      username: targetUser.username,
      displayName: targetUser.displayName,
      avatar: targetUser.avatar,
      status: 'pending'
    });
    
    // TODO: Send real-time notification via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${targetUser._id}`).emit('friend:request', {
        from: req.user.username,
        friendshipId: friendship._id
      });
    }
  } catch (error) {
    console.error('[Friends] Error sending friend request:', error);
    res.status(500).json({ error: 'Failed to send friend request' });
  }
});

// Accept friend request
router.post('/accept/:friendshipId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    // Check if user is the recipient
    if (friendship.recipient.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Cannot accept this friend request' });
    }
    
    // Check if request is pending
    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request is not pending' });
    }
    
    // Accept friend request
    await friendship.accept();
    
    // Add to friends list
    await User.findByIdAndUpdate(friendship.requester, {
      $addToSet: { friends: friendship.recipient }
    });
    
    await User.findByIdAndUpdate(friendship.recipient, {
      $addToSet: { friends: friendship.requester }
    });
    
    res.json({ message: 'Friend request accepted' });
    
    // Send notification
    const io = req.app.get('io');
    if (io) {
      io.to(`user-${friendship.requester}`).emit('friend:accepted', {
        from: req.user.username,
        friendshipId: friendship._id
      });
    }
  } catch (error) {
    console.error('[Friends] Error accepting friend request:', error);
    res.status(500).json({ error: 'Failed to accept friend request' });
  }
});

// Reject friend request
router.delete('/reject/:friendshipId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    // Check if user is the recipient
    if (friendship.recipient.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Cannot reject this friend request' });
    }
    
    // Delete the friendship request
    await friendship.deleteOne();
    
    res.json({ message: 'Friend request rejected' });
  } catch (error) {
    console.error('[Friends] Error rejecting friend request:', error);
    res.status(500).json({ error: 'Failed to reject friend request' });
  }
});

// Cancel outgoing friend request
router.delete('/cancel/:friendshipId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friend request not found' });
    }
    
    // Check if user is the requester
    if (friendship.requester.toString() !== req.userId.toString()) {
      return res.status(403).json({ error: 'Cannot cancel this friend request' });
    }
    
    // Check if request is still pending
    if (friendship.status !== 'pending') {
      return res.status(400).json({ error: 'Friend request is not pending' });
    }
    
    // Delete the friendship request
    await friendship.deleteOne();
    
    res.json({ message: 'Friend request cancelled' });
  } catch (error) {
    console.error('[Friends] Error cancelling friend request:', error);
    res.status(500).json({ error: 'Failed to cancel friend request' });
  }
});

// Remove friend
router.delete('/:friendshipId', auth, async (req, res) => {
  try {
    const friendship = await Friendship.findById(req.params.friendshipId);
    
    if (!friendship) {
      return res.status(404).json({ error: 'Friendship not found' });
    }
    
    // Check if user is part of the friendship
    const isRequester = friendship.requester.toString() === req.userId.toString();
    const isRecipient = friendship.recipient.toString() === req.userId.toString();
    
    if (!isRequester && !isRecipient) {
      return res.status(403).json({ error: 'Cannot remove this friendship' });
    }
    
    // Remove from friends lists
    await User.findByIdAndUpdate(friendship.requester, {
      $pull: { friends: friendship.recipient }
    });
    
    await User.findByIdAndUpdate(friendship.recipient, {
      $pull: { friends: friendship.requester }
    });
    
    // Delete friendship
    await friendship.deleteOne();
    
    res.json({ message: 'Friend removed' });
  } catch (error) {
    console.error('[Friends] Error removing friend:', error);
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

// Block user
router.post('/block/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Find existing friendship
    let friendship = await Friendship.findOne({
      $or: [
        { requester: req.userId, recipient: targetUserId },
        { requester: targetUserId, recipient: req.userId }
      ]
    });
    
    if (friendship) {
      // Update existing friendship to blocked
      await friendship.block(req.userId);
    } else {
      // Create new blocked relationship
      friendship = new Friendship({
        requester: req.userId,
        recipient: targetUserId,
        status: 'blocked',
        blockedBy: req.userId,
        blockedAt: new Date()
      });
      await friendship.save();
    }
    
    // Add to blocked users list
    await User.findByIdAndUpdate(req.userId, {
      $addToSet: { blockedUsers: targetUserId },
      $pull: { friends: targetUserId }
    });
    
    // Remove from friends
    await User.findByIdAndUpdate(targetUserId, {
      $pull: { friends: req.userId }
    });
    
    res.json({ message: 'User blocked' });
  } catch (error) {
    console.error('[Friends] Error blocking user:', error);
    res.status(500).json({ error: 'Failed to block user' });
  }
});

// Unblock user
router.post('/unblock/:userId', auth, async (req, res) => {
  try {
    const targetUserId = req.params.userId;
    
    // Find blocked friendship
    const friendship = await Friendship.findOne({
      $or: [
        { requester: req.userId, recipient: targetUserId },
        { requester: targetUserId, recipient: req.userId }
      ],
      status: 'blocked',
      blockedBy: req.userId
    });
    
    if (friendship) {
      // Delete the blocked relationship
      await friendship.deleteOne();
    }
    
    // Remove from blocked users list
    await User.findByIdAndUpdate(req.userId, {
      $pull: { blockedUsers: targetUserId }
    });
    
    res.json({ message: 'User unblocked' });
  } catch (error) {
    console.error('[Friends] Error unblocking user:', error);
    res.status(500).json({ error: 'Failed to unblock user' });
  }
});

// Get conversations (for DM list)
router.get('/conversations', auth, async (req, res) => {
  try {
    const DirectMessage = require('../schemas/DirectMessage');
    
    // Get all conversations for the user
    const conversations = await DirectMessage.getConversationsList(req.userId);
    
    res.json(conversations);
  } catch (error) {
    console.error('[Friends] Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

module.exports = router;
