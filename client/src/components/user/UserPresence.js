// User Presence Component
// Shows user status and activity
import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import socketService from '../../services/socket';

function UserPresence() {
  const { user } = useAuthStore();
  const [status, setStatus] = useState('online');
  const [customStatus, setCustomStatus] = useState('');
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  
  const statusOptions = [
    { value: 'online', label: 'Online', color: 'bg-green-500' },
    { value: 'idle', label: 'Idle', color: 'bg-yellow-500' },
    { value: 'dnd', label: 'Do Not Disturb', color: 'bg-red-500' },
    { value: 'invisible', label: 'Invisible', color: 'bg-gray-500' }
  ];
  
  useEffect(() => {
    // Send presence update when status changes
    if (socketService && socketService.isConnected && socketService.isConnected()) {
      socketService.emit('presence:update', {
        status,
        customStatus
      });
    }
  }, [status, customStatus]);
  
  useEffect(() => {
    // Auto-idle after 5 minutes of inactivity
    let idleTimer;
    let lastActivity = Date.now();
    
    const resetIdleTimer = () => {
      lastActivity = Date.now();
      if (status === 'idle' && status !== 'dnd') {
        setStatus('online');
      }
      
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => {
        if (status === 'online') {
          setStatus('idle');
        }
      }, 5 * 60 * 1000); // 5 minutes
    };
    
    // Track user activity
    const events = ['mousedown', 'keydown', 'mousemove', 'touchstart'];
    events.forEach(event => {
      document.addEventListener(event, resetIdleTimer);
    });
    
    resetIdleTimer();
    
    return () => {
      clearTimeout(idleTimer);
      events.forEach(event => {
        document.removeEventListener(event, resetIdleTimer);
      });
    };
  }, [status]);
  
  const handleStatusChange = (newStatus) => {
    setStatus(newStatus);
    setShowStatusMenu(false);
  };
  
  const currentStatusOption = statusOptions.find(opt => opt.value === status);
  
  if (!user) return null;
  
  return (
    <div className="p-2 bg-black border-t border-red-900/30">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="relative">
            {user.avatar ? (
              <img 
                src={user.avatar} 
                alt={user.username}
                className="w-8 h-8 rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-red-500 flex items-center justify-center">
                <span className="text-sm text-white font-semibold">
                  {user.username?.[0]?.toUpperCase()}
                </span>
              </div>
            )}
            
            {/* Status indicator */}
            <div className={`absolute bottom-0 right-0 w-3 h-3 ${currentStatusOption.color} rounded-full border-2 border-black`} />
          </div>
          
          <div>
            <p className="text-white text-sm font-medium">{user.displayName || user.username}</p>
            <button
              onClick={() => setShowStatusMenu(!showStatusMenu)}
              className="text-xs text-gray-400 hover:text-white"
            >
              {currentStatusOption.label}
            </button>
          </div>
        </div>
        
        {/* Settings button */}
        <button className="p-1 hover:bg-red-900/20 rounded">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
      
      {/* Status menu */}
      {showStatusMenu && (
        <div className="absolute bottom-16 left-2 bg-black/90 border border-red-900/30 rounded-lg shadow-lg py-2 z-50">
          {statusOptions.map(option => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className="w-full px-4 py-2 flex items-center space-x-3 hover:bg-red-900/20 transition"
            >
              <div className={`w-3 h-3 ${option.color} rounded-full`} />
              <span className="text-white text-sm">{option.label}</span>
            </button>
          ))}
          
          <div className="border-t border-red-900/30 mt-2 pt-2 px-4">
            <input
              type="text"
              placeholder="Set custom status..."
              value={customStatus}
              onChange={(e) => setCustomStatus(e.target.value)}
              className="w-full bg-black/50 border border-red-900/30 text-white text-sm px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default UserPresence;
