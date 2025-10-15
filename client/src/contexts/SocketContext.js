import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import socketService from '../services/socket';

const SocketContext = createContext({});

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    console.warn('useSocket must be used within SocketProvider');
    // Return empty object to prevent errors
    return {
      socket: null,
      connected: false,
      connectSocket: () => {},
      disconnectSocket: () => {}
    };
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuthStore();
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;

  useEffect(() => {
    if (user && user.token) {
      connectSocket(user.token);
    } else if (socket) {
      disconnectSocket();
    }

    return () => {
      if (socket) {
        disconnectSocket();
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const connectSocket = async (token) => {
    try {
      const socketInstance = socketService.connect(token);
      
      if (!socketInstance) {
        console.error('[SocketContext] Failed to create socket instance');
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current++;
          setTimeout(() => connectSocket(token), 2000 * reconnectAttempts.current);
        }
        return;
      }

      socketInstance.on('connect', () => {
        console.log('[SocketContext] Socket connected');
        setConnected(true);
        reconnectAttempts.current = 0;
        
        // Authenticate after connection
        socketInstance.emit('authenticate', token);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('[SocketContext] Socket disconnected:', reason);
        setConnected(false);
        
        // Auto-reconnect for certain disconnect reasons
        if (reason === 'io server disconnect' || reason === 'transport close') {
          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            setTimeout(() => connectSocket(token), 2000 * reconnectAttempts.current);
          }
        }
      });

      socketInstance.on('auth:success', (data) => {
        console.log('[SocketContext] Authentication successful:', data);
      });

      socketInstance.on('auth:error', (error) => {
        console.error('[SocketContext] Authentication failed:', error);
        setConnected(false);
      });

      socketInstance.on('connect_error', (error) => {
        console.error('[SocketContext] Connection error:', error.message);
        setConnected(false);
      });

      setSocket(socketInstance);
    } catch (error) {
      console.error('[SocketContext] Error connecting socket:', error);
      setConnected(false);
    }
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
      reconnectAttempts.current = 0;
    }
  };

  const value = {
    socket,
    connected,
    connectSocket,
    disconnectSocket
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
