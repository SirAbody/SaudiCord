import React, { useEffect, useState } from 'react';
import { useSocket } from '../../contexts/SocketContext';
import NotificationToast from './NotificationToast';
import { useAuthStore } from '../../stores/authStore';

const NotificationManager = () => {
  const { socket } = useSocket();
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  
  useEffect(() => {
    if (!socket || !user) return;
    
    // Listen for friend request notifications
    socket.on('friend:request:received', (data) => {
      const notification = {
        id: Date.now(),
        type: 'friend_request',
        from: data.from,
        friendshipId: data.friendshipId,
        timestamp: data.timestamp
      };
      setNotifications(prev => [...prev, notification]);
      
      // Play notification sound
      playNotificationSound();
    });
    
    // Listen for friend request accepted
    socket.on('friend:request:accepted', (data) => {
      const notification = {
        id: Date.now(),
        type: 'friend_accept',
        by: data.by,
        friendshipId: data.friendshipId,
        timestamp: data.timestamp
      };
      setNotifications(prev => [...prev, notification]);
      playNotificationSound();
    });
    
    // Listen for new direct messages
    socket.on('dm:new_message', (data) => {
      // Don't show notification if we're already in the conversation
      if (window.location.pathname.includes('/dashboard') && 
          window.location.pathname.includes(data.from.id)) {
        return;
      }
      
      const notification = {
        id: Date.now(),
        type: 'message',
        from: data.from,
        message: data.message,
        timestamp: data.timestamp
      };
      setNotifications(prev => [...prev, notification]);
      playNotificationSound();
    });
    
    // Listen for incoming calls
    socket.on('call:incoming', (data) => {
      const notification = {
        id: Date.now(),
        type: 'call',
        from: data.from,
        channelId: data.channelId,
        timestamp: data.timestamp
      };
      setNotifications(prev => [...prev, notification]);
      playNotificationSound('call');
    });
    
    // Listen for channel messages
    socket.on('message:new', (data) => {
      // Don't show notification if we're already in the channel
      if (window.location.pathname.includes('/channels') && 
          window.location.pathname.includes(data.channelId)) {
        return;
      }
      
      const notification = {
        id: Date.now(),
        type: 'message',
        from: data.author,
        message: data.content,
        channelId: data.channelId,
        timestamp: data.timestamp
      };
      setNotifications(prev => [...prev, notification]);
      playNotificationSound();
    });
    
    return () => {
      socket.off('friend:request:received');
      socket.off('friend:request:accepted');
      socket.off('dm:new_message');
      socket.off('call:incoming');
      socket.off('message:new');
    };
  }, [socket, user]);
  
  const playNotificationSound = (type = 'default') => {
    try {
      let audio;
      if (type === 'call') {
        audio = new Audio('/sounds/ringtone.mp3');
      } else {
        audio = new Audio('/sounds/notification.mp3');
      }
      audio.volume = 0.5;
      audio.play().catch(() => {
        // Silently fail if audio can't play (browser restrictions)
      });
    } catch (error) {
      // Silently fail
    }
  };
  
  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };
  
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map(notification => (
        <NotificationToast
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
};

export default NotificationManager;
