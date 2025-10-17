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
  AtSymbolIcon,
  BookmarkIcon,
  EllipsisHorizontalIcon,
  PhotoIcon,
  DocumentIcon,
  FilmIcon,
  MusicalNoteIcon,
  ChatBubbleLeftRightIcon,
  TrashIcon,
  PencilIcon,
  ClipboardDocumentIcon,
  ExclamationTriangleIcon,
  CheckIcon
} from '@heroicons/react/24/outline';
import { 
  UserIcon as SolidUserIcon
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
  const [searchQuery] = useState('');
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
  const [editingMessage, setEditingMessage] = useState(null);
  const [replyingTo, setReplyingTo] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  
  // WebRTC refs  
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
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
    };
  }, [user, navigate, loadFriends, loadConversations, setupSocketListeners, cleanupSocketListeners]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation._id || selectedConversation.id);
    }
  }, [selectedConversation, loadMessages]);

  // API Functions
  const loadFriends = useCallback(async () => {
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
  }, []);

  const loadConversations = useCallback(async () => {
    try {
      const response = await axios.get('/friends/conversations');
      setConversations(response.data || []);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  }, []);

  const loadMessages = useCallback(async (conversationId) => {
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
  }, []);

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


  // Socket event setup and handlers
  const setupSocketListeners = useCallback(() => {
    socketService.on('dm:receive', handleReceiveMessage);
    socketService.on('dm:sent', handleMessageSent);
    socketService.on('dm:typing', handleUserTyping);
    socketService.on('dm:stop-typing', handleUserStopTyping);
    socketService.on('friend:request:received', handleFriendRequest);
    socketService.on('friend:request:accepted', handleFriendAccepted);
    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);
  }, []);

  const cleanupSocketListeners = useCallback(() => {
    socketService.off('dm:receive');
    socketService.off('dm:sent');
    socketService.off('dm:typing');
    socketService.off('dm:stop-typing');
    socketService.off('friend:request:received');
    socketService.off('friend:request:accepted');
    socketService.off('user:online');
    socketService.off('user:offline');
  }, []);


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

  const formatMessageTimeHover = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    });
  };

  const formatMessageContent = (content) => {
    // For now, return simple text - can be enhanced with proper markdown parsing
    return content;
  };

  const renderAttachment = (attachment) => {
    const { type, url, name, size } = attachment;
    
    if (type?.startsWith('image/')) {
      return (
        <div className="max-w-md">
          <img 
            src={url} 
            alt={name}
            className="rounded-lg max-w-full h-auto cursor-pointer hover:opacity-90"
            onClick={() => window.open(url, '_blank')}
          />
        </div>
      );
    }
    
    if (type?.startsWith('video/')) {
      return (
        <div className="max-w-md">
          <video 
            src={url} 
            controls
            className="rounded-lg max-w-full h-auto"
          />
        </div>
      );
    }
    
    return (
      <div className="flex items-center space-x-3 bg-[#2f3136] border border-[#202225] rounded p-3 max-w-md">
        <div className="flex-shrink-0">
          {type?.startsWith('image/') && <PhotoIcon className="w-8 h-8 text-[#b9bbbe]" />}
          {type?.startsWith('video/') && <FilmIcon className="w-8 h-8 text-[#b9bbbe]" />}
          {type?.startsWith('audio/') && <MusicalNoteIcon className="w-8 h-8 text-[#b9bbbe]" />}
          {!type?.match(/^(image|video|audio)\//) && <DocumentIcon className="w-8 h-8 text-[#b9bbbe]" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[#00aff4] hover:underline cursor-pointer truncate">{name}</div>
          <div className="text-xs text-[#b9bbbe]">{formatFileSize(size)}</div>
        </div>
        <button className="flex-shrink-0 p-1 hover:bg-[#393c43] rounded">
          <svg className="w-5 h-5 text-[#b9bbbe]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </button>
      </div>
    );
  };

  const renderEmbed = (embed) => {
    return (
      <div className="border-l-4 border-[#5865f2] bg-[#2f3136] p-4 rounded-r max-w-md">
        {embed.title && (
          <div className="font-semibold text-[#00aff4] hover:underline cursor-pointer mb-1">
            {embed.title}
          </div>
        )}
        {embed.description && (
          <div className="text-[#dcddde] text-sm mb-2">
            {embed.description}
          </div>
        )}
        {embed.image && (
          <img 
            src={embed.image} 
            alt=""
            className="rounded max-w-full h-auto"
          />
        )}
      </div>
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const openUserProfile = (user) => {
    // Open user profile modal
    console.log('Opening profile for:', user);
  };

  const startEditMessage = (message) => {
    setEditingMessage(message);
  };

  const handleEditKeyDown = async (e, message) => {
    if (e.key === 'Enter') {
      const newContent = e.target.value.trim();
      if (newContent && newContent !== message.content) {
        try {
          await axios.put(`/dm/messages/${message.id}`, { content: newContent });
          setMessages(prev => prev.map(msg => 
            msg.id === message.id ? { ...msg, content: newContent, edited: true } : msg
          ));
          toast.success('Message edited');
        } catch (error) {
          toast.error('Failed to edit message');
        }
      }
      setEditingMessage(null);
    } else if (e.key === 'Escape') {
      setEditingMessage(null);
    }
  };

  const copyMessage = (content) => {
    navigator.clipboard.writeText(content);
    toast.success('Message copied to clipboard');
  };

  const deleteMessage = async (messageId) => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      try {
        await axios.delete(`/dm/messages/${messageId}`);
        setMessages(prev => prev.filter(msg => msg.id !== messageId));
        toast.success('Message deleted');
      } catch (error) {
        toast.error('Failed to delete message');
      }
    }
  };

  const addReaction = async (messageId, emoji) => {
    try {
      await axios.post(`/dm/messages/${messageId}/reactions`, { emoji });
      // Update local state optimistically
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.emoji === emoji);
          
          if (existingReaction) {
            if (!existingReaction.users.includes(user._id)) {
              existingReaction.users.push(user._id);
              existingReaction.count++;
            }
          } else {
            reactions.push({
              emoji,
              count: 1,
              users: [user._id]
            });
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));
    } catch (error) {
      toast.error('Failed to add reaction');
    }
  };

  const toggleReaction = async (messageId, emoji) => {
    try {
      await axios.post(`/dm/messages/${messageId}/reactions/toggle`, { emoji });
      // Update local state
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const reactionIndex = reactions.findIndex(r => r.emoji === emoji);
          
          if (reactionIndex !== -1) {
            const reaction = reactions[reactionIndex];
            const userIndex = reaction.users.indexOf(user._id);
            
            if (userIndex !== -1) {
              reaction.users.splice(userIndex, 1);
              reaction.count--;
              
              if (reaction.count === 0) {
                reactions.splice(reactionIndex, 1);
              }
            } else {
              reaction.users.push(user._id);
              reaction.count++;
            }
          }
          
          return { ...msg, reactions };
        }
        return msg;
      }));
    } catch (error) {
      toast.error('Failed to toggle reaction');
    }
  };

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    } else if (e.key === 'Escape' && replyingTo) {
      setReplyingTo(null);
    }
  };

  const handleFileSelect = (files) => {
    if (!files || files.length === 0) return;
    
    const fileArray = Array.from(files);
    console.log('Selected files:', fileArray);
    
    // TODO: Implement file upload
    toast.success(`Selected ${fileArray.length} file(s) for upload`);
  };

  const handleFileDrop = (files) => {
    handleFileSelect(files);
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
                const prevMessage = messages[index - 1];
                const showTime = showAvatar || (prevMessage && new Date(message.timestamp) - new Date(prevMessage.timestamp) > 300000); // 5 minutes
                
                return (
                  <div 
                    key={message.id || index} 
                    className={`message-container group relative px-4 py-0.5 hover:bg-[#32353b] ${
                      hoveredMessage === message.id ? 'bg-[#32353b]' : ''
                    }`}
                    onMouseEnter={() => setHoveredMessage(message.id)}
                    onMouseLeave={() => setHoveredMessage(null)}
                  >
                    {/* Message Actions */}
                    <div className={`absolute right-4 top-2 flex items-center space-x-1 bg-[#2f3136] border border-[#202225] rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10`}>
                      <button 
                        onClick={() => addReaction(message.id, '👍')}
                        className="p-2 hover:bg-[#393c43] rounded text-[#b9bbbe] hover:text-white"
                        title="Add reaction"
                      >
                        <FaceSmileIcon className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setReplyingTo(message)}
                        className="p-2 hover:bg-[#393c43] rounded text-[#b9bbbe] hover:text-white"
                        title="Reply"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                      </button>
                      {isOwn && (
                        <button 
                          onClick={() => startEditMessage(message)}
                          className="p-2 hover:bg-[#393c43] rounded text-[#b9bbbe] hover:text-white"
                          title="Edit"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      )}
                      <button 
                        onClick={() => copyMessage(message.content)}
                        className="p-2 hover:bg-[#393c43] rounded text-[#b9bbbe] hover:text-white"
                        title="Copy text"
                      >
                        <ClipboardDocumentIcon className="w-4 h-4" />
                      </button>
                      {isOwn && (
                        <button 
                          onClick={() => deleteMessage(message.id)}
                          className="p-2 hover:bg-[#393c43] rounded text-red-400 hover:text-red-300"
                          title="Delete"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex">
                      {/* Avatar */}
                      <div className="w-10 mr-3 flex-shrink-0">
                        {showAvatar ? (
                          <img
                            src={message.sender?.avatar || `https://ui-avatars.com/api/?name=${message.sender?.username}`}
                            alt={message.sender?.username}
                            className="w-10 h-10 rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => openUserProfile(message.sender)}
                          />
                        ) : (
                          <div className="w-10 h-5 flex items-center justify-center">
                            {showTime && (
                              <span className="text-xs text-[#72767d] opacity-0 group-hover:opacity-100 transition-opacity">
                                {formatMessageTimeHover(message.timestamp)}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        {showAvatar && (
                          <div className="flex items-baseline mb-1">
                            <span 
                              className="font-semibold text-white hover:underline cursor-pointer mr-2"
                              onClick={() => openUserProfile(message.sender)}
                            >
                              {message.sender?.displayName || message.sender?.username}
                            </span>
                            <span className="text-xs text-[#72767d]">
                              {formatMessageTime(message.timestamp || message.createdAt)}
                            </span>
                            {message.edited && (
                              <span className="text-xs text-[#72767d] ml-1">(edited)</span>
                            )}
                          </div>
                        )}

                        {/* Reply Reference */}
                        {message.replyTo && (
                          <div className="flex items-center mb-1 text-xs text-[#b9bbbe] hover:text-white cursor-pointer">
                            <svg className="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 117 7v-1a1 1 0 112 0v1a9 9 0 01-9 9H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                            <img 
                              src={message.replyTo.sender?.avatar || `https://ui-avatars.com/api/?name=${message.replyTo.sender?.username}`}
                              className="w-4 h-4 rounded-full mr-1"
                              alt=""
                            />
                            <span className="font-semibold mr-1">{message.replyTo.sender?.username}</span>
                            <span className="truncate max-w-[200px]">{message.replyTo.content}</span>
                          </div>
                        )}

                        {/* Message Body */}
                        <div className="message-content">
                          {editingMessage?.id === message.id ? (
                            /* Edit Mode */
                            <div className="bg-[#40444b] rounded p-2">
                              <input
                                type="text"
                                defaultValue={message.content}
                                onKeyDown={(e) => handleEditKeyDown(e, message)}
                                onBlur={() => setEditingMessage(null)}
                                autoFocus
                                className="w-full bg-transparent text-[#dcddde] focus:outline-none"
                              />
                              <div className="text-xs text-[#72767d] mt-1">
                                escape to <span className="text-[#00aff4]">cancel</span> • enter to <span className="text-[#00aff4]">save</span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[#dcddde] break-words">
                              {/* Regular text content */}
                              <span>{formatMessageContent(message.content)}</span>
                              
                              {/* Attachments */}
                              {message.attachments?.map((attachment, i) => (
                                <div key={i} className="mt-2">
                                  {renderAttachment(attachment)}
                                </div>
                              ))}
                              
                              {/* Embeds */}
                              {message.embeds?.map((embed, i) => (
                                <div key={i} className="mt-2">
                                  {renderEmbed(embed)}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Message Status */}
                          {isOwn && (
                            <div className="flex items-center justify-end mt-1">
                              {message.status === 'sending' && (
                                <div className="w-4 h-4 border-2 border-[#72767d] border-t-transparent rounded-full animate-spin"></div>
                              )}
                              {message.status === 'sent' && (
                                <CheckIcon className="w-4 h-4 text-[#72767d]" />
                              )}
                              {message.status === 'failed' && (
                                <ExclamationTriangleIcon className="w-4 h-4 text-red-400" />
                              )}
                            </div>
                          )}

                          {/* Reactions */}
                          {message.reactions && message.reactions.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {message.reactions.map((reaction, i) => (
                                <button
                                  key={i}
                                  onClick={() => toggleReaction(message.id, reaction.emoji)}
                                  className={`flex items-center space-x-1 px-1.5 py-0.5 rounded text-xs border ${
                                    reaction.users.includes(user._id) 
                                      ? 'bg-[#5865f2]/20 border-[#5865f2] text-[#5865f2]' 
                                      : 'bg-[#2f3136] border-[#4f545c] text-[#b9bbbe] hover:border-[#72767d]'
                                  }`}
                                >
                                  <span>{reaction.emoji}</span>
                                  <span>{reaction.count}</span>
                                </button>
                              ))}
                              <button
                                onClick={() => setShowEmojiPicker(message.id)}
                                className="flex items-center justify-center w-6 h-6 rounded border border-[#4f545c] text-[#b9bbbe] hover:border-[#72767d] hover:text-white"
                              >
                                <PlusCircleIcon className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
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
          <div className="px-4 pb-4">
            {/* Reply Indicator */}
            {replyingTo && (
              <div className="bg-[#2f3136] border-l-4 border-[#4f545c] px-3 py-2 mb-2 rounded-r flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-[#b9bbbe]" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M7.707 3.293a1 1 0 010 1.414L5.414 7H11a7 7 0 117 7v-1a1 1 0 112 0v1a9 9 0 01-9 9H5.414l2.293 2.293a1 1 0 11-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs text-[#b9bbbe]">
                    Replying to <span className="text-white font-semibold">{replyingTo.sender?.username}</span>
                  </span>
                  <span className="text-xs text-[#72767d] truncate max-w-[200px]">{replyingTo.content}</span>
                </div>
                <button 
                  onClick={() => setReplyingTo(null)}
                  className="text-[#b9bbbe] hover:text-white"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* File Upload Area */}
            <div 
              className={`${isDragOver ? 'border-[#5865f2] bg-[#5865f2]/10' : 'border-transparent'} border-2 border-dashed rounded-lg transition-all`}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragOver(true);
              }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragOver(false);
                handleFileDrop(e.dataTransfer.files);
              }}
            >
              <form onSubmit={sendMessage}>
                <div className="bg-[#40444b] rounded-lg flex items-end min-h-[44px]">
                  {/* File Upload Button */}
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-[#b9bbbe] hover:text-[#dcddde] p-3 flex-shrink-0"
                    title="Upload a file"
                  >
                    <PlusCircleIcon className="w-6 h-6" />
                  </button>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    className="hidden"
                    onChange={(e) => handleFileSelect(e.target.files)}
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
                  />

                  {/* Message Input */}
                  <div className="flex-1 min-h-[44px] max-h-[200px] overflow-y-auto">
                    <textarea
                      ref={messageInputRef}
                      value={messageInput}
                      onChange={handleTyping}
                      onKeyDown={handleInputKeyDown}
                      placeholder={`Message @${selectedConversation.friend?.username}`}
                      className="w-full bg-transparent text-[#dcddde] py-3 px-0 resize-none focus:outline-none placeholder-[#72767d] min-h-[44px]"
                      disabled={sendingMessage}
                      rows={1}
                      style={{ 
                        height: 'auto',
                        minHeight: '44px'
                      }}
                      onInput={(e) => {
                        e.target.style.height = 'auto';
                        e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                      }}
                    />
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 p-3 flex-shrink-0">
                    <button 
                      type="button" 
                      className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
                      title="Send a gift"
                    >
                      <GiftIcon className="w-5 h-5" />
                    </button>
                    <button 
                      type="button" 
                      className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
                      title="Upload an image"
                      onClick={() => {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = 'image/*';
                        input.onchange = (e) => handleFileSelect(e.target.files);
                        input.click();
                      }}
                    >
                      <PhotoIcon className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button 
                        type="button" 
                        onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                        className="text-[#b9bbbe] hover:text-[#dcddde] transition-colors"
                        title="Add emoji"
                      >
                        <FaceSmileIcon className="w-5 h-5" />
                      </button>
                      
                      {/* Simple Emoji Picker */}
                      {showEmojiPicker && (
                        <div className="absolute bottom-full right-0 mb-2 bg-[#2f3136] border border-[#202225] rounded-lg shadow-lg p-3 z-50">
                          <div className="grid grid-cols-8 gap-1">
                            {['😀', '😃', '😄', '😁', '😅', '😂', '🤣', '😊', '😇', '🙂', '🙃', '😉', '😌', '😍', '🥰', '😘', '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪', '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒'].map(emoji => (
                              <button
                                key={emoji}
                                type="button"
                                onClick={() => {
                                  setMessageInput(prev => prev + emoji);
                                  setShowEmojiPicker(false);
                                }}
                                className="text-lg hover:bg-[#393c43] rounded p-1"
                              >
                                {emoji}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                    
                    {/* Send Button */}
                    {messageInput.trim() && (
                      <button
                        type="submit"
                        disabled={sendingMessage}
                        className="bg-[#5865f2] hover:bg-[#4752c4] disabled:opacity-50 text-white p-2 rounded-full transition-colors"
                        title="Send message"
                      >
                        {sendingMessage ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        ) : (
                          <PaperAirplaneIcon className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>

                {/* File Preview Area */}
                <div className="mt-2 space-y-2">
                  {/* Show selected files for upload */}
                </div>

                {/* Discord-style hints */}
                <div className="flex items-center justify-between text-xs text-[#72767d] mt-1 px-1">
                  <div className="flex items-center space-x-4">
                    <span>Use <kbd className="bg-[#2f3136] px-1 rounded">Shift+Enter</kbd> for new line</span>
                    {replyingTo && (
                      <span>Use <kbd className="bg-[#2f3136] px-1 rounded">Escape</kbd> to cancel reply</span>
                    )}
                  </div>
                  {messageInput.length > 1900 && (
                    <span className={`${messageInput.length > 2000 ? 'text-red-400' : 'text-yellow-400'}`}>
                      {2000 - messageInput.length}
                    </span>
                  )}
                </div>
              </form>
            </div>
          </div>
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
