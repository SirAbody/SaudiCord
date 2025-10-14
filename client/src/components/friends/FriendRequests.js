// Friend Requests Component
import React, { useState, useEffect } from 'react';
import { CheckIcon, XMarkIcon, UserIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import socketService from '../../services/socket';

function FriendRequests({ friends, onUpdate }) {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    // Filter pending requests where the user is the recipient
    const requests = friends.filter(f => 
      f.friendshipStatus === 'pending' && 
      f.initiatedBy !== localStorage.getItem('userId')
    );
    setPendingRequests(requests);
  }, [friends]);

  useEffect(() => {
    // Listen for new friend requests
    const handleNewRequest = (data) => {
      toast.success(`New friend request from ${data.displayName || data.username}`);
      onUpdate(); // Refresh friends list
    };

    socketService.on('friend:request', handleNewRequest);

    return () => {
      socketService.off('friend:request', handleNewRequest);
    };
  }, [onUpdate]);

  const handleAccept = async (friendshipId) => {
    setProcessing({ ...processing, [friendshipId]: true });
    try {
      await axios.post(`/api/friends/accept/${friendshipId}`);
      toast.success('Friend request accepted!');
      onUpdate();
    } catch (error) {
      console.error('Failed to accept friend request:', error);
      toast.error('Failed to accept friend request');
    } finally {
      setProcessing({ ...processing, [friendshipId]: false });
    }
  };

  const handleReject = async (friendshipId) => {
    setProcessing({ ...processing, [friendshipId]: true });
    try {
      await axios.post(`/api/friends/reject/${friendshipId}`);
      toast.success('Friend request rejected');
      onUpdate();
    } catch (error) {
      console.error('Failed to reject friend request:', error);
      toast.error('Failed to reject friend request');
    } finally {
      setProcessing({ ...processing, [friendshipId]: false });
    }
  };

  if (pendingRequests.length === 0) {
    return null;
  }

  return (
    <div className="p-4">
      <h3 className="text-sm font-semibold text-gray-400 uppercase mb-3">
        Friend Requests — {pendingRequests.length}
      </h3>
      <div className="space-y-2">
        {pendingRequests.map((request) => (
          <div 
            key={request.friendshipId || request.id}
            className="flex items-center justify-between p-3 bg-gray-800 rounded-lg hover:bg-gray-750 transition"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                {request.avatar ? (
                  <img 
                    src={request.avatar} 
                    alt={request.displayName} 
                    className="w-full h-full rounded-full"
                  />
                ) : (
                  <UserIcon className="w-6 h-6 text-white" />
                )}
              </div>
              <div>
                <p className="text-white font-medium">
                  {request.displayName || request.username}
                </p>
                <p className="text-gray-400 text-sm">
                  @{request.username}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleAccept(request.friendshipId || request.id)}
                disabled={processing[request.friendshipId || request.id]}
                className="p-2 bg-green-600 hover:bg-green-700 rounded-full transition disabled:opacity-50"
                title="Accept"
              >
                <CheckIcon className="w-4 h-4 text-white" />
              </button>
              <button
                onClick={() => handleReject(request.friendshipId || request.id)}
                disabled={processing[request.friendshipId || request.id]}
                className="p-2 bg-gray-600 hover:bg-gray-700 rounded-full transition disabled:opacity-50"
                title="Reject"
              >
                <XMarkIcon className="w-4 h-4 text-white" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default FriendRequests;
