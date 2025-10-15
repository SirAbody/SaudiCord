// Message Context Menu Component - Discord Style
import React from 'react';
import {
  DocumentDuplicateIcon,
  TrashIcon,
  FlagIcon,
  ShareIcon,
  PencilIcon,
  LinkIcon,
  UserPlusIcon,
  ArrowUturnRightIcon
} from '@heroicons/react/24/outline';

function MessageContextMenu({ message, position, onClose, onAction, isOwnMessage }) {
  if (!position) return null;

  const menuOptions = [
    {
      label: 'Reply',
      icon: ArrowUturnRightIcon,
      action: 'reply',
      show: true,
      divider: false
    },
    {
      label: 'Copy Text',
      icon: DocumentDuplicateIcon,
      action: 'copy',
      show: true,
      divider: false
    },
    {
      label: 'Copy Message Link',
      icon: LinkIcon,
      action: 'copyLink',
      show: true,
      divider: true
    },
    {
      label: 'Edit Message',
      icon: PencilIcon,
      action: 'edit',
      show: isOwnMessage,
      divider: false
    },
    {
      label: 'Delete Message',
      icon: TrashIcon,
      action: 'delete',
      show: isOwnMessage,
      danger: true,
      divider: true
    },
    {
      label: 'Share',
      icon: ShareIcon,
      action: 'share',
      show: true,
      divider: false
    },
    {
      label: 'Add Friend',
      icon: UserPlusIcon,
      action: 'addFriend',
      show: !isOwnMessage,
      divider: true
    },
    {
      label: 'Report',
      icon: FlagIcon,
      action: 'report',
      show: !isOwnMessage,
      danger: true,
      divider: false
    }
  ];

  const handleAction = (action) => {
    switch (action) {
      case 'copy':
        navigator.clipboard.writeText(message.content || message.message);
        break;
      case 'copyLink':
        const messageLink = `${window.location.origin}/channels/@me/${message.id}`;
        navigator.clipboard.writeText(messageLink);
        break;
      default:
        if (onAction) onAction(action, message);
    }
    onClose();
  };

  return (
    <>
      {/* Backdrop to close menu */}
      <div 
        className="fixed inset-0 z-40" 
        onClick={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      
      {/* Context Menu */}
      <div
        className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg shadow-2xl py-2 min-w-[180px]"
        style={{
          top: position.y,
          left: position.x,
          animation: 'fadeInScale 0.15s ease-out'
        }}
      >
        {menuOptions
          .filter(option => option.show)
          .map((option, index) => (
            <React.Fragment key={option.action}>
              <button
                onClick={() => handleAction(option.action)}
                className={`
                  w-full px-3 py-1.5 text-left flex items-center gap-2 text-sm
                  ${option.danger 
                    ? 'text-red-400 hover:bg-red-500/10 hover:text-red-300' 
                    : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                  }
                  transition-colors
                `}
              >
                <option.icon className="w-4 h-4" />
                <span>{option.label}</span>
              </button>
              {option.divider && (
                <div className="my-1 border-t border-gray-700" />
              )}
            </React.Fragment>
          ))}
      </div>

      <style jsx>{`
        @keyframes fadeInScale {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </>
  );
}

export default MessageContextMenu;
