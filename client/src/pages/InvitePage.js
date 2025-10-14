// Invite Page - Join Server by Invite Code
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';

function InvitePage() {
  const { inviteCode } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [serverInfo, setServerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) {
      // Save invite code and redirect to login
      localStorage.setItem('pendingInvite', inviteCode);
      navigate('/login');
      return;
    }

    // Try to fetch server info
    fetchServerInfo();
  }, [user, inviteCode, navigate]);

  const fetchServerInfo = async () => {
    try {
      setLoading(true);
      // This endpoint might need to be created
      const response = await axios.get(`/servers/invite/${inviteCode}/info`);
      setServerInfo(response.data);
    } catch (error) {
      console.error('Failed to fetch server info:', error);
      // Just show the invite code if we can't get server info
      setServerInfo({ inviteCode });
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    try {
      setJoining(true);
      const response = await axios.post(`/servers/join/${inviteCode}`);
      toast.success(`Successfully joined ${response.data.name}!`);
      navigate('/channels/@me');
    } catch (error) {
      console.error('Failed to join server:', error);
      if (error.response?.status === 404) {
        toast.error('Invalid invite code');
      } else if (error.response?.data?.error) {
        toast.error(error.response.data.error);
      } else {
        toast.error('Failed to join server');
      }
    } finally {
      setJoining(false);
    }
  };

  if (!user) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-red-900 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-lg shadow-2xl p-8 max-w-md w-full">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <img 
            src="/SaudiCordLogo.png" 
            alt="SaudiCord" 
            className="w-20 h-20 object-contain"
          />
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading server info...</p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-white mb-2">
                You've been invited to join a server
              </h1>
              {serverInfo?.name && (
                <div className="bg-gray-900 rounded-lg p-4 mt-4">
                  <h2 className="text-xl font-semibold text-red-400">
                    {serverInfo.name}
                  </h2>
                  {serverInfo.description && (
                    <p className="text-gray-400 mt-2">{serverInfo.description}</p>
                  )}
                  {serverInfo.memberCount && (
                    <p className="text-gray-500 text-sm mt-2">
                      {serverInfo.memberCount} members
                    </p>
                  )}
                </div>
              )}
              <div className="mt-4">
                <p className="text-gray-500 text-sm">Invite Code:</p>
                <code className="text-red-400 bg-gray-900 px-3 py-1 rounded inline-block mt-1">
                  {inviteCode}
                </code>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleJoin}
                disabled={joining}
                className="w-full px-6 py-3 bg-red-500 hover:bg-red-600 text-white font-medium rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joining ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Joining...
                  </span>
                ) : (
                  'Join Server'
                )}
              </button>
              
              <button
                onClick={() => navigate('/channels/@me')}
                className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white font-medium rounded-lg transition"
              >
                Back to SaudiCord
              </button>
            </div>

            {/* Already a member notice */}
            <p className="text-gray-500 text-xs text-center mt-6">
              Already a member? You'll be redirected to the server.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default InvitePage;
