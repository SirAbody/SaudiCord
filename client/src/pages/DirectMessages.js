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
import FriendRequests from '../components/friends/FriendRequests';
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
  const [activeTab, setActiveTab] = useState('online'); // online, all, pending, addFriend
  const [pendingRequests, setPendingRequests] = useState([]);

  useEffect(() => {
    loadFriends();
    loadConversations();
    setupSocketListeners();

    // Listen for friends update event
    const handleFriendsUpdate = () => {
      loadFriends();
    };
    
    window.addEventListener('friendsUpdate', handleFriendsUpdate);
    
    return () => {
      window.removeEventListener('friendsUpdate', handleFriendsUpdate);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setupSocketListeners = () => {
    socketService.on('dm:receive', (message) => {
      if (selectedConversation?.id === message.senderId || selectedConversation?.id === message.receiverId) {
        setMessages(prev => [...prev, message]);
      }
      // Update conversation list
      loadConversations();
    });

    socketService.on('friend:request', (data) => {
      toast(`${data.username} sent you a friend request!`);
      loadFriends();
    });

    socketService.on('friend:accepted', (data) => {
      toast.success(`${data.username} accepted your friend request!`);
      loadFriends();
    });

    socketService.on('call:incoming', (data) => {
      if (window.confirm(`${data.callerName} is calling you. Accept?`)) {
        acceptCall(data);
      }
    });

    return () => {
      socketService.off('dm:receive');
      socketService.off('friend:request');
      socketService.off('friend:accepted');
      socketService.off('call:incoming');
    };
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
      await axios.post('/friends/request', { username: friendUsername });
      toast.success('Friend request sent!');
      setFriendUsername('');
      setShowAddFriend(false);
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

    const message = {
      receiverId: selectedConversation.id,
      content: messageInput.trim()
    };

    try {
      const response = await axios.post('/dm', message);
      socketService.emit('dm:send', response.data);
      setMessages(prev => [...prev, response.data]);
      setMessageInput('');
    } catch (error) {
      toast.error('Failed to send message');
    }
  };

  const startVoiceCall = async () => {
    if (!selectedConversation) return;
    
    setInCall(true);
    socketService.emit('call:start', {
      receiverId: selectedConversation.id,
      type: 'voice'
    });
    toast.success('Starting voice call...');
  };

  const startVideoCall = async () => {
    if (!selectedConversation) return;
    
    setInCall(true);
    socketService.emit('call:start', {
      receiverId: selectedConversation.id,
      type: 'video'
    });
    toast.success('Starting video call...');
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
    socketService.emit('call:accept', callData);
    setInCall(true);
  };

  const endCall = () => {
    socketService.emit('call:end');
    setInCall(false);
    toast('Call ended');
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
        <div className="h-12 bg-dark-800 border-b border-dark-600 flex items-center px-4">
          <UserIcon className="w-5 h-5 text-primary-500 mr-2" />
          <span className="text-white font-semibold mr-6">Friends</span>
          
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('online')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'online' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              Online
            </button>
            <button
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1 rounded transition-all ${
                activeTab === 'all' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setActiveTab('pending')}
              className={`px-3 py-1 rounded relative transition-all ${
                activeTab === 'pending' ? 'bg-primary-500 text-white' : 'text-gray-400 hover:text-white hover:bg-dark-700'
              }`}
            >
              Pending
              {pendingRequests.length > 0 && (
                <span className="absolute -top-1 -right-2 bg-primary-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {pendingRequests.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('addFriend')}
              className={`px-3 py-1 rounded transition-all text-primary-500 hover:bg-primary-500/20 ${
                activeTab === 'addFriend' ? 'bg-primary-500/20' : ''
              }`}
            >
              Add Friend
            </button>
          </div>
        </div>

        {/* Content based on active tab */}
        <div className="flex-1 flex">
          {/* Sidebar - Friends List */}
          <div className="w-80 bg-background-secondary flex flex-col border-r border-gray-800">
            {activeTab === 'addFriend' ? (
              // Add Friend Tab
              <div className="p-4">
                <h2 className="text-xl font-bold text-white mb-2">ADD FRIEND</h2>
                <p className="text-gray-400 text-sm mb-4">
                  You can add friends with their username.
                </p>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={friendUsername}
                    onChange={(e) => setFriendUsername(e.target.value)}
                    placeholder="Enter a Username#0000"
                    className="flex-1 bg-dark-900 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
                    onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                  />
                  <button
                    onClick={sendFriendRequest}
                    className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
                  >
                    Send Friend Request
                  </button>
                </div>
              </div>
            ) : activeTab === 'pending' ? (
              // Pending Requests Tab
              <div className="p-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase mb-4">
                  Pending — {pendingRequests.length}
                </h3>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-400">There are no pending friend requests.</p>
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
                            <p className="text-gray-400 text-sm">
                              {request.isReceiver ? 'Incoming Friend Request' : 'Outgoing Friend Request'}
                            </p>
                          </div>
                        </div>
                        {request.isReceiver && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => acceptFriendRequest(request.friendshipId)}
                              className="p-2 bg-green-500 hover:bg-green-600 rounded transition"
                            >
                              <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                            <button
                              className="p-2 bg-red-500 hover:bg-red-600 rounded transition"
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
                <div className="p-4 border-b border-gray-800">
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
                    <h3 className="text-xs font-semibold text-gray-400 uppercase mb-2">
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
                              : 'hover:bg-dark-700 text-gray-300'
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

          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {selectedConversation ? (
          <>
            {/* Chat Header */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-gray-800 bg-background-secondary">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <UserIcon className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-text-primary">
                    {selectedConversation.displayName || selectedConversation.username}
                  </h3>
                  <p className="text-xs text-text-tertiary">
                    {selectedConversation.status === 'online' ? 'Active now' : 'Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={startVoiceCall}
                  disabled={inCall}
                  className="p-2 hover:bg-gray-700 rounded transition disabled:opacity-50"
                >
                  <PhoneIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <button
                  onClick={startVideoCall}
                  disabled={inCall}
                  className="p-2 hover:bg-gray-700 rounded transition disabled:opacity-50"
                >
                  <VideoCameraIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <button
                  onClick={startScreenShare}
                  disabled={isScreenSharing}
                  className="p-2 hover:bg-gray-700 rounded transition disabled:opacity-50"
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
                  <button className="p-2 hover:bg-gray-700 rounded transition">
                    <EllipsisHorizontalIcon className="w-5 h-5 text-gray-400" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-gray-800 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
                    <button
                      onClick={() => removeFriend(selectedConversation.friendshipId)}
                      className="w-full text-left px-4 py-2 text-white hover:bg-gray-700 transition"
                    >
                      Remove Friend
                    </button>
                    <button
                      onClick={() => blockUser(selectedConversation.id)}
                      className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-700 transition"
                    >
                      Block User
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={message.id || index}
                  className={`flex ${message.senderId === user.id ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-2xl px-4 py-2 rounded-lg ${
                    message.senderId === user.id 
                      ? 'bg-red-500 text-white' 
                      : 'bg-gray-700 text-white'
                  }`}>
                    <p>{message.content}</p>
                    <span className="text-xs opacity-70">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-800 bg-background-secondary">
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder={`Message @${selectedConversation.username}`}
                  className="flex-1 bg-gray-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
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
                  <ChatBubbleLeftIcon className="w-20 h-20 text-primary-500/50 mx-auto mb-4" />
                  <h3 className="text-2xl font-bold text-white mb-2">
                    Welcome to Direct Messages
                  </h3>
                  <p className="text-gray-400">
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
          <div className="bg-gray-800 rounded-lg p-6 w-96">
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
              className="w-full bg-gray-700 text-white px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-red-500"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddFriend(false)}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
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
