// Server List Component
import React, { useState, useEffect } from 'react';
import { PlusIcon, HomeIcon, XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

function ServerList() {
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDescription, setNewServerDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [selectedServer, setSelectedServer] = useState(null);

  useEffect(() => {
    loadServers();
  }, []);

  const loadServers = async () => {
    try {
      const response = await axios.get('/servers/me');
      setServers(response.data || []);
    } catch (error) {
      console.error('Failed to load servers:', error);
    }
  };

  const handleHomeClick = () => {
    setSelectedServer(null);
    navigate('/dashboard');
  };

  const handleServerClick = (server) => {
    setSelectedServer(server.id);
    navigate('/channels/@me');
    // Trigger server selection in chat store
    const { setCurrentServer } = require('../../stores/chatStore').useChatStore.getState();
    setCurrentServer(server);
  };

  const handleCreateServer = async () => {
    if (!newServerName.trim()) {
      toast.error('Server name is required');
      return;
    }

    setCreating(true);
    try {
      const response = await axios.post('/servers', {
        name: newServerName,
        description: newServerDescription
      });
      
      toast.success('Server created successfully!');
      setServers([...servers, response.data]);
      setShowCreateModal(false);
      setNewServerName('');
      setNewServerDescription('');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to create server');
    } finally {
      setCreating(false);
    }
  };

  return (
    <>
      <div className="flex flex-col items-center py-3 space-y-2">
        {/* Home/DM Button - SaudiCord Logo */}
        <button 
          onClick={handleHomeClick}
          className={`w-12 h-12 ${!selectedServer ? 'bg-red-500 rounded-2xl' : 'bg-gray-700 hover:bg-red-500 hover:rounded-2xl rounded-3xl'} transition-all duration-200 flex items-center justify-center group relative overflow-hidden`}
          title="Direct Messages"
        >
          <img 
            src="/SaudiCordLogo.png" 
            alt="SaudiCord" 
            className="w-8 h-8 object-contain" 
          />
        </button>
      
      <div className="w-8 h-0.5 bg-dark-400 rounded-full mx-auto"></div>
      
      {/* Server Icons */}
      {servers.map(server => (
        <button
          key={server.id}
          onClick={() => handleServerClick(server)}
          className={`relative w-12 h-12 ${selectedServer === server.id ? 'bg-red-500 rounded-2xl' : 'bg-gray-700 hover:bg-red-500 hover:rounded-2xl rounded-3xl'} transition-all duration-200 flex items-center justify-center group`}
        >
          {server.icon ? (
            <img src={server.icon} alt={server.name} className="w-full h-full rounded-full" />
          ) : (
            <span className="text-text-primary font-bold group-hover:text-white">
              {server.name.substring(0, 2).toUpperCase()}
            </span>
          )}
          
          {/* Active Indicator */}
          <span className="absolute left-0 w-1 h-8 bg-red-500 rounded-r-full -ml-1 opacity-0 group-hover:opacity-100 transition-opacity"></span>
        </button>
      ))}
        {/* Add Server Button */}
        <button 
          onClick={() => setShowCreateModal(true)}
          className="w-12 h-12 bg-gray-700 hover:bg-red-500 hover:rounded-2xl rounded-3xl transition-all duration-200 flex items-center justify-center group"
        >
          <PlusIcon className="w-6 h-6 text-gray-400 group-hover:text-white" />
        </button>
      </div>

      {/* Create Server Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg p-6 w-96">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-text-primary">Create a Server</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-text-secondary hover:text-text-primary"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Server Name
                </label>
                <input
                  type="text"
                  value={newServerName}
                  onChange={(e) => setNewServerName(e.target.value)}
                  className="w-full bg-dark-400 text-text-primary rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="Enter server name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1">
                  Description (Optional)
                </label>
                <textarea
                  value={newServerDescription}
                  onChange={(e) => setNewServerDescription(e.target.value)}
                  className="w-full bg-dark-400 text-text-primary rounded px-3 py-2 h-20 resize-none focus:outline-none focus:ring-2 focus:ring-accent"
                  placeholder="What's this server about?"
                />
              </div>

              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition"
                  disabled={creating}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateServer}
                  className="flex-1 px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 transition disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Server'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default ServerList;
