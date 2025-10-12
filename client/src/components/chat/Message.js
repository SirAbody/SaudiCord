// Message Component
import React, { useState } from 'react';
import { format } from 'date-fns';
import { PencilIcon, TrashIcon, FaceSmileIcon, ArrowUturnLeftIcon, MapPinIcon } from '@heroicons/react/24/outline';
import socketService from '../../services/socket';
import toast from 'react-hot-toast';

function Message({ message, isOwn, grouped }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  // const [showMenu, setShowMenu] = useState(false); // Reserved for future menu feature

  const handleEdit = () => {
    if (editContent.trim() && editContent !== message.content) {
      socketService.editMessage(message.id, editContent);
      setIsEditing(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this message?')) {
      socketService.deleteMessage(message.id);
      toast.success('Message deleted');
    }
  };

  const handleReaction = (emoji) => {
    // Handle reaction logic
    toast(`Reacted with ${emoji}`);
  };

  const formatTime = (date) => {
    return format(new Date(date), 'h:mm a');
  };

  return (
    <div 
      className={`group px-4 py-0.5 hover:bg-dark-200/30 transition-colors ${grouped ? 'pl-16' : 'mt-4'}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex">
        {/* Avatar - only show if not grouped */}
        {!grouped && (
          <img
            src={message.author.avatar || `https://ui-avatars.com/api/?name=${message.author.username}&background=FF0000&color=fff`}
            alt={message.author.username}
            className="w-10 h-10 rounded-full mr-3 mt-0.5"
          />
        )}

        {/* Message Content */}
        <div className="flex-1 min-w-0">
          {/* Author and timestamp - only show if not grouped */}
          {!grouped && (
            <div className="flex items-baseline mb-1">
              <span className="font-medium text-text-primary mr-2">
                {message.author.displayName || message.author.username}
              </span>
              <span className="text-xs text-text-tertiary">
                {formatTime(message.createdAt)}
              </span>
            </div>
          )}

          {/* Message text */}
          {isEditing ? (
            <div className="flex items-center">
              <input
                type="text"
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleEdit();
                  if (e.key === 'Escape') {
                    setIsEditing(false);
                    setEditContent(message.content);
                  }
                }}
                className="flex-1 bg-dark-400 text-text-primary px-2 py-1 rounded outline-none focus:ring-1 focus:ring-accent"
                autoFocus
              />
              <button
                onClick={handleEdit}
                className="ml-2 text-xs text-accent hover:text-accent-light"
              >
                Save
              </button>
              <button
                onClick={() => {
                  setIsEditing(false);
                  setEditContent(message.content);
                }}
                className="ml-2 text-xs text-text-tertiary hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          ) : (
            <p className="text-text-primary break-words">
              {message.content}
              {message.edited && (
                <span className="text-xs text-text-tertiary ml-1">(edited)</span>
              )}
            </p>
          )}

          {/* Attachments */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <div key={index} className="max-w-md">
                  {attachment.type?.startsWith('image/') ? (
                    <img 
                      src={attachment.url} 
                      alt={attachment.filename}
                      className="rounded-lg max-h-80 cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => window.open(attachment.url, '_blank')}
                    />
                  ) : (
                    <a 
                      href={attachment.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center p-2 bg-dark-400 rounded hover:bg-dark-500 transition-colors"
                    >
                      <span className="text-sm text-text-primary">{attachment.filename}</span>
                      <span className="ml-2 text-xs text-text-tertiary">
                        ({(attachment.size / 1024).toFixed(1)} KB)
                      </span>
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Reactions */}
          {message.reactions && Object.keys(message.reactions).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {Object.entries(message.reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  onClick={() => handleReaction(emoji)}
                  className={`px-2 py-0.5 rounded-full text-sm flex items-center space-x-1 transition-colors ${
                    users.includes(message.author.id)
                      ? 'bg-accent/20 border border-accent'
                      : 'bg-dark-400 hover:bg-dark-500'
                  }`}
                >
                  <span>{emoji}</span>
                  <span className="text-xs text-text-secondary">{users.length}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Message Actions - shown on hover */}
        {isHovered && !isEditing && (
          <div className="flex items-start ml-2 -mt-2">
            <div className="flex items-center bg-dark-400 rounded shadow-lg">
              <button
                onClick={() => handleReaction('👍')}
                className="p-1.5 hover:bg-dark-500 rounded transition-colors"
                title="Add Reaction"
              >
                <FaceSmileIcon className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
              </button>
              {isOwn && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1.5 hover:bg-dark-500 transition-colors"
                  title="Edit Message"
                >
                  <PencilIcon className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
                </button>
              )}
              <button
                className="p-1.5 hover:bg-dark-500 transition-colors"
                title="Reply"
              >
                <ArrowUturnLeftIcon className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
              </button>
              <button
                className="p-1.5 hover:bg-dark-500 transition-colors"
                title="Pin Message"
              >
                <MapPinIcon className="w-4 h-4 text-text-tertiary hover:text-text-primary" />
              </button>
              {isOwn && (
                <button
                  onClick={handleDelete}
                  className="p-1.5 hover:bg-dark-500 rounded transition-colors"
                  title="Delete Message"
                >
                  <TrashIcon className="w-4 h-4 text-text-tertiary hover:text-accent" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Message;
