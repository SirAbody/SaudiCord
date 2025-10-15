import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/solid';

function CreateChannelModal({
  isOpen,
  onClose,
  channelType,
  onSubmit,
  channelName,
  setChannelName,
  channelDescription,
  setChannelDescription,
  isCreating
}) {
  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white">
            Create {channelType === 'text' ? 'Text' : 'Voice'} Channel
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channel Name
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                {channelType === 'text' ? '#' : '🔊'}
              </span>
              <input
                type="text"
                value={channelName}
                onChange={(e) => setChannelName(e.target.value)}
                className="w-full bg-gray-700 text-white pl-8 pr-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder={`new-${channelType}-channel`}
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Channel Topic (optional)
            </label>
            <textarea
              value={channelDescription}
              onChange={(e) => setChannelDescription(e.target.value)}
              className="w-full bg-gray-700 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              placeholder="What's this channel about?"
              rows="3"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-500 text-black font-medium rounded-md hover:bg-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isCreating || !channelName.trim()}
              style={{ backgroundColor: '#53FC18' }}
            >
              {isCreating ? 'Creating...' : 'Create Channel'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CreateChannelModal;
