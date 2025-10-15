// Direct Messages Page Component
import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  UserPlusIcon, 
  UserIcon,
  PhoneIcon, 
  VideoCameraIcon, 
  ComputerDesktopIcon,
  EllipsisHorizontalIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftIcon 
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import socketService from '../services/socket';

function DirectMessages() {
  const { user } = useAuthStore();
  const [friends, setFriends] = useState([]);
  const [conversations, setConversations] = useState([]); // eslint-disable-line no-unused-vars
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [pendingRequests, setPendingRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('online');

  useEffect(() => {
    loadFriends();
    loadConversations();
    
    // Setup socket listeners after a brief delay to ensure socket is connected
    const timer = setTimeout(() => {
      setupSocketListeners();
    }, 500);
    
    // Listen for friends update event
    const handleFriendsUpdate = () => {
      loadFriends();
    };
    
    window.addEventListener('friendsUpdate', handleFriendsUpdate);
    
    return () => {
      clearTimeout(timer);
      window.removeEventListener('friendsUpdate', handleFriendsUpdate);
      // Clean up socket listeners
      socketService.off('dm:receive');
      socketService.off('dm:sent');
      socketService.off('friend:request');
      socketService.off('friend:accepted');
      socketService.off('call:incoming');
      socketService.off('call:accepted');
      socketService.off('call:rejected');
      socketService.off('call:ended');
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setupSocketListeners = () => {
    socketService.on('dm:receive', (message) => {
      console.log('[DM] Received message:', message);
      
      // Normalize IDs for comparison
      const msgSenderId = message.senderId?.toString() || message.sender?._id?.toString();
      const msgReceiverId = message.receiverId?.toString();
      const currentUserId = user.id?.toString() || user._id?.toString();
      const conversationUserId = selectedConversation?.id?.toString() || selectedConversation?._id?.toString();
      
      // Check if this message belongs to current conversation
      const isRelevantMessage = 
        (msgSenderId === conversationUserId) || // Message from current conversation partner
        (msgReceiverId === conversationUserId) || // Message to current conversation partner
        (msgSenderId === currentUserId && msgReceiverId === conversationUserId) || // Our message to them
        (msgReceiverId === currentUserId && msgSenderId === conversationUserId); // Their message to us
        
      if (isRelevantMessage) {
        setMessages(prev => {
          // Check for duplicates
          const messageId = message.id?.toString() || message._id?.toString();
          const exists = prev.some(m => {
            const existingId = m.id?.toString() || m._id?.toString();
            return existingId === messageId || (m.tempId && message.tempId && m.tempId === message.tempId);
          });
          if (exists) {
            // If it's a temp message being confirmed, replace it
            if (message.tempId) {
              return prev.map(m => m.tempId === message.tempId ? message : m);
            }
            return prev;
          }
          return [...prev, message];
        });
      } 
      
      // Show notification for messages from others
      const isOwnMessage = msgSenderId === currentUserId;
      if (!isOwnMessage) {
        // Play notification sound
        const audio = new Audio('/sounds/notification.mp3');
        audio.play().catch(e => console.log('Could not play sound:', e));
        
        // Show toast notification
        toast(`💬 ${message.senderName || 'Someone'} sent you a message`, {
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #ff0000'
          }
        });
      }
      
      // Update conversation list
      loadConversations();
    });
    
    // Handle message sent confirmation
    socketService.on('dm:sent', (data) => {
      console.log('[DM] Message sent confirmation:', data);
      // Replace temp message with confirmed one
      setMessages(prev => {
        return prev.map(m => {
          if (m.tempId === data.tempId) {
            // Replace temp message with confirmed version
            return { ...data, confirmed: true };
          }
          return m;
        });
      });
    });

    socketService.on('friend:request', (data) => {
      toast(`${data.username} sent you a friend request!`);
      loadFriends();
    });

    socketService.on('friend:accepted', (data) => {
      toast.success(`${data.username} accepted your friend request!`);
      loadFriends();
    });

    // Handle incoming calls
    socketService.on('call:incoming', (data) => {
      console.log('[DM] Incoming call:', data);
      
      // Show incoming call notification with better UI
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(e => console.log('Could not play ringtone:', e));
      
      // Create notification with accept/reject buttons
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-black border border-red-500 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 bg-red-500 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <p className="text-sm font-medium text-white">
                    {data.callerName || 'Someone'} is calling...
                  </p>
                  <p className="mt-1 text-sm text-gray-400">
                    {data.type === 'video' ? 'Video Call' : 'Voice Call'}
                  </p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-gray-700">
              <button
                onClick={() => {
                  audio.pause();
                  acceptCall(data);
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-green-500 hover:bg-green-500/20 focus:outline-none"
              >
                Accept
              </button>
              <button
                onClick={() => {
                  audio.pause();
                  rejectCall(data);
                  toast.dismiss(t.id);
                }}
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-red-500 hover:bg-red-500/20 focus:outline-none"
              >
                Reject
              </button>
            </div>
          </div>
        ),
        { duration: 30000 } // 30 seconds to answer
      );
    });
    
    // Handle call accepted
    socketService.on('call:accepted', (data) => {
      console.log('[DM] Call accepted:', data);
      toast.success('Call connected!');
      // Initialize WebRTC connection
      initializeWebRTC(data);
    });
    
    // Handle call rejected
    socketService.on('call:rejected', (data) => {
      console.log('[DM] Call rejected:', data);
      setInCall(false);
      toast.error('Call was rejected');
    });
    
    // Handle call ended
    socketService.on('call:ended', (data) => {
      console.log('[DM] Call ended:', data);
      setInCall(false);
      toast('Call ended');
    });
  };

  const loadFriends = async () => {
    try {
      const response = await axios.get('/friends');
      setFriends(response.data);
      // Filter pending requests
      const pending = response.data.filter(f => f.friendshipStatus === 'pending');
      setPendingRequests(pending);
    } catch (error) {
      console.error('Failed to load friends:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await axios.get('/friends/conversations');
      setConversations(response.data);
    } catch (error) {
      console.error('Failed to load conversations:', error);
    }
  };

  const loadMessages = async (userId) => {
    try {
      const response = await axios.get(`/dm/${userId}`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to load messages:', error);
    }
  };
  
  const sendFriendRequest = async () => {
    if (!friendUsername.trim()) {
      toast.error('Please enter a username');
      return;
    }

    try {
      const response = await axios.post('/friends/request', { username: friendUsername });
      toast.success(`Friend request sent to ${friendUsername}`);
      
      // Send socket notification
      if (socketService.socket && socketService.socket.connected) {
        socketService.emit('friend:request:send', {
          targetUsername: friendUsername,
          friendshipId: response.data.id
        });
      }
      
      setFriendUsername('');
      loadFriends();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to send friend request');
    }
  };
  const acceptFriendRequest = async (friendshipId) => {
    try {
      await axios.post(`/friends/accept/${friendshipId}`);
      toast.success('Friend request accepted!');
      loadFriends();
    } catch (error) {
      toast.error('Failed to accept friend request');
    }
  };

  const rejectFriendRequest = async (friendshipId) => {
    try {
      await axios.delete(`/friends/reject/${friendshipId}`);
      toast.success('Friend request rejected');
      loadFriends();
    } catch (error) {
      toast.error('Failed to reject friend request');
    }
  };

  const cancelFriendRequest = async (friendshipId) => {
    try {
      await axios.delete(`/friends/cancel/${friendshipId}`);
      toast.success('Friend request cancelled');
      loadFriends();
    } catch (error) {
      toast.error('Failed to cancel friend request');
    }
  };

  const blockUser = async (userId) => {
    if (!window.confirm('Are you sure you want to block this user?')) return;
    
    try {
      await axios.post(`/friends/block/${userId}`);
      toast.success('User blocked');
      loadFriends();
      if (selectedConversation?.id === userId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      toast.error('Failed to block user');
    }
  };

  const removeFriend = async (friendshipId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    
    try {
      await axios.delete(`/friends/${friendshipId}`);
      toast.success('Friend removed');
      loadFriends();
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  const sendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    const tempId = `temp-${Date.now()}`;
    
    // Create optimistic message
    const tempMessage = {
      id: tempId,
      tempId: tempId,
      senderId: user.id,
      receiverId: selectedConversation.id,
      senderName: user.username || user.displayName,
      content: messageInput.trim(),
      createdAt: new Date().toISOString(),
      timestamp: new Date()
    };

    // Add message optimistically
    setMessages(prev => [...prev, tempMessage]);
    setMessageInput('');

    try {
      // Send via socket directly for real-time  
      const sent = socketService.emit('dm:send', {
        receiverId: selectedConversation.id,
        content: tempMessage.content,
        tempId: tempId
      });
      
      if (!sent) {
        // Socket not connected, try API fallback
        const response = await axios.post(`/dm/send`, {
          receiverId: selectedConversation.id,
          content: tempMessage.content
        });
        
        // Replace temp message with real one
        setMessages(prev => {
          const filtered = prev.filter(m => m.tempId !== tempId);
          return [...filtered, response.data];
        });
      }
    } catch (error) {
      toast.error('Failed to send message');
      // Remove optimistic message on error
      setMessages(prev => prev.filter(m => m.tempId !== tempId));
    }
  };

  const startVoiceCall = async () => {
    if (!selectedConversation) {
      toast.error('Please select a friend first');
      return;
    }
    
    console.log('[DM] Starting voice call with:', selectedConversation);
    setInCall(true);
    
    // Emit call initiation
    socketService.emit('call:initiate', {
      targetUserId: selectedConversation.id,
      type: 'voice',
      callerName: user.displayName || user.username
    });
    
    toast('Calling...', {
      icon: '📞',
      duration: 3000
    });
  };

  const startVideoCall = async () => {
    if (!selectedConversation) {
      toast.error('Please select a friend first');
      return;
    }
    
    console.log('[DM] Starting video call with:', selectedConversation);
    setInCall(true);
    
    // Emit call initiation  
    socketService.emit('call:initiate', {
      targetUserId: selectedConversation.id,
      type: 'video',
      callerName: user.displayName || user.username
    });
    
    toast('Starting video call...', {
      icon: '📹',
      duration: 3000
    });
  };

  const startScreenShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 }
        },
        audio: true
      });

      setIsScreenSharing(true);
      socketService.emit('screenshare:start', {
        receiverId: selectedConversation.id,
        streamId: stream.id
      });

      stream.getVideoTracks()[0].onended = () => {
        setIsScreenSharing(false);
        socketService.emit('screenshare:stop');
      };

      toast.success('Screen sharing started (1080p)');
    } catch (error) {
      toast.error('Failed to start screen sharing');
    }
  };

  const acceptCall = (callData) => {
    console.log('[DM] Accepting call:', callData);
    socketService.emit('call:accept', {
      callerId: callData.callerId,
      type: callData.type
    });
    setInCall(true);
    setSelectedConversation(prev => ({
      ...prev,
      inCallWith: callData.callerId
    }));
  };
  
  const rejectCall = (callData) => {
    console.log('[DM] Rejecting call:', callData);
    socketService.emit('call:reject', {
      callerId: callData.callerId
    });
  };

  const endCall = () => {
    console.log('[DM] Ending call');
    if (selectedConversation?.inCallWith) {
      socketService.emit('call:end', {
        targetUserId: selectedConversation.inCallWith || selectedConversation.id
      });
    }
    setInCall(false);
    setSelectedConversation(prev => {
      const { inCallWith, ...rest } = prev || {};
      return rest;
    });
    toast('Call ended');
  };
  
  const initializeWebRTC = async (data) => {
    try {
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: data.type === 'video'
      });
      
      // Initialize WebRTC connection
      // This would connect to your WebRTC service
      console.log('[DM] WebRTC initialized with stream:', stream);
      
      // Store stream for later cleanup
      window.localStream = stream;
    } catch (error) {
      console.error('[DM] Failed to initialize WebRTC:', error);
      toast.error('Failed to access camera/microphone');
      endCall();
    }
  };

  const selectConversation = (friend) => {
    setSelectedConversation(friend);
    loadMessages(friend.id);
  };

  const filteredFriends = friends.filter(friend => 
    friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-full bg-background-primary">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Discord-style Tabs Header */}
        <div className="h-12 bg-black border-b border-red-900/30 flex items-center px-4">
          <UserIcon className="w-5 h-5 text-red-500 mr-2" />
          <span className="text-white font-semibold mr-6">Friends</span>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'online' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-red-500/20'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'all' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-red-500/20'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 rounded relative transition-all ${
                activeTab === 'pending' ? 'bg-red-500 text-white' : 'text-gray-400 hover:text-white hover:bg-red-500/20'
              }`}
            >
              Pending
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('addFriend')}
              className={`px-3 py-1 rounded transition-all text-red-500 hover:bg-red-500/20 ${
                activeTab === 'addFriend' ? 'bg-red-500/20' : ''
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar - Friends List with Glass Effect */}
          <div className="w-64 bg-black/60 backdrop-blur-lg flex flex-col border-r border-red-900/20 flex-shrink-0">
            {activeTab === 'addFriend' ? (
              // Add Friend Tab - Beautiful Design
              <div className="p-8">
                <div className="bg-gradient-to-br from-red-600 to-red-700 rounded-xl p-6 shadow-xl shadow-red-900/20">
                  <h2 className="text-2xl font-bold text-white mb-3 flex items-center">
                    <UserPlusIcon className="w-7 h-7 mr-2" />
                    ADD FRIEND
                  </h2>
                  <p className="text-red-100 text-sm mb-6">
                    Connect with friends using their username
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={friendUsername}
                      onChange={(e) => setFriendUsername(e.target.value)}
                      placeholder="Enter a Username#0000"
                      className="w-full bg-black/50 text-white px-4 py-3 rounded-lg border border-red-500/30 focus:outline-none focus:border-red-400 focus:ring-2 focus:ring-red-500/20 placeholder-red-400/50"
                      onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                    />
                    <button
                      onClick={sendFriendRequest}
                      className="w-full px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 font-semibold shadow-lg shadow-red-500/30 transform hover:scale-105"
                    >
                      <span className="flex items-center justify-center">
                        <PaperAirplaneIcon className="w-5 h-5 mr-2" />
                        Send Friend Request
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            ) : activeTab === 'pending' ? (
              // Pending Requests Tab
              <div className="p-4">
                <h3 className="text-xs font-semibold text-red-400 uppercase mb-4">
                  Pending — {pendingRequests.length}
                </h3>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-red-400">There are no pending friend requests.</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {pendingRequests.map(request => (
                      <div key={request.id} className="flex items-center justify-between p-3 bg-dark-700 rounded hover:bg-dark-600 transition">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                            {request.avatar ? (
                              <img src={request.avatar} alt={request.username} className="w-full h-full rounded-full" />
                            ) : (
                              <span className="text-white font-bold">
                                {request.username?.[0]?.toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-white font-medium">{request.displayName || request.username}</p>
                            <p className="text-red-400 text-sm">
                              {request.isReceiver ? 'Incoming Friend Request' : 'Outgoing Friend Request'}
                            </p>
                          </div>
                        </div>
                        {request.isReceiver ? (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => acceptFriendRequest(request.friendshipId)}
                              className="p-2 bg-green-500 hover:bg-green-600 rounded transition"
                              title="Accept Request"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(request.friendshipId)}
                              className="p-2 bg-red-500 hover:bg-red-600 rounded transition"
                              title="Reject Request"
                            >
                              <XMarkIcon className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => selectConversation(request)}
                              className="p-2 bg-blue-500 hover:bg-blue-600 rounded transition"
                              title="Send Message"
                            >
                              <ChatBubbleLeftIcon className="w-4 h-4 text-white" />
                            </button>
                            <button
                              onClick={() => cancelFriendRequest(request.friendshipId)}
                              className="p-2 bg-red-500 hover:bg-red-600 rounded transition"
                              title="Cancel Request"
                            >
                              <XMarkIcon className="w-4 h-4 text-white" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              // Friends List (Online/All tabs)
              <>
                {/* Search */}
                <div className="p-4 border-b border-red-900/30">
                  <div className="relative">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search friends..."
                      className="w-full bg-dark-700 text-white pl-10 pr-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                  </div>
                </div>

                {/* Friends & Conversations List */}
                <div className="flex-1 overflow-y-auto">
                  {/* Show different friend lists based on activeTab */}
                  <div className="p-2">
                    <h3 className="text-xs font-semibold text-red-400 uppercase mb-2">
                      {activeTab === 'online' ? 'Online Friends' : 'All Friends'}
                    </h3>
                    {filteredFriends
                      .filter(f => {
                        const isAccepted = f.friendshipStatus === 'accepted';
                        if (activeTab === 'online') {
                          return isAccepted && f.status === 'online';
                        }
                        return isAccepted;
                      })
                      .map(friend => (
                        <button
                          key={friend.id}
                          onClick={() => selectConversation(friend)}
                          className={`w-full flex items-center space-x-3 p-2 rounded transition ${
                            selectedConversation?.id === friend.id 
                              ? 'bg-primary-500/20 text-white' 
                              : 'hover:bg-red-500/10 text-red-300'
                          }`}
                        >
                          <div className="w-10 h-10 bg-primary-500 rounded-full flex items-center justify-center">
                            {friend.avatar ? (
                              <img src={friend.avatar} alt={friend.displayName} className="w-full h-full rounded-full" />
                            ) : (
                              <UserIcon className="w-6 h-6 text-white" />
                            )}
                          </div>
                          <div className="flex-1 text-left">
                            <p className="font-medium">{friend.displayName || friend.username}</p>
                            <p className="text-xs text-text-tertiary">
                              {friend.status === 'online' ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chat Area - Full Remaining Width */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedConversation ? (
          <>
            {/* Chat Header - Modern Design */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-red-900/20 glass-morphism">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center shadow-lg shadow-red-500/30">
                    {selectedConversation.avatar ? (
                      <img src={selectedConversation.avatar} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <UserIcon className="w-7 h-7 text-white" />
                    )}
                  </div>
                  {selectedConversation.status === 'online' && (
                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-black animate-pulse"></div>
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-white text-lg">
                    {selectedConversation.displayName || selectedConversation.username}
                  </h3>
                  <p className="text-xs text-red-400">
                    {selectedConversation.status === 'online' ? '🟢 Active now' : '⚫ Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={startVoiceCall}
                  disabled={inCall}
                  className="p-2 hover:bg-red-500/20 rounded transition disabled:opacity-50"
                >
                  <PhoneIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <button
                  onClick={startVideoCall}
                  disabled={inCall}
                  className="p-2 hover:bg-red-500/20 rounded transition disabled:opacity-50"
                >
                  <VideoCameraIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <button
                  onClick={startScreenShare}
                  disabled={isScreenSharing}
                  className="p-2 hover:bg-red-500/20 rounded transition disabled:opacity-50"
                >
                  <ComputerDesktopIcon className="w-5 h-5 text-text-secondary" />
                </button>
                {inCall && (
                  <button
                    onClick={endCall}
                    className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition"
                  >
                    End Call
                  </button>
                )}
                <div className="relative group">
                  <button className="p-2 hover:bg-red-500/20 rounded transition">
                    <EllipsisHorizontalIcon className="w-5 h-5 text-red-400" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 border border-red-900/30 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
                    <button
                      onClick={() => removeFriend(selectedConversation.friendshipId)}
                      className="w-full text-left px-4 py-2 text-white hover:bg-red-500/20 transition"
                    >
                      Remove Friend
                    </button>
                    <button
                      onClick={() => blockUser(selectedConversation.id)}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-red-500/20 transition"
                    >
                      Block User
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message, index) => {
                const isOwnMessage = message.senderId === user.id || message.sender?._id === user.id;
                const senderName = isOwnMessage 
                  ? (user.displayName || user.username) 
                  : (message.senderName || message.sender?.displayName || message.sender?.username || selectedConversation?.displayName || selectedConversation?.username);
                
                return (
                  <div
                    key={message.id || message._id || index}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}
                  >
                    <div className={`flex ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'} items-start space-x-3 max-w-[70%]`}>
                      <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-white text-sm font-bold">
                          {senderName?.[0]?.toUpperCase() || '?'}
                        </span>
                      </div>
                      <div className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'}`}>
                        <div className="flex items-baseline space-x-2 mb-1 px-1">
                          <span className={`text-sm font-semibold ${isOwnMessage ? 'text-red-300' : 'text-red-400'}`}>
                            {senderName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {new Date(message.createdAt || message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className={`px-4 py-2 rounded-2xl ${
                          isOwnMessage 
                            ? 'bg-red-500 text-white rounded-tr-md' 
                            : 'bg-gray-900 text-white rounded-tl-md border border-gray-800'
                        }`}>
                          <p className="break-words">{message.content || message.message}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-red-900/30 bg-black/50">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message @${selectedConversation.username}`}
                  className="flex-1 bg-black/70 border border-red-900/30 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </>
        ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <ChatBubbleLeftIcon className="w-24 h-24 text-red-500/30 mx-auto mb-6" />
                  <h3 className="text-3xl font-bold text-white mb-3">
                    Welcome to Direct Messages
                  </h3>
                  <p className="text-red-400/70 text-lg">
                    Select a friend to start chatting
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 border border-red-900/30 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-primary">Add Friend</h2>
              <button
                onClick={() => setShowAddFriend(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-text-secondary mb-4">
              You can add a friend with their username. It's case sensitive!
            </p>
            
            <input
              type="text"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="Enter username"
              className="w-full bg-black/50 border border-red-900/30 text-white px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddFriend(false)}
                className="flex-1 px-4 py-2 bg-black/50 border border-red-900/30 text-white rounded hover:bg-red-500/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={sendFriendRequest}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition"
              >
                Send Friend Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DirectMessages;
