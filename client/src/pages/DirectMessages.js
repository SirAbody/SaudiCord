// Direct Messages Page - Discord Clone
// Made with Love by SirAbody

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  UserPlusIcon,
  PhoneIcon, 
  VideoCameraIcon,
  InformationCircleIcon,
  GiftIcon,
  FaceSmileIcon,
  PlusCircleIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  Cog6ToothIcon,
  MicrophoneIcon,
  SpeakerWaveIcon,
  ComputerDesktopIcon,
  AtSymbolIcon,
  HashtagIcon,
  BellIcon,
  BellSlashIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  FolderPlusIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { 
  UserIcon as SolidUserIcon,
  ChevronDownIcon
} from '@heroicons/react/24/solid';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import socketService from '../services/socket';

const DirectMessages = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const messagesEndRef = useRef(null);
  const messageInputRef = useRef(null);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  
  // States
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [friends, setFriends] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [activeTab, setActiveTab] = useState('online');
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [showUserInfo, setShowUserInfo] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  
  // Call states
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [callInterval, setCallInterval] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  
  // WebRTC refs
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const screenShareStreamRef = useRef(null);

  // Load initial data
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadFriends();
    loadConversations();
    setupSocketListeners();
    
    return () => {
      cleanupSocketListeners();
      cleanupCall();
    };
  }, [user]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id || selectedConversation.id);
    }
  }, [selectedConversation]);

  // API Functions
  const loadFriends = async () => {
    try {
      const response = await axios.get('/friends');
      setFriends(response.data.friends || []);
      setPendingRequests(response.data.pending || []);
      
      const onlineSet = new Set();
      response.data.friends?.forEach(friend => {
        if (friend.status === 'online') {
          onlineSet.add(friend._id || friend.id);
        }
      });
      setOnlineUsers(onlineSet);
    } catch (error) {
      console.error('Error loading friends:', error);
    }
  };

  const loadConversations = async () => {
    try {
      const response = await axios.get('/friends/conversations');
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId) => {
    setLoadingMessages(true);
    try {
      const response = await axios.get(`/dm/messages/${conversationId}`);
      setMessages(response.data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async (e) => {
    e?.preventDefault();
    if (!messageInput.trim() || !selectedConversation || sendingMessage) return;
    
    const content = messageInput.trim();
    const conversationId = selectedConversation._id || selectedConversation.id;
    const tempId = `temp-${Date.now()}`;
    
    const optimisticMessage = {
      id: tempId,
      content,
      sender: user,
      receiver: selectedConversation.friend,
      timestamp: new Date().toISOString(),
      status: 'sending'
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    setMessageInput('');
    setSendingMessage(true);
    
    try {
      const sent = socketService.emit('dm:send', {
        conversationId,
        receiverId: selectedConversation.friend?._id || selectedConversation.friend?.id,
        content,
        tempId
      });
      
      if (!sent) {
        const response = await axios.post('/dm/send', {
          receiverId: selectedConversation.friend?._id || selectedConversation.friend?.id,
          content
        });
        
        setMessages(prev => prev.map(msg => 
          msg.id === tempId ? { ...response.data, status: 'sent' } : msg
        ));
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => prev.map(msg => 
        msg.id === tempId ? { ...msg, status: 'failed' } : msg
      ));
      toast.error('Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  const handleTyping = (e) => {
    setMessageInput(e.target.value);
    
    if (!selectedConversation) return;
    
    if (!isTyping) {
      setIsTyping(true);
      socketService.emit('dm:typing', {
        receiverId: selectedConversation.friend?._id || selectedConversation.friend?.id
      });
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      socketService.emit('dm:stop-typing', {
        receiverId: selectedConversation.friend?._id || selectedConversation.friend?.id
      });
    }, 2000);
  };

  const sendFriendRequest = async () => {
    if (!friendUsername.trim()) return;
    
    try {
      await axios.post('/friends/add', { username: friendUsername });
      toast.success('Friend request sent!');
      setFriendUsername('');
      setShowAddFriend(false);
      loadFriends();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to send friend request';
      toast.error(message);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      await axios.post(`/friends/accept/${requestId}`);
      toast.success('Friend request accepted!');
      loadFriends();
    } catch (error) {
      toast.error('Failed to accept friend request');
    }
  };

  const rejectFriendRequest = async (requestId) => {
    try {
      await axios.delete(`/friends/reject/${requestId}`);
      toast.success('Friend request rejected');
      loadFriends();
    } catch (error) {
      toast.error('Failed to reject friend request');
    }
  };

  const removeFriend = async (friendId) => {
    try {
      await axios.delete(`/friends/remove/${friendId}`);
      toast.success('Friend removed');
      loadFriends();
      if (selectedConversation?.friend?._id === friendId) {
        setSelectedConversation(null);
      }
    } catch (error) {
      toast.error('Failed to remove friend');
    }
  };

  // Socket event setup and handlers
  const setupSocketListeners = () => {
    socketService.on('dm:receive', handleReceiveMessage);
    socketService.on('dm:sent', handleMessageSent);
    socketService.on('dm:typing', handleUserTyping);
    socketService.on('dm:stop-typing', handleUserStopTyping);
    socketService.on('friend:request:received', handleFriendRequest);
    socketService.on('friend:request:accepted', handleFriendAccepted);
    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);
  };

  const cleanupSocketListeners = () => {
    socketService.off('dm:receive');
    socketService.off('dm:sent');
    socketService.off('dm:typing');
    socketService.off('dm:stop-typing');
    socketService.off('friend:request:received');
    socketService.off('friend:request:accepted');
    socketService.off('user:online');
    socketService.off('user:offline');
  };

  const cleanupCall = () => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (screenShareStreamRef.current) {
      screenShareStreamRef.current.getTracks().forEach(track => track.stop());
    }
    if (callInterval) {
      clearInterval(callInterval);
    }
  };

  const handleReceiveMessage = (message) => {
    if (selectedConversation?.friend?._id === message.sender?._id ||
        selectedConversation?.friend?.id === message.sender?.id) {
      setMessages(prev => [...prev, message]);
    }
    
    if (!document.hasFocus() || 
        (selectedConversation?.friend?._id !== message.sender?._id &&
         selectedConversation?.friend?.id !== message.sender?.id)) {
      toast.custom((t) => (
        <div className="flex items-center space-x-3 bg-gray-800 rounded-lg p-3">
          <img
            src={message.sender?.avatar || `https://ui-avatars.com/api/?name=${message.sender?.username}`}
            alt={message.sender?.username}
            className="w-10 h-10 rounded-full"
          />
          <div>
            <p className="font-semibold text-white">{message.sender?.username}</p>
            <p className="text-gray-300 text-sm">{message.content}</p>
          </div>
        </div>
      ));
    }
  };

  const handleMessageSent = ({ tempId, messageId, message }) => {
    setMessages(prev => prev.map(msg => 
      msg.id === tempId ? { ...message, id: messageId, status: 'sent' } : msg
    ));
  };

  const handleUserTyping = ({ userId }) => {
    setTypingUsers(prev => ({ ...prev, [userId]: true }));
    setTimeout(() => {
      setTypingUsers(prev => {
        const newState = { ...prev };
        delete newState[userId];
        return newState;
      });
    }, 3000);
  };

  const handleUserStopTyping = ({ userId }) => {
    setTypingUsers(prev => {
      const newState = { ...prev };
      delete newState[userId];
      return newState;
    });
  };

  const handleFriendRequest = (request) => {
    toast.success(`${request.from?.username} sent you a friend request!`);
    loadFriends();
  };

  const handleFriendAccepted = (data) => {
    toast.success(`${data.username} accepted your friend request!`);
    loadFriends();
  };

  const handleUserOnline = ({ userId }) => {
    setOnlineUsers(prev => new Set([...prev, userId]));
  };

  const handleUserOffline = ({ userId }) => {
    setOnlineUsers(prev => {
      const newSet = new Set(prev);
      newSet.delete(userId);
      return newSet;
    });
  };

  const formatMessageTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const getFilteredFriends = () => {
    let filtered = friends;
    
    switch (activeTab) {
      case 'online':
        filtered = friends.filter(f => onlineUsers.has(f._id || f.id));
        break;
      case 'pending':
        return pendingRequests;
      case 'blocked':
        filtered = friends.filter(f => f.blocked);
        break;
      default:
        break;
    }
    
    if (searchQuery) {
      filtered = filtered.filter(f => 
        f.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  };

  return (
    <div className="flex h-screen bg-[#36393f] overflow-hidden">
      {/* Left Sidebar - Friends List */}
      <div className="w-60 bg-[#2f3136] flex flex-col">
        {/* Search Bar */}
        <div className="p-2 border-b border-[#202225]">
          <button className="w-full bg-[#202225] text-[#96989d] px-2 py-1.5 rounded text-sm text-left hover:text-[#dcddde] transition-colors">
            Find or start a conversation
          </button>
        </div>

        {/* Friends Button */}
        <div className="px-2 py-3">
          <button 
            onClick={() => {
              setSelectedConversation(null);
              setActiveTab('online');
            }}
            className={`flex items-center space-x-3 w-full px-2 py-2 rounded ${
              !selectedConversation ? 'bg-[#393c43] text-white' : 'hover:bg-[#393c43] text-[#96989d] hover:text-[#dcddde]'
            } transition-all`}
          >
            <SolidUserIcon className="w-6 h-6" />
            <span className="font-semibold">Friends</span>
            {pendingRequests.length > 0 && (
              <span className="ml-auto bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                {pendingRequests.length}
              </span>
            )}
          </button>
        </div>

        {/* Direct Messages Header */}
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#96989d] uppercase">Direct Messages</span>
          <button className="text-[#96989d] hover:text-[#dcddde]">
            <PlusCircleIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => (
            <button
              key={conv._id || conv.id}
              onClick={() => setSelectedConversation(conv)}
              className={`flex items-center space-x-3 w-full px-2 py-2 mx-2 rounded ${
                selectedConversation?._id === conv._id || selectedConversation?.id === conv.id
                  ? 'bg-[#393c43] text-white'
                  : 'hover:bg-[#393c43] text-[#96989d] hover:text-[#dcddde]'
              } transition-all`}
            >
              <div className="relative">
                <img
                  src={conv.friend?.avatar || `https://ui-avatars.com/api/?name=${conv.friend?.username}`}
                  alt={conv.friend?.username}
                  className="w-8 h-8 rounded-full"
                />
                {onlineUsers.has(conv.friend?._id || conv.friend?.id) && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#2f3136]"></div>
                )}
              </div>
              <span className="text-sm">{conv.friend?.displayName || conv.friend?.username}</span>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  // Close conversation
                }}
                className="ml-auto opacity-0 group-hover:opacity-100 text-[#96989d] hover:text-white"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </button>
          ))}
        </div>
      </div>

      {/* Main Content */}
      {selectedConversation ? (
        <div className="flex-1 flex flex-col">
          {/* Chat Header */}
          <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4">
            <div className="flex items-center space-x-3 flex-1">
              <AtSymbolIcon className="w-6 h-6 text-[#72767d]" />
              <span className="font-semibold text-white">
                {selectedConversation.friend?.displayName || selectedConversation.friend?.username}
              </span>
              {onlineUsers.has(selectedConversation.friend?._id || selectedConversation.friend?.id) && (
                <span className="text-xs text-green-500">● Online</span>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => {/* Start voice call */}}
                className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
              >
                <PhoneIcon className="w-5 h-5" />
              </button>
              <button 
                onClick={() => {/* Start video call */}}
                className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
              >
                <VideoCameraIcon className="w-5 h-5" />
              </button>
              <button className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors">
                <BookmarkIcon className="w-5 h-5" />
              </button>
              <button className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors">
                <UserPlusIcon className="w-5 h-5" />
              </button>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search"
                  className="bg-[#202225] text-[#dcddde] px-2 py-1 rounded text-sm w-32 focus:outline-none"
                />
                <MagnifyingGlassIcon className="absolute right-2 top-1.5 w-4 h-4 text-[#72767d]" />
              </div>
              <button 
                onClick={() => setShowUserInfo(!showUserInfo)}
                className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
              >
                <InformationCircleIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {loadingMessages ? (
              <div className="flex justify-center items-center h-full">
                <span className="text-[#96989d]">Loading messages...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full">
                <div className="w-20 h-20 bg-[#4f545c] rounded-full flex items-center justify-center mb-4">
                  <span className="text-4xl text-[#dcddde]">
                    {selectedConversation.friend?.username?.[0]?.toUpperCase()}
                  </span>
                </div>
                <h3 className="text-3xl font-bold text-white mb-2">
                  {selectedConversation.friend?.displayName || selectedConversation.friend?.username}
                </h3>
                <p className="text-[#b9bbbe]">
                  This is the beginning of your direct message history with @{selectedConversation.friend?.username}.
                </p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOwn = message.sender?._id === user?._id || message.sender?.id === user?.id;
                const showAvatar = index === 0 || messages[index - 1]?.sender?._id !== message.sender?._id;
                
                return (
                  <div key={message.id || index} className={`flex ${isOwn ? 'justify-end' : ''} mb-4 group`}>
                    {!isOwn && showAvatar && (
                      <img
                        src={message.sender?.avatar || `https://ui-avatars.com/api/?name=${message.sender?.username}`}
                        alt={message.sender?.username}
                        className="w-10 h-10 rounded-full mr-3 mt-0.5"
                      />
                    )}
                    {!isOwn && !showAvatar && <div className="w-10 mr-3" />}
                    
                    <div className={`max-w-[70%] ${isOwn ? 'items-end' : ''}`}>
                      {showAvatar && (
                        <div className="flex items-baseline mb-1">
                          <span className={`font-semibold ${isOwn ? 'text-[#00b0f4]' : 'text-[#f04747]'} mr-2`}>
                            {message.sender?.displayName || message.sender?.username}
                          </span>
                          <span className="text-xs text-[#72767d]">
                            {formatMessageTime(message.timestamp || message.createdAt)}
                          </span>
                        </div>
                      )}
                      <div className={`${isOwn ? 'bg-[#5865f2]' : 'bg-[#4f545c]'} rounded-lg px-3 py-2`}>
                        <p className="text-[#dcddde] break-words">{message.content}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            
            {/* Typing Indicator */}
            {Object.keys(typingUsers).length > 0 && (
              <div className="flex items-center space-x-2 text-[#96989d] text-sm">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-[#96989d] rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-[#96989d] rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-[#96989d] rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
                <span>{Object.keys(typingUsers)[0]} is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Message Input */}
          <form onSubmit={sendMessage} className="px-4 pb-4">
            <div className="bg-[#40444b] rounded-lg flex items-center px-4">
              <button type="button" className="text-[#b9bbbe] hover:text-[#dcddde] mr-3">
                <PlusCircleIcon className="w-6 h-6" />
              </button>
              <input
                ref={messageInputRef}
                type="text"
                value={messageInput}
                onChange={handleTyping}
                placeholder={`Message @${selectedConversation.friend?.username}`}
                className="flex-1 bg-transparent text-[#dcddde] py-3 focus:outline-none placeholder-[#72767d]"
                disabled={sendingMessage}
              />
              <div className="flex items-center space-x-3 ml-3">
                <button type="button" className="text-[#b9bbbe] hover:text-[#dcddde]">
                  <GiftIcon className="w-6 h-6" />
                </button>
                <button type="button" className="text-[#b9bbbe] hover:text-[#dcddde]">
                  <PhotoIcon className="w-6 h-6" />
                </button>
                <button type="button" className="text-[#b9bbbe] hover:text-[#dcddde]">
                  <FaceSmileIcon className="w-6 h-6" />
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : (
        /* Friends View */
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4">
            <SolidUserIcon className="w-6 h-6 text-[#72767d] mr-3" />
            <span className="font-semibold text-white">Friends</span>
            
            {/* Tabs */}
            <div className="flex items-center space-x-6 ml-8">
              <button
                onClick={() => setActiveTab('online')}
                className={`${activeTab === 'online' ? 'text-white bg-[#42464d]' : 'text-[#b9bbbe] hover:text-[#dcddde] hover:bg-[#42464d]'} px-2 py-0.5 rounded transition-all`}
              >
                Online
              </button>
              <button
                onClick={() => setActiveTab('all')}
                className={`${activeTab === 'all' ? 'text-white bg-[#42464d]' : 'text-[#b9bbbe] hover:text-[#dcddde] hover:bg-[#42464d]'} px-2 py-0.5 rounded transition-all`}
              >
                All
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`${activeTab === 'pending' ? 'text-white bg-[#42464d]' : 'text-[#b9bbbe] hover:text-[#dcddde] hover:bg-[#42464d]'} px-2 py-0.5 rounded transition-all relative`}
              >
                Pending
                {pendingRequests.length > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                    {pendingRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('blocked')}
                className={`${activeTab === 'blocked' ? 'text-white bg-[#42464d]' : 'text-[#b9bbbe] hover:text-[#dcddde] hover:bg-[#42464d]'} px-2 py-0.5 rounded transition-all`}
              >
                Blocked
              </button>
              <button
                onClick={() => setShowAddFriend(true)}
                className="bg-green-600 hover:bg-green-700 text-white px-2 py-0.5 rounded transition-colors"
              >
                Add Friend
              </button>
            </div>
          </div>

          {/* Friends List */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'pending' ? (
              /* Pending Requests */
              <div>
                <h3 className="text-xs font-semibold text-[#96989d] uppercase mb-4">
                  Pending — {pendingRequests.length}
                </h3>
                {pendingRequests.map(request => (
                  <div key={request._id || request.id} className="flex items-center p-3 rounded hover:bg-[#42464d] group">
                    <img
                      src={request.from?.avatar || `https://ui-avatars.com/api/?name=${request.from?.username}`}
                      alt={request.from?.username}
                      className="w-10 h-10 rounded-full mr-3"
                    />
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {request.from?.displayName || request.from?.username}
                      </div>
                      <div className="text-xs text-[#b9bbbe]">
                        Incoming Friend Request
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => acceptFriendRequest(request._id || request.id)}
                        className="p-2 bg-[#3ba55d] hover:bg-[#2d8049] rounded-full text-white"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </button>
                      <button
                        onClick={() => rejectFriendRequest(request._id || request.id)}
                        className="p-2 bg-[#4f545c] hover:bg-[#42464d] rounded-full text-white"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              /* Friends List */
              <div>
                <h3 className="text-xs font-semibold text-[#96989d] uppercase mb-4">
                  {activeTab === 'online' ? `Online — ${getFilteredFriends().length}` : `All Friends — ${getFilteredFriends().length}`}
                </h3>
                {getFilteredFriends().map(friend => (
                  <div key={friend._id || friend.id} className="flex items-center p-3 rounded hover:bg-[#42464d] group">
                    <div className="relative">
                      <img
                        src={friend.avatar || `https://ui-avatars.com/api/?name=${friend.username}`}
                        alt={friend.username}
                        className="w-10 h-10 rounded-full mr-3"
                      />
                      {onlineUsers.has(friend._id || friend.id) && (
                        <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-[#36393f]"></div>
                      )}
                    </div>
                    <div className="flex-1 ml-3">
                      <div className="font-semibold text-white">
                        {friend.displayName || friend.username}
                      </div>
                      <div className="text-xs text-[#b9bbbe]">
                        {onlineUsers.has(friend._id || friend.id) ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    <div className="flex space-x-2 opacity-0 group-hover:opacity-100">
                      <button
                        onClick={() => {
                          const conv = conversations.find(c => 
                            c.friend?._id === friend._id || c.friend?.id === friend.id
                          );
                          if (conv) {
                            setSelectedConversation(conv);
                          } else {
                            // Create new conversation
                            setSelectedConversation({ friend });
                          }
                        }}
                        className="p-2 bg-[#42464d] hover:bg-[#36393f] rounded-full text-[#b9bbbe]"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                      </button>
                      <button className="p-2 bg-[#42464d] hover:bg-[#36393f] rounded-full text-[#b9bbbe]">
                        <EllipsisHorizontalIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Right Sidebar - User Info */}
      {selectedConversation && showUserInfo && (
        <div className="w-80 bg-[#2f3136] border-l border-[#202225] p-4">
          <div className="flex flex-col items-center">
            <img
              src={selectedConversation.friend?.avatar || `https://ui-avatars.com/api/?name=${selectedConversation.friend?.username}`}
              alt={selectedConversation.friend?.username}
              className="w-20 h-20 rounded-full mb-3"
            />
            <h3 className="text-xl font-bold text-white mb-1">
              {selectedConversation.friend?.displayName || selectedConversation.friend?.username}
            </h3>
            <p className="text-[#b9bbbe] text-sm">
              @{selectedConversation.friend?.username}
            </p>
          </div>
          
          <div className="mt-8">
            <h4 className="text-xs font-semibold text-[#96989d] uppercase mb-3">About Me</h4>
            <p className="text-[#dcddde] text-sm">
              {selectedConversation.friend?.bio || 'No bio available'}
            </p>
          </div>
          
          <div className="mt-8">
            <h4 className="text-xs font-semibold text-[#96989d] uppercase mb-3">Member Since</h4>
            <p className="text-[#dcddde] text-sm">
              {new Date(selectedConversation.friend?.createdAt).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}
            </p>
          </div>
        </div>
      )}

      {/* Add Friend Modal */}
      {showAddFriend && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[#36393f] rounded-lg p-6 w-96">
            <h2 className="text-xl font-bold text-white mb-4">Add Friend</h2>
            <p className="text-[#b9bbbe] mb-4">You can add a friend with their Discord Tag. It's cAsE sEnSitIvE!</p>
            <input
              type="text"
              value={friendUsername}
              onChange={(e) => setFriendUsername(e.target.value)}
              placeholder="Enter a Username#0000"
              className="w-full bg-[#202225] text-[#dcddde] px-3 py-2 rounded focus:outline-none mb-4"
            />
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowAddFriend(false);
                  setFriendUsername('');
                }}
                className="px-4 py-2 text-white hover:underline"
              >
                Cancel
              </button>
              <button
                onClick={sendFriendRequest}
                className="px-4 py-2 bg-[#5865f2] hover:bg-[#4752c4] text-white rounded"
              >
                Send Friend Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectMessages;
