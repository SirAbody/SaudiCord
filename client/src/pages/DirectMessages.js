// Direct Messages Page Component
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  UserPlusIcon, 
  UserIcon,
  PhoneIcon, 
  VideoCameraIcon, 
  ComputerDesktopIcon,
  EllipsisHorizontalIcon,
  EllipsisVerticalIcon,
  PaperAirplaneIcon,
  XMarkIcon,
  ChatBubbleLeftIcon 
} from '@heroicons/react/24/outline';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import socketService from '../services/socket';
import MessageContextMenu from '../components/chat/MessageContextMenu';
import UserProfilePopup from '../components/user/UserProfilePopup';
import CallInterface from '../components/call/CallInterface';
import notificationService from '../services/notificationService';
import messageCache from '../services/messageCache';
// import webrtcService from '../services/webrtc';

function DirectMessages() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const selectedConversationRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const iceCandidatesQueue = useRef([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState(null);
  const messagesEndRef = useRef(null);
  const [showAddFriend, setShowAddFriend] = useState(false);
  const [friendUsername, setFriendUsername] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [inCall, setInCall] = useState(false);
  const [callType, setCallType] = useState(null); // 'voice' or 'video'
  const [callTarget, setCallTarget] = useState(null); // User being called
  const [incomingCall, setIncomingCall] = useState(null); // Incoming call data
  const [isCallConnected, setIsCallConnected] = useState(false); // Track actual connection status
  const [loading, setLoading] = useState(false); // eslint-disable-line no-unused-vars
  const [activeTab, setActiveTab] = useState('online');
  const [contextMenu, setContextMenu] = useState(null);
  const [userProfilePopup, setUserProfilePopup] = useState(null);
  const [friends, setFriends] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [conversations, setConversations] = useState([]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    loadFriends();
    loadConversations();
    setupSocketListeners();
    setupWebRTCListeners();
    
    // Listen for friends update event
    const handleFriendsUpdate = () => {
      loadFriends();
    };
    
    window.addEventListener('friendsUpdate', handleFriendsUpdate);
    
    return () => {
      window.removeEventListener('friendsUpdate', handleFriendsUpdate);
      
      // Clean up WebRTC
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach(track => track.stop());
        localStreamRef.current = null;
      }
      
      // Clean up socket listeners
      socketService.off('webrtc:offer');
      socketService.off('webrtc:answer');
      socketService.off('webrtc:ice-candidate');
      socketService.off('dm:receive');
      socketService.off('dm:sent');
      socketService.off('friend:request');
      socketService.off('friend:accepted');
      socketService.off('call:incoming');
      socketService.off('call:rejected');
      socketService.off('call:ended');
      socketService.off('user:online');
      socketService.off('user:offline');
      socketService.off('dm:typing');
      socketService.off('dm:stop-typing');
    };
  }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  
  // Update ref when selectedConversation changes
  useEffect(() => {
    selectedConversationRef.current = selectedConversation;
  }, [selectedConversation]);
  
  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // WebRTC Socket Event Handlers
  const setupWebRTCListeners = () => {
    // Handle WebRTC offer
    socketService.on('webrtc:offer', async (data) => {
      console.log('[WebRTC] Received offer from:', data.senderId);
      
      if (!peerConnectionRef.current) {
        // Initialize WebRTC if not already done
        await initializeWebRTC({ callerId: data.senderId, type: callType || 'voice' });
      }
      
      try {
        const pc = peerConnectionRef.current;
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        
        // Process any queued ICE candidates
        while (iceCandidatesQueue.current.length > 0) {
          const candidate = iceCandidatesQueue.current.shift();
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[WebRTC] Applied queued ICE candidate');
        }
        
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        
        console.log('[WebRTC] Sending answer to:', data.senderId);
        socketService.emit('webrtc:answer', {
          targetUserId: data.senderId,
          answer: answer
        });
      } catch (error) {
        console.error('[WebRTC] Error handling offer:', error);
      }
    });
    
    // Handle WebRTC answer
    socketService.on('webrtc:answer', async (data) => {
      console.log('[WebRTC] Received answer from:', data.senderId);
      
      try {
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(
            new RTCSessionDescription(data.answer)
          );
          console.log('[WebRTC] Remote description set successfully');
          
          // Process any queued ICE candidates
          while (iceCandidatesQueue.current.length > 0) {
            const candidate = iceCandidatesQueue.current.shift();
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate));
            console.log('[WebRTC] Applied queued ICE candidate');
          }
        }
      } catch (error) {
        console.error('[WebRTC] Error handling answer:', error);
      }
    });
    
    // Handle ICE candidates
    socketService.on('webrtc:ice-candidate', async (data) => {
      const senderId = data.senderId || data.userId;
      console.log('[WebRTC] Received ICE candidate from:', senderId);
      
      try {
        if (peerConnectionRef.current && peerConnectionRef.current.remoteDescription) {
          await peerConnectionRef.current.addIceCandidate(
            new RTCIceCandidate(data.candidate)
          );
          console.log('[WebRTC] ICE candidate added successfully');
        } else {
          console.log('[WebRTC] Queueing ICE candidate - no remote description yet');
          iceCandidatesQueue.current.push(data.candidate);
        }
      } catch (error) {
        console.error('[WebRTC] Error adding ICE candidate:', error);
      }
    });
  };
  
  const setupSocketListeners = () => {
    // First, remove any existing listeners to prevent duplicates
    socketService.off('friend:request:received');
    socketService.off('friend:request:accepted');
    socketService.off('dm:receive');
    socketService.off('dm:sent');
    socketService.off('call:incoming');
    socketService.off('call:rejected');
    socketService.off('call:ended');
    socketService.off('user:online');
    socketService.off('user:offline');
    socketService.off('user:status:changed');
    socketService.off('friend:removed');
    socketService.off('dm:typing');
    socketService.off('dm:stop-typing');
    
    // Handle friend request received - Real-time
    socketService.on('friend:request:received', (data) => {
      console.log('[Friend] Request received:', data);
      loadFriends(); // Reload friends to update pending requests
      toast.success(`${data.from.username} sent you a friend request!`);
    });

    // Handle friend request accepted - Real-time
    socketService.on('friend:request:accepted', (data) => {
      console.log('[Friend] Request accepted:', data);
      loadFriends(); // Reload friends list
      toast.success(`${data.username} accepted your friend request!`);
    });

    // Handle incoming DM - ENHANCED
    const handleIncomingMessage = (message) => {
      console.log('[DM] Received message:', message);
      console.log('[DM] Current user:', user);
      console.log('[DM] Selected conversation (from ref):', selectedConversationRef.current);
      
      // Use ref to get current selectedConversation
      const currentSelectedConv = selectedConversationRef.current;
      
      // Parse sender and current user IDs properly - handle all formats
      const msgSenderId = (message.senderId?._id || message.senderId || message.sender?._id || message.sender || '').toString();
      const msgReceiverId = (message.receiverId?._id || message.receiverId || message.receiver?._id || message.receiver || '').toString();
      const currentUserId = (user?.id || user?._id || '').toString();
      const selectedId = (currentSelectedConv?.id || currentSelectedConv?._id || '').toString();
      
      console.log('[DM] Parsed IDs:', { 
        msgSenderId, 
        msgReceiverId, 
        currentUserId, 
        selectedId,
        isFromSelected: msgSenderId === selectedId,
        isToSelected: msgReceiverId === selectedId,
        isFromMe: msgSenderId === currentUserId
      });
      
      // Check if message is for current conversation (both sent and received)
      const isForCurrentConv = selectedId && (
        (msgSenderId === selectedId) || // Message from selected friend
        (msgReceiverId === selectedId && msgSenderId === currentUserId) // Message we sent to selected friend
      );
      
      if (isForCurrentConv) {
        console.log('[DM] Adding message to current conversation');
        setMessages(prev => {
          // Check if message already exists (prevent duplicates)
          const exists = prev.some(m => 
            (m.id && message.id && m.id.toString() === message.id.toString()) || 
            (m._id && message._id && m._id.toString() === message._id.toString()) || 
            (m.tempId && message.tempId && m.tempId === message.tempId)
          );
          
          if (!exists) {
            // Format message properly
            const formattedMessage = {
              ...message,
              id: message.id || message._id,
              _id: message._id || message.id,
              timestamp: message.timestamp || message.createdAt || new Date(),
              confirmed: true
            };
            return [...prev, formattedMessage].sort((a, b) => 
              new Date(a.timestamp || a.createdAt) - new Date(b.timestamp || b.createdAt)
            );
          }
          
          // If message exists with tempId, replace with confirmed version
          if (message.tempId) {
            return prev.map(m => {
              if (m.tempId === message.tempId) {
                return { ...message, confirmed: true };
              }
              return m;
            });
          }
          
          return prev;
        });
      } 
      
      // Show notification for messages from others
      const isOwnMessage = msgSenderId === currentUserId;
      if (!isOwnMessage) {
        // Play notification sound (if file exists)
        // const audio = new Audio('/sounds/notification.mp3');
        // audio.play().catch(e => console.log('Could not play sound:', e));
        
        // Show toast notification
        toast(`💬 ${message.senderName || 'Someone'} sent you a message`, {
          duration: 4000,
          style: {
            background: '#1a1a1a',
            color: '#fff',
            border: '1px solid #53FC18'
          }
        });
      }
      
      // Update conversation list
      loadConversations();
    };
    
    // Attach the message handler
    socketService.on('dm:receive', handleIncomingMessage);
    
    // Handle message sent confirmation
    socketService.on('dm:sent', (data) => {
      console.log('[DM] Message sent confirmation:', data);
      // Replace temp message with confirmed one
      setMessages(prev => {
        return prev.map(m => {
          if (m.tempId === data.tempId) {
            // Replace temp message with confirmed version
            return { 
              ...data, 
              confirmed: true,
              id: data.id || data._id,
              _id: data._id || data.id,
              timestamp: data.timestamp || data.createdAt || new Date()
            };
          }
          return m;
        });
      });
    });
    
    // Handle message error
    socketService.on('dm:error', (data) => {
      console.error('[DM] Message error:', data);
      if (data.tempId) {
        // Remove failed message
        setMessages(prev => prev.filter(m => m.tempId !== data.tempId));
        toast.error(data.message || 'Failed to send message');
      }
    });

    socketService.on('friend:request', (data) => {
      toast(`${data.username} sent you a friend request!`);
      loadFriends();
    });

    socketService.on('friend:accepted', (data) => {
      toast.success(`${data.username} accepted your friend request!`);
      loadFriends();
    });

    // Handle user status changes - REAL TIME
    socketService.on('user:online', (data) => {
      console.log('[Status] User came online:', data);
      setFriends(prev => prev.map(friend => {
        if (friend.id === data.userId || friend._id === data.userId) {
          return { ...friend, status: 'online' };
        }
        return friend;
      }));
    });

    socketService.on('user:offline', (data) => {
      console.log('[Status] User went offline:', data);
      setFriends(prev => prev.map(friend => {
        if (friend.id === data.userId || friend._id === data.userId) {
          return { ...friend, status: 'offline' };
        }
        return friend;
      }));
    });

    // Handle typing indicators
    socketService.on('dm:typing', (data) => {
      const currentSelectedConv = selectedConversationRef.current;
      const selectedId = (currentSelectedConv?.id || currentSelectedConv?._id || '').toString();
      const senderId = (data.senderId || data.userId || '').toString();
      
      if (selectedId && senderId && selectedId === senderId) {
        setIsTyping(true);
      }
    });

    socketService.on('dm:stop-typing', (data) => {
      const currentSelectedConv = selectedConversationRef.current;
      const selectedId = (currentSelectedConv?.id || currentSelectedConv?._id || '').toString();
      const senderId = (data.senderId || data.userId || '').toString();
      
      if (selectedId && senderId && selectedId === senderId) {
        setIsTyping(false);
      }
    });

    // Handle incoming calls
    socketService.on('call:incoming', (data) => {
      console.log('[DM] Incoming call:', data);
      
      // Set incoming call state
      setIncomingCall(data);
      
      // Show incoming call notification with better UI
      const audio = new Audio('/sounds/ringtone.mp3');
      audio.loop = true;
      audio.play().catch(e => console.log('Could not play ringtone:', e));
      
      // Create notification with accept/reject buttons
      toast.custom(
        (t) => (
          <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} max-w-md w-full bg-black border border-primary-500 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
            <div className="flex-1 w-0 p-4">
              <div className="flex items-start">
                <div className="flex-shrink-0 pt-0.5">
                  <div className="h-10 w-10 bg-primary-500 rounded-full flex items-center justify-center">
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
                className="w-full border border-transparent rounded-none rounded-r-lg p-4 flex items-center justify-center text-sm font-medium text-primary-500 hover:bg-primary-500/20 focus:outline-none"
              >
                Reject
              </button>
            </div>
          </div>
        ),
        { duration: 30000 } // 30 seconds to answer
      );
    });
    
    // Handle call accepted (for the caller)
    socketService.on('call:accepted', async (data) => {
      console.log('[DM] Call accepted:', data);
      console.log('[DM] Current callTarget:', callTarget);
      
      // Check if we already have a peer connection
      if (peerConnectionRef.current) {
        console.log('[DM] WebRTC already initialized, skipping re-initialization');
        return;
      }
      
      toast.success('Call connected!');
      
      // The caller should already have callTarget set from startCall
      const target = selectedConversationRef.current || callTarget;
      if (!target) {
        console.error('[DM] No callTarget set for caller!');
        return;
      }
      
      // Initialize WebRTC connection for the caller
      await initializeWebRTC({ 
        ...data,
        accepterId: data.accepterId,
        targetId: target.id || target._id,
        isCaller: true 
      });
    });
    
    // Handle call rejected
    socketService.on('call:rejected', (data) => {
      console.log('[DM] Call rejected:', data);
      setInCall(false);
      setCallType(null);
      setCallTarget(null);
      toast.error('Call was rejected');
    });
    
    // Handle call ended
    socketService.on('call:ended', (data) => {
      console.log('[DM] Call ended:', data);
      setInCall(false);
      setCallType(null);
      setCallTarget(null);
      setIncomingCall(null);
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
      // Check cache first
      const cachedMessages = messageCache.getMessages(userId, user?.id);
      if (cachedMessages) {
        console.log('[DM] Loading messages from cache');
        setMessages(cachedMessages);
        
        // Still fetch fresh data in background
        axios.get(`/dm/${userId}`).then(response => {
          const freshMessages = response.data;
          setMessages(freshMessages);
          messageCache.setMessages(userId, user?.id, freshMessages);
        }).catch(error => {
          console.error('Failed to refresh messages:', error);
        });
      } else {
        // No cache, fetch from server
        const response = await axios.get(`/dm/${userId}`);
        const freshMessages = response.data;
        setMessages(freshMessages);
        messageCache.setMessages(userId, user?.id, freshMessages);
      }
    } catch (error) {
      console.error('Failed to load messages:', error);
      // Try to use cache if available
      const cachedMessages = messageCache.getMessages(userId, user?.id);
      if (cachedMessages) {
        setMessages(cachedMessages);
        toast.error('Using cached messages - connection issue');
      }
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

  const startCall = (type, target) => {
    console.log(`[DM] Starting ${type} call with:`, target);
    
    // Set call target BEFORE initiating
    setCallTarget(target);
    setInCall(true);
    setCallType(type);
    
    // Send call invitation
    socketService.emit('call:initiate', {
      targetUserId: target.id || target._id,
      callType: type,
      channelId: null // For DMs
    });
    
    toast(`Calling ${target.username || target.displayName}...`);
  };

  const startVoiceCall = async () => {
    if (!selectedConversation) {
      toast.error('Please select a friend first');
      return;
    }
    startCall('voice', selectedConversation);
  };

  const startVideoCall = async () => {
    if (!selectedConversation) {
      toast.error('Please select a friend first');
      return;
    }
    startCall('video', selectedConversation);
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

  const acceptCall = async (callData) => {
    console.log('[DM] Accepting call:', callData);
    
    // Find the caller in friends list
    const caller = friends.find(f => 
      f.id === callData.callerId || 
      f._id === callData.callerId
    );
    const target = caller || { 
      id: callData.callerId, 
      username: callData.callerName 
    };
    
    setCallTarget(target);
    setInCall(true);
    setCallType(callData.type);
    setIncomingCall(null);
    
    // Send acceptance first  
    socketService.emit('call:accept', {
      callerId: callData.callerId,
      type: callData.type
    });
    
    // Then initialize WebRTC for the receiver
    await initializeWebRTC({ 
      callerId: callData.callerId, 
      type: callData.type,
      isReceiver: true 
    });
  };
  
  const rejectCall = (callData) => {
    console.log('[DM] Rejecting call:', callData);
    socketService.emit('call:reject', {
      callerId: callData.callerId
    });
    setIncomingCall(null);
  };

  const endCall = () => {
    console.log('[DM] Ending call');
    
    // Clean up WebRTC connections
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log('[WebRTC] Stopped local track:', track.kind);
      });
      localStreamRef.current = null;
    }
    
    // Clear remote stream
    if (remoteStreamRef.current) {
      remoteStreamRef.current = null;
    }
    
    // Clear audio/video elements
    const remoteAudio = document.getElementById('remote-audio');
    const remoteVideo = document.getElementById('remote-video');
    if (remoteAudio) remoteAudio.srcObject = null;
    if (remoteVideo) remoteVideo.srcObject = null;
    
    // Clear ICE candidates queue
    iceCandidatesQueue.current = [];
    
    // Notify other user
    if (callTarget) {
      socketService.emit('call:end', {
        targetUserId: callTarget.id || callTarget._id
      });
    }
    
    // Reset call state
    setInCall(false);
    setCallType(null);
    setCallTarget(null);
    setIncomingCall(null);
    setIsCallConnected(false);
    toast('Call ended');
  };
  
  const initializeWebRTC = async (data) => {
    try {
      console.log('[WebRTC] Initializing WebRTC for call:', data);
      
      // Check if we already have a peer connection
      if (peerConnectionRef.current) {
        console.warn('[WebRTC] Peer connection already exists, closing it first');
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      
      // Clear any existing ICE candidates queue
      iceCandidatesQueue.current = [];
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: data.type === 'video' || callType === 'video'
      });
      
      localStreamRef.current = stream;
      console.log('[WebRTC] Got local stream:', stream);
      
      // Create peer connection with ICE servers
      const configuration = {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:stun2.l.google.com:19302' },
          { urls: 'stun:stun.stunprotocol.org:3478' },
          {
            urls: 'turn:openrelay.metered.ca:80',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          },
          {
            urls: 'turn:openrelay.metered.ca:443',
            username: 'openrelayproject',
            credential: 'openrelayproject'
          }
        ],
        iceCandidatePoolSize: 10
      };
      
      const pc = new RTCPeerConnection(configuration);
      peerConnectionRef.current = pc;
      
      // Add local stream tracks to peer connection
      stream.getTracks().forEach(track => {
        console.log('[WebRTC] Adding track to peer connection:', track.kind);
        pc.addTrack(track, stream);
      });
      
      // Handle incoming remote stream
      pc.ontrack = (event) => {
        console.log('[WebRTC] Received remote track:', event.track.kind);
        if (event.streams && event.streams[0]) {
          remoteStreamRef.current = event.streams[0];
          
          // Play remote audio/video
          const remoteAudio = document.getElementById('remote-audio');
          const remoteVideo = document.getElementById('remote-video');
          
          if (remoteAudio) {
            remoteAudio.srcObject = event.streams[0];
            remoteAudio.play().catch(e => console.error('[WebRTC] Error playing audio:', e));
          }
          
          if (remoteVideo && callType === 'video') {
            remoteVideo.srcObject = event.streams[0];
            remoteVideo.play().catch(e => console.error('[WebRTC] Error playing video:', e));
          }
          
          console.log('[WebRTC] Remote stream connected successfully');
        }
      };
      
      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate) {
          // Determine target ID based on role
          let targetId;
          if (data.isCaller) {
            // Caller sends to accepter
            targetId = data.targetId || data.accepterId || callTarget?.id || callTarget?._id;
          } else {
            // Receiver sends to caller
            targetId = data.callerId || incomingCall?.callerId;
          }
          
          console.log('[WebRTC] Sending ICE candidate to:', targetId);
          
          if (!targetId) {
            console.error('[WebRTC] Cannot send ICE candidate - no target ID');
            return;
          }
          
          socketService.emit('webrtc:ice-candidate', {
            targetUserId: targetId,
            candidate: event.candidate
          });
        }
      };
      
      // Monitor connection state
      pc.onconnectionstatechange = () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
        if (pc.connectionState === 'connected') {
          setIsCallConnected(true);
          toast.success('Call connected!');
        } else if (pc.connectionState === 'failed' || pc.connectionState === 'disconnected') {
          setIsCallConnected(false);
          if (pc.connectionState === 'failed') {
            toast.error('Call connection failed');
            endCall();
          }
        }
      };
      
      // Determine who creates the offer
      // The caller creates the offer after receiving acceptance
      // The receiver waits for the offer
      if (data.isCaller) {
        console.log('[WebRTC] Caller creating offer...');
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        
        // Try multiple sources for targetId
        const targetId = data.targetId || data.accepterId || callTarget?.id || callTarget?._id;
        console.log('[WebRTC] Caller sending offer to:', targetId, 'data:', data, 'callTarget:', callTarget);
        
        if (!targetId) {
          console.error('[WebRTC] No target ID available!');
          console.error('[WebRTC] Data provided:', data);
          console.error('[WebRTC] CallTarget:', callTarget);
          return;
        }
        
        socketService.emit('webrtc:offer', {
          targetUserId: targetId,
          offer: offer
        });
      } else if (data.isReceiver) {
        console.log('[WebRTC] Receiver waiting for offer...');
        // Receiver will handle offer in setupWebRTCListeners
      }
      
    } catch (error) {
      console.error('[WebRTC] Failed to initialize:', error);
      toast.error('Failed to access camera/microphone');
      endCall();
    }
  };
  
  const selectConversation = (friend) => {
    setSelectedConversation(friend);
    
    // Show cached messages immediately for instant loading
    const cachedMessages = messageCache.getMessages(friend.id || friend._id, user?.id);
    if (cachedMessages) {
      setMessages(cachedMessages);
    } else {
      setMessages([]); // Clear messages while loading
    }
    
    // Load fresh messages
    loadMessages(friend.id || friend._id);
  };

  const filteredFriends = friends.filter(friend => 
    (friend.username?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    friend.displayName?.toLowerCase().includes(searchQuery.toLowerCase())) && 
    friend.friendshipStatus === 'accepted' && 
    (activeTab === 'online' ? friend.status === 'online' : true)
  );

  return (
    <div className="flex h-full bg-[#36393f]">
      {/* Discord-style DM Sidebar */}
      <div className="w-60 bg-[#2f3136] flex flex-col">
        {/* Search/Find Conversation */}
        <div className="px-2 pt-2">
          <button className="w-full px-2 py-1 text-[#dcddde] text-sm text-left bg-[#202225] rounded hover:bg-[#40444b] transition">
            Find or start a conversation
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="mt-4 px-2 space-y-1">
          <button
            onClick={() => setActiveTab('friends')}
            className={`w-full px-3 py-2 flex items-center rounded hover:bg-[#393c43] transition ${
              activeTab === 'friends' ? 'bg-[#393c43] text-white' : 'text-[#8e9297]'
            }`}
          >
            <UserIcon className="w-5 h-5 mr-3" />
            <span className="font-medium">Friends</span>
          </button>
          <button className="w-full px-3 py-2 flex items-center text-[#8e9297] rounded hover:bg-[#393c43] hover:text-[#dcddde] transition">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M5.433 21a.12.12 0 01-.118-.141L6 17H2.143a.12.12 0 01-.118-.14l.308-1.76a.12.12 0 01.118-.1H6l.622-3.562H2.768a.12.12 0 01-.118-.141l.308-1.76a.12.12 0 01.118-.099h3.775l.723-4.146a.12.12 0 01.118-.099h1.76a.12.12 0 01.118.141l-.69 3.963h3.562l.723-4.146a.12.12 0 01.118-.099h1.76a.12.12 0 01.118.141l-.69 3.963h3.856a.12.12 0 01.118.14l-.308 1.76a.12.12 0 01-.118.1H15l-.622 3.562h3.856a.12.12 0 01.118.14l-.308 1.76a.12.12 0 01-.118.1h-3.776l-.723 4.146a.12.12 0 01-.118.099h-1.76a.12.12 0 01-.118-.141l.69-3.963H8.562l-.723 4.146a.12.12 0 01-.118.099H5.961a.12.12 0 01-.118-.141l.69-3.963H2.678a.12.12 0 01-.118-.14l.308-1.76a.12.12 0 01.118-.1h3.775l.622-3.562H3.528a.12.12 0 01-.118-.14l.308-1.76a.12.12 0 01.118-.1h3.856l.723-4.146a.12.12 0 01.118-.099h1.76a.12.12 0 01.118.141l-.69 3.963h3.562l.723-4.146a.12.12 0 01.118-.099h1.76a.12.12 0 01.118.141l-.69 3.963h3.856a.12.12 0 01.118.14l-.308 1.76a.12.12 0 01-.118.1H15l-.622 3.562h3.856a.12.12 0 01.118.14l-.308 1.76a.12.12 0 01-.118.1h-3.776l-.723 4.146a.12.12 0 01-.118.099h-1.76a.12.12 0 01-.118-.141l.69-3.963H8.562l-.723 4.146a.12.12 0 01-.118.099H5.961zm3.754-6.342h3.562l.622-3.562H9.809l-.622 3.562z"/>
            </svg>
            <span className="font-medium">Nitro</span>
          </button>
          <button className="w-full px-3 py-2 flex items-center text-[#8e9297] rounded hover:bg-[#393c43] hover:text-[#dcddde] transition">
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
            </svg>
            <span className="font-medium">Shop</span>
          </button>
        </div>
        
        {/* Direct Messages Header */}
        <div className="mt-4 px-3 mb-2 flex items-center justify-between">
          <span className="text-xs font-semibold text-[#8e9297] uppercase">Direct Messages</span>
          <button
            onClick={() => setShowAddFriend(true)}
            className="text-[#dcddde] hover:text-white transition"
          >
            <PlusIcon className="w-4 h-4" />
          </button>
        </div>
        
        {/* DM List */}
        <div className="flex-1 overflow-y-auto px-2">
          {conversations.map(conv => (
            <button
              key={conv.id || conv._id}
              onClick={() => selectConversation(conv)}
              className={`w-full px-2 py-1.5 mb-0.5 flex items-center rounded hover:bg-[#393c43] transition group ${
                selectedConversation?.id === conv.id || selectedConversation?._id === conv._id 
                  ? 'bg-[#393c43]' 
                  : ''
              }`}
            >
              <div className="relative mr-3">
                <div className="w-8 h-8 rounded-full bg-[#36393f] flex items-center justify-center">
                  {conv.avatar ? (
                    <img src={conv.avatar} alt="" className="w-full h-full rounded-full" />
                  ) : (
                    <span className="text-sm text-[#dcddde]">
                      {conv.username?.[0]?.toUpperCase()}
                    </span>
                  )}
                </div>
                {/* Online status indicator */}
                {conv.status === 'online' && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-[#3ba55d] border-2 border-[#2f3136] rounded-full"></div>
                )}
              </div>
              <span className="text-sm text-[#dcddde] font-medium truncate">
                {conv.displayName || conv.username}
              </span>
              {/* Close button */}
              <XMarkIcon className="w-4 h-4 ml-auto text-[#8e9297] opacity-0 group-hover:opacity-100 hover:text-white transition" />
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {activeTab === 'friends' ? (
          <div className="flex-1 flex flex-col">
            {/* Friends Page Header */}
            <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4">
              <UserIcon className="w-5 h-5 text-[#8e9297] mr-2" />
              <span className="text-white font-semibold mr-4">Friends</span>
              <div className="h-6 w-px bg-[#4f545c] mr-4"></div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('online')}
                  className={`px-3 py-1 text-sm font-medium rounded transition ${
                    activeTab === 'online' 
                      ? 'bg-[#4f545c] text-white' 
                      : 'text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]'
                  }`}
                >
                  Online
                </button>
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1 text-sm font-medium rounded transition ${
                    activeTab === 'all' 
                      ? 'bg-[#4f545c] text-white' 
                      : 'text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setActiveTab('pending')}
                  className={`px-3 py-1 text-sm font-medium rounded transition relative ${
                    activeTab === 'pending' 
                      ? 'bg-[#4f545c] text-white' 
                      : 'text-[#b9bbbe] hover:text-white hover:bg-[#4f545c]'
                  }`}
                >
                  Pending
                  {pendingRequests.length > 0 && (
                    <span className="ml-1 px-1.5 bg-[#ed4245] text-white text-xs rounded-full">
                      {pendingRequests.length}
                    </span>
                  )}
                </button>
                <button
                  className="px-3 py-1 text-sm font-medium text-[#b9bbbe] hover:text-white hover:bg-[#4f545c] rounded transition"
                >
                  Blocked
                </button>
              </div>
              
              <button
                onClick={() => setShowAddFriend(true)}
                className="ml-auto px-3 py-1 text-sm font-medium rounded bg-[#3ba55d] hover:bg-[#2d7d46] text-white transition"
              >
                Add Friend
              </button>
            </div>

            {/* Content based on active tab */}
            <div className="flex-1 flex overflow-hidden">
              {/* Sidebar - Friends List (Discord Style: 240px) */}
              <div className="w-60 bg-gray-900 flex flex-col border-r border-gray-800 flex-shrink-0">
            {activeTab === 'addFriend' ? (
              // Add Friend Tab - Beautiful Design
              <div className="p-8">
                <div className="bg-gradient-to-br from-primary-600 to-primary-700 rounded-xl p-6 shadow-xl shadow-green-900/20">
                  <h2 className="text-2xl font-bold text-white mb-3 flex items-center">
                    <UserPlusIcon className="w-7 h-7 mr-2" />
                    ADD FRIEND
                  </h2>
                  <p className="text-green-100 text-sm mb-6">
                    Connect with friends using their username
                  </p>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={friendUsername}
                      onChange={(e) => setFriendUsername(e.target.value)}
                      placeholder="Enter a Username#0000"
                      className="w-full bg-black/50 text-white px-4 py-3 rounded-lg border border-primary-500/30 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-primary-500/20 placeholder-primary-400/50"
                      onKeyPress={(e) => e.key === 'Enter' && sendFriendRequest()}
                    />
                    <button
                      onClick={sendFriendRequest}
                      className="w-full px-6 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg hover:from-primary-600 hover:to-primary-700 transition-all duration-200 font-semibold shadow-lg shadow-green-500/30 transform hover:scale-105"
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
                <h3 className="text-xs font-semibold text-primary-400 uppercase mb-4">
                  Pending — {pendingRequests.length}
                </h3>
                {pendingRequests.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-primary-400">There are no pending friend requests.</p>
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
                            <p className="text-primary-400 text-sm">
                              {request.isReceiver ? 'Incoming Friend Request' : 'Outgoing Friend Request'}
                            </p>
                          </div>
                        </div>
                        {request.isReceiver ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => acceptFriendRequest(request.friendshipId)}
                              className="accept-btn px-4 py-2 rounded font-medium text-sm flex items-center gap-2 transition-all"
                              style={{ backgroundColor: '#53FC18', color: '#1e1e1e' }}
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                              Accept
                            </button>
                            <button
                              onClick={() => rejectFriendRequest(request.friendshipId)}
                              className="decline-btn px-4 py-2 rounded font-medium text-sm border transition-all text-red-400 hover:bg-red-500/10"
                              style={{ borderColor: '#F23F42' }}
                            >
                              <XMarkIcon className="w-4 h-4 inline mr-1" />
                              Decline
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
                              className="p-2 bg-primary-500 hover:bg-primary-600 rounded transition"
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
                <div className="p-4 border-b border-primary-900/30">
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
                  <div className="online-friends-section p-5">
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">
                      {activeTab === 'online' ? `ONLINE — ${filteredFriends.filter(f => f.friendshipStatus === 'accepted' && f.status === 'online').length}` : `ALL FRIENDS — ${filteredFriends.filter(f => f.friendshipStatus === 'accepted').length}`}
                    </h3>
                    
                    <div className="friends-list space-y-2">
                      {filteredFriends
                        .filter(f => {
                          const isAccepted = f.friendshipStatus === 'accepted';
                          if (activeTab === 'online') {
                            return isAccepted && f.status === 'online';
                          }
                          return isAccepted;
                        })
                        .map(friend => (
                          <div
                            key={friend.id}
                            className={`friend-item group flex items-center p-3 rounded-lg cursor-pointer transition-all ${
                              selectedConversation?.id === friend.id 
                                ? 'bg-gray-700' 
                                : 'hover:bg-gray-700'
                            }`}
                            onClick={() => selectConversation(friend)}
                          >
                            {/* Avatar */}
                            <div className="relative mr-3">
                              <div className="w-10 h-10 rounded-full overflow-hidden">
                                {friend.avatar ? (
                                  <img src={friend.avatar} alt={friend.displayName} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                                    <UserIcon className="w-6 h-6 text-gray-300" />
                                  </div>
                                )}
                              </div>
                              {friend.status === 'online' && (
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
                              )}
                            </div>
                            
                            {/* Info */}
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium text-sm">
                                {friend.displayName || friend.username}
                              </p>
                              <p className="text-xs text-gray-400">
                                {friend.status === 'online' ? 'Online' : 'Offline'}
                              </p>
                            </div>
                            
                            {/* Action Buttons */}
                            <div className="friend-actions flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                className="action-btn w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  selectConversation(friend);
                                }}
                                title="Message"
                              >
                                <ChatBubbleLeftIcon className="w-4 h-4 text-gray-300" />
                              </button>
                              <button
                                className="action-btn w-8 h-8 bg-gray-600 hover:bg-gray-500 rounded-full flex items-center justify-center transition-all"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // More options
                                }}
                                title="More"
                              >
                                <EllipsisVerticalIcon className="w-4 h-4 text-gray-300" />
                              </button>
                            </div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Chat Area - Full Remaining Width (Discord Style) - NO RIGHT SIDEBAR */}
          <div className="dm-chat-area flex-1 flex flex-col min-w-0 bg-gray-700" style={{ width: 'calc(100vw - 332px)' }}>
            {selectedConversation ? (
              <React.Fragment>
                {/* Chat Header - Modern Design */}
            <div className="h-16 px-6 flex items-center justify-between border-b border-primary-900/20 glass-morphism">
              <div className="flex items-center space-x-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center shadow-lg shadow-green-500/30">
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
                  <p className="text-xs text-primary-400">
                    {selectedConversation.status === 'online' ? '🟢 Active now' : '⚫ Offline'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={startVoiceCall}
                  disabled={inCall}
                  className="p-2 hover:bg-primary-500/20 rounded transition disabled:opacity-50"
                >
                  <PhoneIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <button
                  onClick={startVideoCall}
                  disabled={inCall}
                  className="p-2 hover:bg-primary-500/20 rounded transition disabled:opacity-50"
                >
                  <VideoCameraIcon className="w-5 h-5 text-text-secondary" />
                </button>
                <button
                  onClick={startScreenShare}
                  disabled={isScreenSharing}
                  className="p-2 hover:bg-primary-500/20 rounded transition disabled:opacity-50"
                >
                  <ComputerDesktopIcon className="w-5 h-5 text-text-secondary" />
                </button>
                {inCall && (
                  <button
                    onClick={endCall}
                    className="px-3 py-1 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
                  >
                    End Call
                  </button>
                )}
                <div className="relative group">
                  <button className="p-2 hover:bg-primary-500/20 rounded transition">
                    <EllipsisHorizontalIcon className="w-5 h-5 text-primary-400" />
                  </button>
                  <div className="absolute right-0 mt-2 w-48 bg-black/90 border border-primary-900/30 rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition z-10">
                    <button
                      onClick={() => removeFriend(selectedConversation.friendshipId)}
                      className="w-full text-left px-4 py-2 text-white hover:bg-primary-500/20 transition"
                    >
                      Remove Friend
                    </button>
                    <button
                      onClick={() => blockUser(selectedConversation.id)}
                      className="w-full text-left px-4 py-2 text-primary-500 hover:bg-primary-500/20 transition"
                    >
                      Block User
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Container - Proper Scrolling */}
            <div className="dm-messages-container flex-1 overflow-y-auto p-6 space-y-4" style={{ paddingBottom: '100px' }}>
              {messages.map((message, index) => {
                const messageSenderId = (message.senderId || message.sender?._id || message.sender || '').toString();
                const currentUserId = (user?.id || user?._id || '').toString();
                const isOwnMessage = messageSenderId === currentUserId;
                  
                // Get correct sender info
                  const senderName = message.senderName || 
                    message.sender?.displayName || 
                    message.sender?.username || 
                    (isOwnMessage 
                      ? (user.displayName || user.username) 
                      : (selectedConversation?.displayName || selectedConversation?.username));
                  
                  const senderAvatar = isOwnMessage 
                    ? (user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&background=DC2626&color=fff`)
                    : (message.sender?.avatar || selectedConversation?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(senderName)}&background=4B5563&color=fff`);
                  
                  // Check if we should show header (first message or different sender from previous)
                  const prevMessage = messages[index - 1];
                  const prevSenderId = (prevMessage?.senderId || prevMessage?.sender?._id || '').toString();
                  const showHeader = index === 0 || prevSenderId !== messageSenderId;
                  
                  return (
                    <div key={message.id || message._id || `msg-${index}`} 
                         className="group hover:bg-gray-950/30 px-4 py-0.5 -mx-4"
                         onContextMenu={(e) => {
                           e.preventDefault();
                           setContextMenu({
                             message,
                             position: { x: e.clientX, y: e.clientY },
                             isOwnMessage
                           });
                         }}>
                      <div className="flex items-start gap-4">
                        {/* Avatar or spacer */}
                        {showHeader ? (
                          <img
                            src={senderAvatar}
                            alt={senderName}
                            className="w-10 h-10 rounded-full mt-1 cursor-pointer hover:opacity-90 transition"
                            onClick={(e) => {
                              const sender = message.sender || selectedConversation;
                              if (!isOwnMessage && sender) {
                                setUserProfilePopup({
                                  user: sender,
                                  position: { x: e.clientX, y: e.clientY }
                                });
                              }
                            }}
                          />
                        ) : (
                          <div className="w-10 flex-shrink-0 text-center text-[10px] text-gray-500 opacity-0 group-hover:opacity-100 mt-1">
                            {new Date(message.createdAt || message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        )}
                        
                        {/* Message Content */}
                        <div className="flex-1 min-w-0">
                          {showHeader && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span 
                                className={`text-sm font-medium cursor-pointer hover:underline ${isOwnMessage ? 'text-primary-400' : 'text-gray-300'}`}
                                onClick={(e) => {
                                  const sender = message.sender || selectedConversation;
                                  if (!isOwnMessage && sender) {
                                    setUserProfilePopup({
                                      user: sender,
                                      position: { x: e.clientX, y: e.clientY }
                                    });
                                  }
                                }}
                              >
                                {senderName}
                              </span>
                              <span className="text-xs text-gray-500">
                                {new Date(message.createdAt || message.timestamp).toLocaleString('en-US', { 
                                  month: 'short', 
                                  day: 'numeric', 
                                  hour: '2-digit', 
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          )}
                          <div className="text-gray-100 break-words">
                            {message.content || message.message}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                <div ref={messagesEndRef} />
                
                {/* Typing Indicator */}
                {isTyping && (
                  <div className="px-4 py-2 text-gray-400 text-sm animate-pulse">
                    <span className="inline-flex items-center">
                      <span className="font-semibold text-primary-400">{selectedConversation.displayName || selectedConversation.username}</span>
                      <span className="ml-1">is typing</span>
                      <span className="ml-1 flex space-x-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                        <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                      </span>
                    </span>
                  </div>
                )}
              </div>

            {/* Message Input - FIXED at Bottom */}
            <div className="message-input-container p-4 border-t border-gray-600 bg-gray-800" style={{ position: 'sticky', bottom: 0 }}>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  value={messageInput}
                  onChange={(e) => {
                    setMessageInput(e.target.value);
                    
                    // Handle typing indicator
                    if (e.target.value.trim() && selectedConversation) {
                      socketService.emit('dm:typing', { receiverId: selectedConversation.id });
                      
                      // Clear existing timeout
                      if (typingTimeout) clearTimeout(typingTimeout);
                      
                      // Set new timeout to stop typing after 2 seconds
                      const timeout = setTimeout(() => {
                        socketService.emit('dm:stop-typing', { receiverId: selectedConversation.id });
                      }, 2000);
                      setTypingTimeout(timeout);
                    } else if (!e.target.value.trim()) {
                      socketService.emit('dm:stop-typing', { receiverId: selectedConversation.id });
                      if (typingTimeout) clearTimeout(typingTimeout);
                    }
                  }}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      sendMessage();
                      socketService.emit('dm:stop-typing', { receiverId: selectedConversation.id });
                      if (typingTimeout) clearTimeout(typingTimeout);
                    }
                  }}
                  placeholder={`Message @${selectedConversation.username}`}
                  className="flex-1 bg-black/70 border border-primary-900/30 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <button
                  onClick={sendMessage}
                  className="p-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </React.Fragment>
        ) : (
          /* Not in friends tab - show DM conversation */
          selectedConversation ? (
            <div className="flex-1 flex flex-col">
              {/* DM Header */}
              <div className="h-12 bg-[#36393f] border-b border-[#202225] flex items-center px-4">
                <div className="flex items-center">
                  <div className="w-8 h-8 rounded-full bg-[#36393f] mr-3">
                    {selectedConversation.avatar ? (
                      <img src={selectedConversation.avatar} alt="" className="w-full h-full rounded-full" />
                    ) : (
                      <span className="flex items-center justify-center w-full h-full text-white">
                        {selectedConversation.username?.[0]?.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <span className="text-white font-semibold">
                    {selectedConversation.displayName || selectedConversation.username}
                  </span>
                </div>
              </div>
              
              {/* Messages Area */}
              <div className="flex-1 overflow-y-auto p-4">
                {messages.map(message => (
                  <div key={message.id || message._id} className="mb-4">
                    <div className="flex items-start">
                      <div className="w-10 h-10 rounded-full bg-[#36393f] mr-3">
                        <span className="flex items-center justify-center w-full h-full text-white">
                          {message.senderName?.[0]?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="flex items-baseline">
                          <span className="text-white font-medium mr-2">{message.senderName}</span>
                          <span className="text-[#72767d] text-xs">
                            {new Date(message.createdAt).toLocaleTimeString()}
                          </span>
                        </div>
                        <p className="text-[#dcddde]">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              
              {/* Message Input */}
              <div className="p-4 border-t border-[#202225]">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={messageInput}
                    onChange={(e) => setMessageInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder={`Message @${selectedConversation?.username}`}
                    className="flex-1 bg-[#40444b] text-[#dcddde] rounded px-3 py-2 outline-none"
                  />
                  <button
                    onClick={sendMessage}
                    className="p-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
                  >
                    <PaperAirplaneIcon className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ChatBubbleLeftIcon className="w-24 h-24 text-primary-500/30 mx-auto mb-6" />
                <h3 className="text-3xl font-bold text-white mb-3">
                  Welcome to Direct Messages
                </h3>
                <p className="text-primary-400/70 text-lg">
                  Select a friend to start chatting
                </p>
              </div>
            </div>
          )
        )}
      </div>
    </div>

    {/* Add Friend Modal */}
    {showAddFriend && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black/90 border border-primary-900/30 rounded-lg p-6 w-96">
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
              className="w-full bg-black/50 border border-primary-900/30 text-white px-3 py-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAddFriend(false)}
                className="flex-1 px-4 py-2 bg-black/50 border border-primary-900/30 text-white rounded hover:bg-primary-500/20 transition"
              >
                Cancel
              </button>
              <button
                onClick={sendFriendRequest}
                className="flex-1 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition"
              >
                Send Friend Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Message Context Menu */}
      {contextMenu && (
        <MessageContextMenu
          message={contextMenu.message}
          position={contextMenu.position}
          isOwnMessage={contextMenu.isOwnMessage}
          onClose={() => setContextMenu(null)}
          onAction={(action, message) => {
            console.log('Context menu action:', action, message);
            // Handle actions here
            if (action === 'delete' && contextMenu.isOwnMessage) {
              // Implement delete message
              console.log('Deleting message:', message);
            }
          }}
        />
      )}

      {/* User Profile Popup */}
      {userProfilePopup && (
        <UserProfilePopup
          user={userProfilePopup.user}
          position={userProfilePopup.position}
          onClose={() => setUserProfilePopup(null)}
          onMessage={(user) => {
            // Handle opening conversation with user
            setSelectedConversation(user);
            setUserProfilePopup(null);
          }}
        />
      )}

      {/* Call Interface */}
      {(inCall || incomingCall) && (
        <>
          <CallInterface
            callType={callType || incomingCall?.type}
            targetUser={callTarget || (incomingCall && {
              id: incomingCall.callerId,
              username: incomingCall.callerName,
              displayName: incomingCall.callerName
            })}
            onEndCall={endCall}
            isIncoming={!!incomingCall}
            isCallConnected={isCallConnected}
            onAccept={() => acceptCall(incomingCall)}
            onReject={() => rejectCall(incomingCall)}
          />
          {/* Hidden audio/video elements for WebRTC */}
          <audio id="remote-audio" autoPlay style={{ display: 'none' }} />
          {callType === 'video' && (
            <video id="remote-video" autoPlay style={{ display: 'none' }} />
          )}
        </>
      )}
    </div>
  );
}

export default DirectMessages;
