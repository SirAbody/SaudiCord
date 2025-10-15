// Invite Modal Component
import React, { useState, useEffect } from 'react';
import { XMarkIcon, ClipboardDocumentIcon, ArrowPathIcon, CheckIcon } from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';

function InviteModal({ server, onClose }) {
  const [inviteLink, setInviteLink] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    if (server) {
      fetchInviteLink();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server]);

  const fetchInviteLink = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/servers/${server.id}/invite`);
      setInviteCode(response.data.inviteCode);
      // Use current window location for the invite link
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/invite/${response.data.inviteCode}`);
    } catch (error) {
      console.error('Failed to fetch invite link:', error);
      toast.error('Failed to get invite link');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(inviteLink);
      setCopied(true);
      toast.success('Invite link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast.error('Failed to copy link');
    }
  };

  const regenerateInvite = async () => {
    try {
      setRegenerating(true);
      const response = await axios.post(`/servers/${server.id}/invite/regenerate`);
      setInviteCode(response.data.inviteCode);
      const baseUrl = window.location.origin;
      setInviteLink(`${baseUrl}/invite/${response.data.inviteCode}`);
      toast.success('New invite link generated!');
    } catch (error) {
      console.error('Failed to regenerate invite:', error);
      toast.error('Failed to regenerate invite link');
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-[480px] max-w-[90%]">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">
              Invite friends to {server?.name}
            </h2>
            <p className="text-gray-400 text-sm mt-1">
              Share this link with others to grant access to your server
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Invite Link Section */}
        {loading ? (
          <div className="py-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-500 mx-auto"></div>
            <p className="text-gray-400 mt-4">Loading invite link...</p>
          </div>
        ) : (
          <>
            <div className="bg-gray-900 rounded-lg p-4 mb-4">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                INVITE LINK
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteLink}
                  readOnly
                  className="flex-1 bg-gray-800 text-white px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-red-500"
                  onClick={(e) => e.target.select()}
                />
                <button
                  onClick={copyToClipboard}
                  className={`p-2 rounded transition ${
                    copied 
                      ? 'bg-green-500 text-white' 
                      : 'bg-gray-700 hover:bg-gray-600 text-gray-300'
                  }`}
                  title="Copy link"
                >
                  {copied ? (
                    <CheckIcon className="w-5 h-5" />
                  ) : (
                    <ClipboardDocumentIcon className="w-5 h-5" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Invite Code: <span className="font-mono bg-gray-800 px-2 py-1 rounded">{inviteCode}</span>
              </p>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {/* Regenerate Button - Only for server owner */}
              {server?.ownerId === localStorage.getItem('userId') && (
                <button
                  onClick={regenerateInvite}
                  disabled={regenerating}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded transition disabled:opacity-50"
                >
                  <ArrowPathIcon className={`w-5 h-5 ${regenerating ? 'animate-spin' : ''}`} />
                  {regenerating ? 'Regenerating...' : 'Generate New Link'}
                </button>
              )}

              {/* QR Code Section (Future Enhancement) */}
              <div className="bg-gray-900 rounded-lg p-4 text-center">
                <p className="text-gray-400 text-sm">
                  You can also share this server via Discord-style link:
                </p>
                <code className="block mt-2 text-red-400 bg-gray-800 px-3 py-2 rounded">
                  saudicord.com/invite/{inviteCode}
                </code>
              </div>
            </div>

            {/* Footer Info */}
            <div className="mt-6 pt-4 border-t border-gray-700">
              <p className="text-xs text-gray-500">
                • This link will never expire<br/>
                • Anyone with this link can join the server<br/>
                • Server members: {server?.memberCount || 1} members
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default InviteModal;
