// User List Component
import React, { useState, useEffect } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';

function UserList() {
  const { onlineUsers } = useChatStore();
  const { user: currentUser } = useAuthStore();
  const [users, setUsers] = useState([]);

  useEffect(() => {
    // Simulate users - in production this would come from the API
    setUsers([
      { id: '1', username: 'Admin', displayName: 'Admin', status: 'online', role: 'Owner' },
      { id: '2', username: 'Moderator', displayName: 'Mod', status: 'idle', role: 'Moderator' },
      { id: '3', username: 'User1', displayName: 'User 1', status: 'dnd', role: 'Member' },
      { id: '4', username: 'User2', displayName: 'User 2', status: 'offline', role: 'Member' },
    ]);
  }, []);

  const getStatusColor = (status) => {
    switch (status) {
      case 'online': return 'bg-green-500';
      case 'idle': return 'bg-yellow-500';
      case 'dnd': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Owner': return 'text-red-400';
      case 'Moderator': return 'text-purple-400';
      default: return 'text-text-secondary';
    }
  };

  // Group users by role
  const ownerUsers = users.filter(u => u.role === 'Owner');
  const moderatorUsers = users.filter(u => u.role === 'Moderator');
  const memberUsers = users.filter(u => u.role === 'Member');

  const UserItem = ({ user }) => (
    <button className="w-full px-2 py-1.5 flex items-center hover:bg-dark-400/50 rounded group transition-colors">
      <div className="relative">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.username}&background=FF0000&color=fff`}
          alt={user.username}
          className="w-8 h-8 rounded-full"
        />
        <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-background-secondary ${getStatusColor(user.status)}`}></div>
      </div>
      <div className="ml-2 flex-1 text-left min-w-0">
        <p className={`text-sm font-medium truncate ${getRoleColor(user.role)}`}>
          {user.displayName || user.username}
        </p>
        {user.activity && (
          <p className="text-xs text-text-tertiary truncate">{user.activity}</p>
        )}
      </div>
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-12 px-4 flex items-center shadow-md border-b border-dark-400">
        <h3 className="font-semibold text-text-primary">Members</h3>
      </div>
      
      {/* User List */}
      <div className="flex-1 overflow-y-auto p-2">
        {/* Owners */}
        {ownerUsers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-text-tertiary px-2 mb-1">
              OWNER — {ownerUsers.length}
            </h4>
            {ownerUsers.map(user => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        )}

        {/* Moderators */}
        {moderatorUsers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-text-tertiary px-2 mb-1">
              MODERATORS — {moderatorUsers.length}
            </h4>
            {moderatorUsers.map(user => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        )}

        {/* Members */}
        {memberUsers.length > 0 && (
          <div className="mb-4">
            <h4 className="text-xs font-semibold text-text-tertiary px-2 mb-1">
              MEMBERS — {memberUsers.length}
            </h4>
            {memberUsers.map(user => (
              <UserItem key={user.id} user={user} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default UserList;
