// CreateServerModal Component - Discord-like UI
// Made With Love By SirAbody

import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { ServerIcon } from '@heroicons/react/24/solid';

function CreateServerModal({ 
  show, 
  onClose, 
  serverName, 
  setServerName, 
  serverDescription, 
  setServerDescription, 
  onCreateServer, 
  creating 
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop">
      <div className="bg-dark-800 rounded-lg p-6 max-w-md w-full modal-enter">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ServerIcon className="w-6 h-6 text-primary-500" />
            Create Your Server
          </h2>
          <button 
            onClick={onClose}
            className="p-1 hover:bg-dark-700 rounded transition"
          >
            <XMarkIcon className="w-5 h-5 text-gray-400 hover:text-white" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Server Name
            </label>
            <input
              type="text"
              value={serverName}
              onChange={(e) => setServerName(e.target.value)}
              placeholder="Enter server name"
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              autoFocus
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Description (Optional)
            </label>
            <textarea
              value={serverDescription}
              onChange={(e) => setServerDescription(e.target.value)}
              placeholder="What's your server about?"
              rows={3}
              className="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-md text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 bg-dark-700 text-gray-300 rounded hover:bg-dark-600 transition"
            disabled={creating}
          >
            Cancel
          </button>
          <button
            onClick={onCreateServer}
            className="flex-1 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={creating || !serverName.trim()}
          >
            {creating ? 'Creating...' : 'Create Server'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CreateServerModal;
