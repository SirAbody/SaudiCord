// User Profile Popup Component - Discord Style
import React, { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';
import {
  UserPlusIcon,
  ChatBubbleLeftIcon,
  EllipsisHorizontalIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

function UserProfilePopup({ user, position, onClose, onMessage }) {
  const { user: currentUser } = useAuthStore();
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const popupRef = useRef(null);

  useEffect(() => {
    fetchUserDetails();
    checkFriendshipStatus();

    // Add click outside listener
    const handleClickOutside = (event) => {
      if (popupRef.current && !popupRef.current.contains(event.target)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [user]);

  const fetchUserDetails = async () => {
    try {
      const response = await axios.get(`/users/${user._id || user.id}`);
      setUserDetails(response.data);
    } catch (error) {
      console.error('Failed to fetch user details:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkFriendshipStatus = async () => {
    try {
      const response = await axios.get('/friends');
      const friends = response.data.friends || [];
      const pending = response.data.pending || [];
      
      const userId = user._id || user.id;
      setIsFriend(friends.some(f => (f._id || f.id) === userId));
      setRequestSent(pending.some(p => (p.receiver?._id || p.receiver) === userId));
    } catch (error) {
      console.error('Failed to check friendship status:', error);
    }
  };

  const sendFriendRequest = async () => {
    try {
      await axios.post('/friends/request', {
        username: user.username
      });
      setRequestSent(true);
      toast.success('Friend request sent!');
    } catch (error) {
      console.error('Failed to send friend request:', error);
      toast.error('Failed to send friend request');
    }
  };

  const isOwnProfile = currentUser?.id === (user._id || user.id);
  const displayUser = userDetails || user;

  // Calculate popup position to keep it on screen
  const adjustedPosition = { ...position };
  if (popupRef.current) {
    const rect = popupRef.current.getBoundingClientRect();
    const windowWidth = window.innerWidth;
    const windowHeight = window.innerHeight;

    if (rect.right > windowWidth) {
      adjustedPosition.x = windowWidth - rect.width - 20;
    }
    if (rect.bottom > windowHeight) {
      adjustedPosition.y = windowHeight - rect.height - 20;
    }
  }

  return (
    <div
      ref={popupRef}
      className="fixed z-50 bg-gray-900 border border-gray-700 rounded-xl shadow-2xl overflow-hidden"
      style={{
        top: adjustedPosition.y,
        left: adjustedPosition.x,
        width: '340px',
        animation: 'slideIn 0.2s ease-out',
        backdropFilter: 'blur(10px)',
        background: 'rgba(17, 24, 39, 0.95)'
      }}
    >
      {/* Banner Section */}
      <div className="h-24 bg-gradient-to-br from-primary-500 to-primary-700 relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 p-1 rounded-full bg-black/30 hover:bg-black/50 transition-colors"
        >
          <XMarkIcon className="w-4 h-4 text-white" />
        </button>
      </div>

      {/* Avatar */}
      <div className="relative -mt-12 px-4">
        <div className="relative">
          <img
            src={displayUser.avatar || `https://ui-avatars.com/api/?name=${displayUser.username}&background=DC2626&color=fff`}
            alt={displayUser.username}
            className="w-20 h-20 rounded-full border-4 border-gray-900"
          />
          <div className={`absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 border-gray-900 ${
            displayUser.status === 'online' ? 'bg-green-500' :
            displayUser.status === 'idle' ? 'bg-yellow-500' :
            displayUser.status === 'dnd' ? 'bg-primary-500' :
            'bg-gray-500'
          }`} />
        </div>
      </div>

      {/* User Info */}
      <div className="px-4 pb-4">
        <div className="mt-2">
          <h3 className="text-xl font-bold text-white">
            {displayUser.displayName || displayUser.username}
          </h3>
          <p className="text-gray-400 text-sm">@{displayUser.username}</p>
          
          {displayUser.customStatus && (
            <p className="text-gray-300 text-sm mt-1 italic">
              "{displayUser.customStatus}"
            </p>
          )}
        </div>

        {/* About Section */}
        {displayUser.about && (
          <div className="mt-4">
            <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">About Me</h4>
            <p className="text-gray-300 text-sm">{displayUser.about}</p>
          </div>
        )}

        {/* Member Since */}
        <div className="mt-4">
          <h4 className="text-xs font-bold text-gray-400 uppercase mb-1">Member Since</h4>
          <p className="text-gray-300 text-sm">
            {new Date(displayUser.createdAt || Date.now()).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })}
          </p>
        </div>

        {/* Action Buttons */}
        {!isOwnProfile && (
          <div className="mt-4 flex gap-2">
            {!isFriend && !requestSent && (
              <button
                onClick={sendFriendRequest}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Add Friend</span>
              </button>
            )}
            
            {requestSent && (
              <button
                disabled
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 text-gray-400 rounded-md cursor-not-allowed"
              >
                <UserPlusIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Request Sent</span>
              </button>
            )}
            
            {isFriend && (
              <button
                onClick={() => onMessage && onMessage(displayUser)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
              >
                <ChatBubbleLeftIcon className="w-4 h-4" />
                <span className="text-sm font-medium">Message</span>
              </button>
            )}
            
            <button
              className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition-colors"
            >
              <EllipsisHorizontalIcon className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}

export default UserProfilePopup;
