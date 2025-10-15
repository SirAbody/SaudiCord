import React, { useEffect, useState } from 'react';
import { Transition } from '@headlessui/react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

const NotificationToast = ({ notification, onClose }) => {
  const navigate = useNavigate();
  const [show, setShow] = useState(false);
  
  useEffect(() => {
    setShow(true);
    const timer = setTimeout(() => {
      setShow(false);
      setTimeout(onClose, 300); // Wait for transition to complete
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [onClose]);
  
  const handleClick = () => {
    switch (notification.type) {
      case 'friend_request':
        navigate('/dashboard');
        break;
      case 'message':
        navigate('/dashboard');
        break;
      case 'call':
        navigate('/dashboard');
        break;
      default:
        break;
    }
    onClose();
  };
  
  const getNotificationContent = () => {
    switch (notification.type) {
      case 'friend_request':
        return {
          title: 'Friend Request',
          message: `${notification.from.displayName || notification.from.username} sent you a friend request`,
          icon: '👤',
          color: 'bg-blue-500'
        };
      case 'friend_accept':
        return {
          title: 'Friend Request Accepted',
          message: `${notification.by.displayName || notification.by.username} accepted your friend request`,
          icon: '✅',
          color: 'bg-green-500'
        };
      case 'message':
        return {
          title: 'New Message',
          message: `${notification.from.displayName || notification.from.username}: ${notification.message}`,
          icon: '💬',
          color: 'bg-purple-500'
        };
      case 'call':
        return {
          title: 'Incoming Call',
          message: `${notification.from.displayName || notification.from.username} is calling you`,
          icon: '📞',
          color: 'bg-red-500'
        };
      default:
        return {
          title: notification.title || 'Notification',
          message: notification.message || '',
          icon: '🔔',
          color: 'bg-gray-500'
        };
    }
  };
  
  const content = getNotificationContent();
  
  return (
    <Transition
      show={show}
      enter="transform ease-out duration-300 transition"
      enterFrom="translate-x-full opacity-0"
      enterTo="translate-x-0 opacity-100"
      leave="transform ease-in duration-200 transition"
      leaveFrom="translate-x-0 opacity-100"
      leaveTo="translate-x-full opacity-0"
    >
      <div className="fixed top-4 right-4 z-50 max-w-sm">
        <div
          onClick={handleClick}
          className="bg-black/95 border border-red-900/30 rounded-lg shadow-xl p-4 cursor-pointer hover:bg-black/90 transition"
        >
          <div className="flex items-start">
            <div className={`${content.color} rounded-lg p-2 mr-3`}>
              <span className="text-2xl">{content.icon}</span>
            </div>
            <div className="flex-1">
              <h3 className="text-white font-semibold mb-1">{content.title}</h3>
              <p className="text-gray-300 text-sm line-clamp-2">{content.message}</p>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShow(false);
                setTimeout(onClose, 300);
              }}
              className="ml-3 text-gray-400 hover:text-white transition"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </Transition>
  );
};

export default NotificationToast;
