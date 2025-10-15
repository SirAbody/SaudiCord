import React, { useEffect, useRef } from 'react';
import { 
  TrashIcon, 
  Cog6ToothIcon, 
  LinkIcon, 
  BellSlashIcon,
  ChatBubbleLeftIcon,
  PhoneIcon,
  UserMinusIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';

const ContextMenu = ({ 
  x, 
  y, 
  isOpen, 
  onClose, 
  type, 
  data,
  onAction 
}) => {
  const menuRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };

    const handleEscape = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const getMenuItems = () => {
    switch (type) {
      case 'server':
        return [
          {
            label: 'Invite People',
            icon: LinkIcon,
            action: 'invite',
            className: 'text-blue-400 hover:text-blue-300'
          },
          {
            label: 'Server Settings',
            icon: Cog6ToothIcon,
            action: 'settings',
            disabled: !data?.isOwner
          },
          { divider: true },
          {
            label: 'Mute Server',
            icon: BellSlashIcon,
            action: 'mute'
          },
          { divider: true },
          {
            label: 'Delete Server',
            icon: TrashIcon,
            action: 'delete',
            className: 'text-red-400 hover:text-red-300',
            disabled: !data?.isOwner
          }
        ];
      
      case 'friend':
        return [
          {
            label: 'Send Message',
            icon: ChatBubbleLeftIcon,
            action: 'message'
          },
          {
            label: 'Start Call',
            icon: PhoneIcon,
            action: 'call'
          },
          { divider: true },
          {
            label: 'Remove Friend',
            icon: UserMinusIcon,
            action: 'remove',
            className: 'text-red-400 hover:text-red-300'
          }
        ];
      
      case 'channel':
        const items = [
          {
            label: 'Invite People',
            icon: UserPlusIcon,
            action: 'invite'
          }
        ];
        
        if (data?.canManage) {
          items.push(
            { divider: true },
            {
              label: 'Edit Channel',
              icon: Cog6ToothIcon,
              action: 'edit'
            },
            {
              label: 'Delete Channel',
              icon: TrashIcon,
              action: 'delete',
              className: 'text-red-400 hover:text-red-300'
            }
          );
        }
        
        return items;
      
      default:
        return [];
    }
  };

  const handleItemClick = (action) => {
    onAction(action, data);
    onClose();
  };

  const menuItems = getMenuItems();

  // Adjust position to keep menu on screen
  const adjustedPosition = {
    top: y,
    left: x
  };

  // Check if menu would go off screen
  if (menuRef.current) {
    const rect = menuRef.current.getBoundingClientRect();
    if (rect.right > window.innerWidth) {
      adjustedPosition.left = x - rect.width;
    }
    if (rect.bottom > window.innerHeight) {
      adjustedPosition.top = y - rect.height;
    }
  }

  return (
    <div
      ref={menuRef}
      className="fixed z-50 bg-black/95 border border-red-900/30 rounded-lg shadow-xl py-2 min-w-[200px]"
      style={adjustedPosition}
    >
      {menuItems.map((item, index) => {
        if (item.divider) {
          return (
            <div key={`divider-${index}`} className="border-t border-red-900/30 my-1" />
          );
        }

        const Icon = item.icon;
        const itemClass = `
          flex items-center px-3 py-2 hover:bg-red-500/20 cursor-pointer transition
          ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
          ${item.className || 'text-gray-300 hover:text-white'}
        `;

        return (
          <div
            key={item.action}
            className={itemClass}
            onClick={() => !item.disabled && handleItemClick(item.action)}
          >
            <Icon className="w-4 h-4 mr-2" />
            <span className="text-sm">{item.label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default ContextMenu;
