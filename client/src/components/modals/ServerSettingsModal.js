// Server Settings Modal - Discord-like UI
// Made With Love By SirAbody

import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  Cog6ToothIcon,
  HashtagIcon,
  UserGroupIcon,
  ShieldCheckIcon,
  TrashIcon
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
  const [roles, setRoles] = useState([]); // Used for loading server roles
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, server]);
  // Check if user is server owner
  const isOwner = server?.ownerId === user?.id;

  const loadServerData = async () => {
    if (!server) return;

    try {
      // Load channels
      try {
        const channelsResponse = await axios.get(`/channels/server/${server.id}`);
        setChannels(channelsResponse.data || []);
      } catch (error) {
        console.error('Failed to load channels:', error);
        setChannels([]);
      }

      // Load members
      try {
        const membersResponse = await axios.get(`/servers/${server.id}/members`);
        setMembers(membersResponse.data || []);
      } catch (error) {
        console.error('Failed to load members:', error);
        setMembers([]);
      }

      // Load roles
      try {
        const rolesResponse = await axios.get(`/servers/${server.id}/roles`);
        setRoles(rolesResponse.data || []);
      } catch (error) {
        console.error('Failed to load roles:', error);
        setRoles([]);
      }

      // Generate invite code
      setInviteCode(server.inviteCode || `${server.name.toLowerCase().replace(/\s+/g, '-')}-${server.id.slice(0, 6)}`);
    } catch (error) {
      console.error('Failed to load server data:', error);
    }
  };

  const isAdmin = isOwner || user?.isAdmin;

  // Handler functions
  const handleSaveOverview = async () => {
    if (!server) return;
    
    setSaving(true);
    try {
      await axios.patch(`/servers/${server.id}`, {
        name: serverName,
        description: serverDescription
      });
      toast.success('Server updated successfully!');
      onClose();
    } catch (error) {
      toast.error('Failed to update server');
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
      await axios.post('/channels', {
        name: newChannelName,
        type: newChannelType,
        serverId: server.id
      });
      toast.success('Channel created!');
      setNewChannelName('');
      loadServerData();
      if (fetchChannels) fetchChannels(server.id);
    } catch (error) {
      toast.error('Failed to create channel');
    }
  };

  const handleDeleteChannel = async (channelId) => {
    try {
      await axios.delete(`/channels/${channelId}`);
      toast.success('Channel deleted');
      loadServerData();
      if (fetchChannels) fetchChannels(server.id);
    } catch (error) {
      toast.error('Failed to delete channel');
    }
  };

  const handleKickMember = async (memberId) => {
    try {
      await axios.delete(`/servers/${server.id}/members/${memberId}`);
      toast.success('Member kicked');
      loadServerData();
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
      await axios.delete(`/servers/${server.id}`);
      toast.success('Server deleted');
      onClose();
      window.location.href = '/dashboard';
    } catch (error) {
      toast.error('Failed to delete server');
    }
  };

  if (!show) return null;

  return (
    <div className={`fixed inset-0 bg-black/70 backdrop-blur-sm z-50 ${show ? 'flex' : 'hidden'} items-center justify-center`}>
      <div className="bg-gradient-to-br from-gray-900 to-black rounded-xl w-full max-w-4xl h-[80vh] flex overflow-hidden shadow-2xl border border-red-900/30">
        {/* Sidebar with Modern Design */}
        <div className="w-60 bg-black/60 backdrop-blur p-4 border-r border-red-900/20">
          <h3 className="text-xs font-bold text-red-400 uppercase mb-4 tracking-wider">Server Settings</h3>
          
          <nav className="space-y-2">
            <button
              onClick={() => setActiveTab('overview')}
              className={`w-full text-left px-4 py-2.5 rounded-lg flex items-center space-x-3 transition-all duration-200 ${
                activeTab === 'overview' 
                  ? 'bg-red-500/20 text-white border border-red-500/30 shadow-lg shadow-red-500/10' 
                  : 'text-gray-400 hover:bg-red-500/10 hover:text-white'
              }`}
            >
              <Cog6ToothIcon className="w-5 h-5" />
              <span className="font-medium">Overview</span>
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
                <p className="text-gray-400 mb-4">Role management coming soon...</p>
                <div className="space-y-2">
                  {roles.length > 0 ? (
                    roles.map(role => (
                      <div key={role._id || role.id} className="p-3 bg-dark-700 rounded">
                        <span className="text-white">{role.name}</span>
                        <span className="text-gray-400 text-sm ml-2">({role.permissions?.length || 0} permissions)</span>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No custom roles created yet.</p>
                  )}
                </div>
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
