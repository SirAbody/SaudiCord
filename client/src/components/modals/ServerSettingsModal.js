// Server Settings Modal - Discord-like UI
// Made With Love By SirAbody

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  Cog6ToothIcon,
  HashtagIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  BellIcon,
  PaintBrushIcon,
  TrashIcon,
  ChevronRightIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuthStore } from '../../stores/authStore';
import { useChatStore } from '../../stores/chatStore';

function ServerSettingsModal({ show, onClose, server }) {
  const { user } = useAuthStore();
  const { fetchChannels } = useChatStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [serverName, setServerName] = useState('');
  const [serverDescription, setServerDescription] = useState('');
  const [channels, setChannels] = useState([]);
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [inviteCode, setInviteCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelType, setNewChannelType] = useState('text');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmInput, setDeleteConfirmInput] = useState('');

  useEffect(() => {
    if (show && server) {
      setServerName(server.name);
      setServerDescription(server.description || '');
      loadServerData();
    }
  }, [show, server]);

  const loadServerData = async () => {
    if (!server) return;

    try {
      // Load channels
      const channelsRes = await axios.get(`/api/channels/server/${server.id}`);
      setChannels(channelsRes.data);

      // Load members
      const membersRes = await axios.get(`/api/servers/${server.id}/members`);
      setMembers(membersRes.data);

      // Load roles
      const rolesRes = await axios.get(`/api/servers/${server.id}/roles`);
      setRoles(rolesRes.data);

      // Generate invite code
      setInviteCode(server.inviteCode || `${server.name.toLowerCase().replace(/\s+/g, '-')}-${server.id.slice(0, 6)}`);
    } catch (error) {
      console.error('Failed to load server data:', error);
    }
  };

  const handleSaveOverview = async () => {
    setSaving(true);
    try {
      await axios.patch(`/api/servers/${server.id}`, {
        name: serverName,
        description: serverDescription
      });
      toast.success('Server settings saved');
      // Update the server in parent component
      server.name = serverName;
      server.description = serverDescription;
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateChannel = async () => {
    if (!newChannelName.trim()) {
      toast.error('Channel name is required');
      return;
    }

    try {
      const response = await axios.post('/api/channels', {
        name: newChannelName,
        type: newChannelType,
        serverId: server.id
      });
      
      setChannels([...channels, response.data]);
      setNewChannelName('');
      toast.success('Channel created successfully');
      fetchChannels(server.id);
    } catch (error) {
      toast.error('Failed to create channel');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;

    try {
      await axios.delete(`/api/channels/${channelId}`);
      setChannels(channels.filter(c => c.id !== channelId));
      toast.success('Channel deleted');
      fetchChannels(server.id);
    } catch (error) {
      toast.error('Failed to delete channel');
    }
  };

  const handleKickMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to kick this member?')) return;

    try {
      await axios.delete(`/api/servers/${server.id}/members/${memberId}`);
      setMembers(members.filter(m => m.id !== memberId));
      toast.success('Member kicked');
    } catch (error) {
      toast.error('Failed to kick member');
    }
  };

  const handleDeleteServer = async () => {
    if (deleteConfirmInput !== server.name) {
      toast.error('Server name does not match');
      return;
    }

    try {
      await axios.delete(`/api/servers/${server.id}`);
      toast.success('Server deleted');
      onClose();
      window.location.reload(); // Refresh to update server list
    } catch (error) {
      toast.error('Failed to delete server');
    }
  };

  const isOwner = server?.ownerId === user?.id || server?.owner?.id === user?.id;
  const isAdmin = isOwner || user?.isAdmin;

  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-dark-800 rounded-lg w-full max-w-4xl h-[600px] flex overflow-hidden">
        {/* Sidebar */}
        <div className="w-56 bg-dark-900 p-3">
          <div className="mb-4">
            <h3 className="text-xs font-bold text-gray-400 uppercase px-2 mb-1">
              {server?.name}
            </h3>
          </div>
          
          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full flex items-center px-2 py-1.5 rounded text-sm ${
                activeTab === 'overview' 
                  ? 'bg-primary-500/20 text-white' 
                  : 'text-gray-400 hover:bg-dark-700 hover:text-gray-300'
              }`}
            >
              <Cog6ToothIcon className="w-4 h-4 mr-2" />
              Overview
            </button>
            
            {isAdmin && (
              <>
                <button
                  onClick={() => setActiveTab('channels')}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-sm ${
                    activeTab === 'channels' 
                      ? 'bg-primary-500/20 text-white' 
                      : 'text-gray-400 hover:bg-dark-700 hover:text-gray-300'
                  }`}
                >
                  <HashtagIcon className="w-4 h-4 mr-2" />
                  Channels
                </button>

                <button
                  onClick={() => setActiveTab('members')}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-sm ${
                    activeTab === 'members' 
                      ? 'bg-primary-500/20 text-white' 
                      : 'text-gray-400 hover:bg-dark-700 hover:text-gray-300'
                  }`}
                >
                  <UserGroupIcon className="w-4 h-4 mr-2" />
                  Members
                </button>

                <button
                  onClick={() => setActiveTab('roles')}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-sm ${
                    activeTab === 'roles' 
                      ? 'bg-primary-500/20 text-white' 
                      : 'text-gray-400 hover:bg-dark-700 hover:text-gray-300'
                  }`}
                >
                  <ShieldCheckIcon className="w-4 h-4 mr-2" />
                  Roles
                </button>
              </>
            )}

            <button
              onClick={() => setActiveTab('invites')}
              className={`w-full flex items-center px-2 py-1.5 rounded text-sm ${
                activeTab === 'invites' 
                  ? 'bg-primary-500/20 text-white' 
                  : 'text-gray-400 hover:bg-dark-700 hover:text-gray-300'
              }`}
            >
              <UserGroupIcon className="w-4 h-4 mr-2" />
              Invites
            </button>

            {isOwner && (
              <div className="border-t border-dark-600 pt-2 mt-2">
                <button
                  onClick={() => setActiveTab('danger')}
                  className={`w-full flex items-center px-2 py-1.5 rounded text-sm ${
                    activeTab === 'danger' 
                      ? 'bg-red-500/20 text-red-500' 
                      : 'text-red-500 hover:bg-red-500/10'
                  }`}
                >
                  <TrashIcon className="w-4 h-4 mr-2" />
                  Delete Server
                </button>
              </div>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-600">
            <h2 className="text-xl font-bold text-white">
              {activeTab === 'overview' && 'Server Overview'}
              {activeTab === 'channels' && 'Channels'}
              {activeTab === 'members' && 'Members'}
              {activeTab === 'roles' && 'Roles'}
              {activeTab === 'invites' && 'Server Invites'}
              {activeTab === 'danger' && 'Danger Zone'}
            </h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto p-6">
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Server Name
                  </label>
                  <input
                    type="text"
                    value={serverName}
                    onChange={(e) => setServerName(e.target.value)}
                    disabled={!isAdmin}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={serverDescription}
                    onChange={(e) => setServerDescription(e.target.value)}
                    disabled={!isAdmin}
                    rows={4}
                    className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white resize-none disabled:opacity-50"
                  />
                </div>

                {isAdmin && (
                  <button
                    onClick={handleSaveOverview}
                    disabled={saving}
                    className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                )}
              </div>
            )}

            {activeTab === 'channels' && isAdmin && (
              <div>
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Create Channel</h3>
                  <div className="flex gap-2">
                    <select
                      value={newChannelType}
                      onChange={(e) => setNewChannelType(e.target.value)}
                      className="px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white"
                    >
                      <option value="text"># Text</option>
                      <option value="voice">🔊 Voice</option>
                    </select>
                    <input
                      type="text"
                      value={newChannelName}
                      onChange={(e) => setNewChannelName(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder="channel-name"
                      className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white"
                    />
                    <button
                      onClick={handleCreateChannel}
                      className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                    >
                      Create
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">Channels</h3>
                  {channels.map(channel => (
                    <div key={channel.id} className="flex items-center justify-between p-2 bg-dark-700 rounded">
                      <div className="flex items-center">
                        <HashtagIcon className="w-4 h-4 text-gray-400 mr-2" />
                        <span className="text-white">{channel.name}</span>
                      </div>
                      <button
                        onClick={() => handleDeleteChannel(channel.id)}
                        className="text-red-500 hover:text-red-400"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'members' && isAdmin && (
              <div>
                <div className="space-y-2">
                  <h3 className="text-sm font-medium text-gray-300 mb-3">
                    Members ({members.length})
                  </h3>
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-dark-700 rounded">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-500 rounded-full mr-3 flex items-center justify-center">
                          <span className="text-white text-sm font-bold">
                            {member.username?.[0]?.toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="text-white">{member.displayName || member.username}</p>
                          <p className="text-xs text-gray-400">@{member.username}</p>
                        </div>
                      </div>
                      {member.id !== user.id && isOwner && (
                        <button
                          onClick={() => handleKickMember(member.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          Kick
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'roles' && isAdmin && (
              <div>
                <p className="text-gray-400">Role management coming soon...</p>
              </div>
            )}

            {activeTab === 'invites' && (
              <div>
                <h3 className="text-sm font-medium text-gray-300 mb-3">Invite Link</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={`${window.location.origin}/invite/${inviteCode}`}
                    readOnly
                    className="flex-1 px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white"
                  />
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/invite/${inviteCode}`);
                      toast.success('Invite link copied!');
                    }}
                    className="px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'danger' && isOwner && (
              <div className="space-y-6">
                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded">
                  <h3 className="text-red-500 font-bold mb-2">Delete Server</h3>
                  <p className="text-gray-400 mb-4">
                    Once you delete a server, there is no going back. All channels, messages, and settings will be permanently deleted.
                  </p>
                  
                  {!showDeleteConfirm ? (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                    >
                      Delete This Server
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-white">Type <span className="font-bold">{server.name}</span> to confirm:</p>
                      <input
                        type="text"
                        value={deleteConfirmInput}
                        onChange={(e) => setDeleteConfirmInput(e.target.value)}
                        className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white"
                        placeholder="Enter server name"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={handleDeleteServer}
                          disabled={deleteConfirmInput !== server.name}
                          className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                        >
                          Delete Server
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteConfirm(false);
                            setDeleteConfirmInput('');
                          }}
                          className="px-4 py-2 bg-dark-700 text-white rounded hover:bg-dark-600"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ServerSettingsModal;
