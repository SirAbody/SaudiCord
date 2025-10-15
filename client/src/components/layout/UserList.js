// User List Component - Real Users Only
import React, { useState, useEffect } from 'react';
// import { useChatStore } from '../../stores/chatStore'; // Reserved for future use
import { useAuthStore } from '../../stores/authStore';
import socketService from '../../services/socket';

function UserList() {
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);
  const [onlineUserIds, setOnlineUserIds] = useState([]);

  useEffect(() => {
    // Listen for real user updates
    const handleUserOnline = (data) => {
      setOnlineUserIds(prev => [...new Set([...prev, data.userId])]);
    };

    const handleUserOffline = (data) => {
      setOnlineUserIds(prev => prev.filter(id => id !== data.userId));
    };

    const handleUsersList = (data) => {
      if (data.users) {
        setUsers(data.users);
        const online = data.users.filter(u => u.status === 'online').map(u => u.id);
        setOnlineUserIds(online);
      }
    };

    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);
    socketService.on('users:list', handleUsersList);

    // Request current users list
    socketService.emit('users:get');

    return () => {
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
      socketService.off('users:list', handleUsersList);
    };
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-primary-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Owner': return 'text-primary-400';
      case 'Moderator': return 'text-purple-400';
      default: return 'text-text-secondary';
    }
  };

  // Filter real users only
  const onlineUsers = users.filter(u => onlineUserIds.includes(u.id) && u.id !== currentUser?.id);
  const offlineUsers = users.filter(u => !onlineUserIds.includes(u.id) && u.id !== currentUser?.id);

  const UserItem = ({ user }) => (
    <button className="w-full px-2 py-1.5 flex items-center hover:bg-dark-400/50 rounded group transition-colors">
      <div className="relative">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=53FC18&color=fff`}
          alt={user.username}
          className="w-8 h-8 rounded-full"
        />
        <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 ${getStatusColor(user.status)} rounded-full ring-2 ring-dark-600`} />
      </div>
      <div className="flex-1 ml-3 text-left">
        <p className={`text-sm font-medium truncate ${getRoleColor(user.role)}`}>
          {user.username || 'Anonymous'}
        </p>
        {user.displayName && user.displayName !== user.username && (
          <p className="text-xs text-text-tertiary truncate">{user.displayName}</p>
        )}
      </div>
    </button>
  );

  return (
    <div className="w-60 bg-dark-700 flex flex-col">
      <div className="px-4 py-3 border-b border-dark-500">
        <h3 className="text-text-secondary uppercase text-xs font-semibold">
          Online — {onlineUsers.length}
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Online Users */}
        {onlineUsers.length > 0 && (
          <div className="px-2 py-2">
            {onlineUsers.map(user => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        )}

        {/* Offline Users */}
        {offlineUsers.length > 0 && (
          <div className="px-2 py-2">
            <h3 className="px-2 mb-2 text-text-tertiary uppercase text-xs font-semibold">
              Offline — {offlineUsers.length}
            </h3>
            <div className="opacity-60">
              {offlineUsers.map(user => (
                <UserItem key={user.id} user={{ ...user, status: 'offline' }} />
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {users.length === 0 && (
          <div className="px-4 py-8 text-center text-text-tertiary text-sm">
            No users in this server
          </div>
        )}
      </div>
    </div>
  );
}

export default UserList;
