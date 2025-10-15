import React, { useState, useEffect } from 'react';
import axios from 'axios';
import socketService from '../../services/socket';
import { UserIcon } from '@heroicons/react/24/solid';

function MembersList({ serverId, channelId }) {
  const [members, setMembers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (serverId) {
      loadServerMembers();
      loadServerRoles();
    }
  }, [serverId]);

  useEffect(() => {
    // Listen for member status changes
    const handleUserOnline = (data) => {
      setMembers(prev => prev.map(member => {
        if (member._id === data.userId || member.id === data.userId) {
          return { ...member, status: 'online' };
        }
        return member;
      }));
    };

    const handleUserOffline = (data) => {
      setMembers(prev => prev.map(member => {
        if (member._id === data.userId || member.id === data.userId) {
          return { ...member, status: 'offline' };
        }
        return member;
      }));
    };

    socketService.on('user:online', handleUserOnline);
    socketService.on('user:offline', handleUserOffline);
    socketService.on('member:joined', loadServerMembers);
    socketService.on('member:left', loadServerMembers);

    return () => {
      socketService.off('user:online', handleUserOnline);
      socketService.off('user:offline', handleUserOffline);
      socketService.off('member:joined');
      socketService.off('member:left');
    };
  }, []);

  const loadServerMembers = async () => {
    try {
      const response = await axios.get(`/api/servers/${serverId}/members`);
      const membersData = response.data || [];
      
      // Sort members by role and status
      const sortedMembers = membersData.sort((a, b) => {
        // First sort by role priority
        const roleA = a.role?.priority || 999;
        const roleB = b.role?.priority || 999;
        if (roleA !== roleB) return roleA - roleB;
        
        // Then sort by online status
        if (a.status === 'online' && b.status !== 'online') return -1;
        if (a.status !== 'online' && b.status === 'online') return 1;
        
        // Finally sort by name
        return (a.displayName || a.username).localeCompare(b.displayName || b.username);
      });
      
      setMembers(sortedMembers);
      setOnlineCount(sortedMembers.filter(m => m.status === 'online').length);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load server members:', error);
      setLoading(false);
    }
  };

  const loadServerRoles = async () => {
    try {
      const response = await axios.get(`/api/servers/${serverId}/roles`);
      setRoles(response.data || []);
    } catch (error) {
      console.error('Failed to load server roles:', error);
    }
  };

  // Group members by role
  const membersByRole = {};
  const noRole = [];

  members.forEach(member => {
    if (member.roles && member.roles.length > 0) {
      // Get the highest priority role
      const primaryRole = member.roles.reduce((prev, current) => {
        const prevRole = roles.find(r => r._id === prev);
        const currentRole = roles.find(r => r._id === current);
        return (prevRole?.priority || 999) < (currentRole?.priority || 999) ? prev : current;
      });

      const role = roles.find(r => r._id === primaryRole);
      if (role) {
        if (!membersByRole[role.name]) {
          membersByRole[role.name] = {
            role: role,
            members: []
          };
        }
        membersByRole[role.name].members.push(member);
      } else {
        noRole.push(member);
      }
    } else {
      noRole.push(member);
    }
  });

  // Sort roles by priority
  const sortedRoleGroups = Object.values(membersByRole).sort((a, b) => 
    (a.role.priority || 999) - (b.role.priority || 999)
  );

  if (loading) {
    return (
      <div className="w-60 bg-gray-900 p-4 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-gray-900 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
          Members — {onlineCount} online
        </h3>
      </div>

      {/* Members List */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="py-2">
          {/* Members with roles */}
          {sortedRoleGroups.map(({ role, members }) => (
            <div key={role._id} className="mb-4">
              {/* Role Header */}
              <h4 className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                {role.name} — {members.length}
              </h4>
              
              {/* Role Members */}
              {members.map(member => (
                <MemberItem key={member._id || member.id} member={member} role={role} />
              ))}
            </div>
          ))}

          {/* Members without roles */}
          {noRole.length > 0 && (
            <div className="mb-4">
              <h4 className="px-4 py-1 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Online — {noRole.filter(m => m.status === 'online').length}
              </h4>
              
              {noRole.map(member => (
                <MemberItem key={member._id || member.id} member={member} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberItem({ member, role }) {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const isOnline = member.status === 'online';
  const displayName = member.displayName || member.username;
  const roleColor = role?.color || '#808080';

  return (
    <button
      className="w-full px-2 py-1.5 flex items-center space-x-3 hover:bg-gray-800/50 rounded transition-colors group"
      onContextMenu={(e) => {
        e.preventDefault();
        setShowContextMenu(true);
      }}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center overflow-hidden ${
          !isOnline ? 'opacity-50' : ''
        }`}>
          {member.avatar ? (
            <img 
              src={member.avatar} 
              alt={displayName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-primary-500 flex items-center justify-center">
              <span className="text-white text-sm font-semibold">
                {displayName[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </div>
        
        {/* Status Indicator */}
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-900"></div>
        )}
      </div>

      {/* Name and Status */}
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center space-x-1">
          <span 
            className={`font-medium text-sm truncate ${
              !isOnline ? 'text-gray-500' : 'text-gray-200'
            }`}
            style={{ color: isOnline && role ? roleColor : undefined }}
          >
            {displayName}
          </span>
          
          {/* Bot Badge */}
          {member.isBot && (
            <span className="px-1 py-0.5 bg-blue-500 text-white text-xs rounded">
              BOT
            </span>
          )}
        </div>
        
        {/* Custom Status */}
        {member.customStatus && (
          <div className="text-xs text-gray-400 truncate">
            {member.customStatus}
          </div>
        )}
        
        {/* Activity */}
        {member.activity && (
          <div className="text-xs text-gray-400 truncate">
            {member.activity.type === 'playing' && '🎮 '}
            {member.activity.type === 'streaming' && '📺 '}
            {member.activity.type === 'listening' && '🎵 '}
            {member.activity.type === 'watching' && '📺 '}
            {member.activity.name}
          </div>
        )}
      </div>

      {/* Icons (mic mute, etc) */}
      <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {member.isMuted && (
          <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.707.707L4.586 13H2a1 1 0 01-1-1V8a1 1 0 011-1h2.586l3.707-3.707a1 1 0 011.09-.217zM14.657 2.929a1 1 0 011.414 0l3 3a1 1 0 010 1.414l-3 3a1 1 0 01-1.414-1.414L16.586 7l-1.929-1.929a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        )}
        {member.isDeafened && (
          <svg className="w-4 h-4 text-primary-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8 7a1 1 0 00-1 1v4a1 1 0 001 1h4a1 1 0 001-1V8a1 1 0 00-1-1H8z" clipRule="evenodd" />
          </svg>
        )}
      </div>
    </button>
  );
}

export default MembersList;
