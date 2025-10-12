// Ultra-minimal App to prevent memory leaks
import React, { useState, useEffect, useCallback } from 'react';

// Minimal store without Zustand to avoid memory leaks
let globalUser = null;
let globalToken = localStorage.getItem('token');

// Simple fetch wrapper
const apiCall = async (endpoint, options = {}) => {
  const url = `/api${endpoint}`;
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...(globalToken && { 'Authorization': `Bearer ${globalToken}` })
    },
    ...options
  };
  
  const response = await fetch(url, config);
  return response.json();
};

// Login component
function Login({ onLogin }) {
  const [form, setForm] = useState({ username: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await apiCall('/auth/login', {
        method: 'POST',
        body: JSON.stringify(form)
      });
      
      if (data.token) {
        globalToken = data.token;
        globalUser = data.user;
        localStorage.setItem('token', data.token);
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [form, onLogin]);

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card animate-fade-in" style={{ width: '400px' }}>
        <div className="text-center mb-4">
          <h1 className="text-2xl font-bold text-accent mb-2">SaudiCord</h1>
          <p className="text-muted">Welcome back! We're so excited to see you again!</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="text-sm font-medium text-muted mb-2" style={{ display: 'block' }}>
              USERNAME
            </label>
            <input
              type="text"
              name="username"
              value={form.username}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
          <div className="mb-4">
            <label className="text-sm font-medium text-muted mb-2" style={{ display: 'block' }}>
              PASSWORD
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              className="input"
              required
            />
          </div>
          {error && (
            <div className="text-danger text-sm mb-4 p-3 rounded" style={{ backgroundColor: 'rgba(240, 71, 71, 0.1)' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className={`btn w-full ${loading ? 'btn-secondary' : 'btn-primary'} mb-2`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="spinner animate-spin"></span>
                Logging in...
              </span>
            ) : 'Login'}
          </button>
        </form>
        <div className="mt-4 p-3 rounded" style={{ backgroundColor: 'var(--background-tertiary)' }}>
          <p className="text-sm text-muted mb-2">Demo accounts:</p>
          <div className="flex gap-2">
            <button 
              className="btn btn-secondary text-sm"
              onClick={() => setForm({ username: 'liongtas', password: 'Lion509' })}
            >
              Lion509
            </button>
            <button 
              className="btn btn-secondary text-sm"
              onClick={() => setForm({ username: 'admin', password: 'admin123' })}
            >
              Admin
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Chat component
function Chat({ user, onLogout }) {
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [inVoiceCall, setInVoiceCall] = useState(false);
  const [onlineUsers] = useState([
    { id: 1, username: 'admin', status: 'online' },
    { id: 2, username: 'liongtas', status: 'idle' },
    { id: 3, username: user.username, status: 'online' }
  ]);

  // Load channels on mount
  useEffect(() => {
    let mounted = true;
    
    apiCall('/channels')
      .then(data => {
        if (mounted && data) {
          setChannels(data);
          if (data.length > 0) {
            setCurrentChannel(data[0]);
          }
        }
      })
      .catch(() => {
        if (mounted) {
          setChannels([
            { id: 1, name: 'general', type: 'text' },
            { id: 2, name: 'voice-chat', type: 'voice' }
          ]);
          setCurrentChannel({ id: 1, name: 'general', type: 'text' });
        }
      });
    
    return () => { mounted = false; };
  }, []);

  const sendMessage = useCallback(async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentChannel) return;

    const message = {
      id: Date.now(),
      content: newMessage,
      user: { username: user.username, avatar: `https://ui-avatars.com/api/?name=${user.username}&background=FF0000&color=fff` },
      createdAt: new Date()
    };

    setMessages(prev => [...prev, message]);
    setNewMessage('');

    try {
      await apiCall('/messages', {
        method: 'POST',
        body: JSON.stringify({
          content: newMessage,
          channelId: currentChannel.id
        })
      });
    } catch (err) {
      console.error('Send failed:', err);
    }
  }, [newMessage, currentChannel, user.username]);

  const handleVoiceCall = useCallback(() => {
    setInVoiceCall(!inVoiceCall);
    // Here you would implement actual voice call logic
  }, [inVoiceCall]);

  const handleLogout = useCallback(() => {
    globalToken = null;
    globalUser = null;
    localStorage.removeItem('token');
    onLogout();
  }, [onLogout]);

  return (
    <div className="flex h-screen">
      {/* Server List */}
      <div className="w-20 flex flex-col items-center py-3 gap-2" style={{ backgroundColor: 'var(--background-tertiary)' }}>
        <div className="server-icon">SC</div>
        <div style={{ width: '32px', height: '2px', backgroundColor: 'var(--border)', borderRadius: '1px' }}></div>
      </div>

      {/* Channels Sidebar */}
      <div className="w-60 flex flex-col" style={{ backgroundColor: 'var(--background-secondary)' }}>
        <div className="px-4 py-3 border-b font-bold text-white">
          SaudiCord Community
        </div>
        
        <div className="flex-1 p-2">
          <div className="mb-4">
            <div className="text-xs font-medium text-muted mb-2 px-2">TEXT CHANNELS</div>
            {channels.filter(ch => ch.type !== 'voice').map(ch => (
              <div
                key={ch.id}
                onClick={() => setCurrentChannel(ch)}
                className={`channel-item ${currentChannel?.id === ch.id ? 'active' : ''}`}
              >
                {ch.name}
              </div>
            ))}
          </div>

          <div className="mb-4">
            <div className="text-xs font-medium text-muted mb-2 px-2">VOICE CHANNELS</div>
            {channels.filter(ch => ch.type === 'voice').map(ch => (
              <div
                key={ch.id}
                onClick={() => setCurrentChannel(ch)}
                className={`channel-item voice-channel ${currentChannel?.id === ch.id ? 'active' : ''}`}
              >
                {ch.name}
                {ch.type === 'voice' && (
                  <button 
                    className={`call-btn ml-auto ${inVoiceCall ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleVoiceCall();
                    }}
                  >
                    📞
                  </button>
                )}
              </div>
            ))}
          </div>

          {inVoiceCall && (
            <div className="p-3 rounded" style={{ backgroundColor: 'var(--background-tertiary)' }}>
              <div className="text-sm font-medium mb-2">Voice Connected</div>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-2 h-2 rounded-full bg-success"></div>
                <span className="text-sm">{user.username}</span>
              </div>
              <div className="flex gap-2">
                <button className="btn-danger rounded-full p-2" onClick={handleVoiceCall}>
                  🔇
                </button>
                <button className="btn-secondary rounded-full p-2">
                  🔈
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User info at bottom */}
        <div className="p-3 border-t flex items-center gap-3">
          <div className="relative">
            <img
              src={`https://ui-avatars.com/api/?name=${user.username}&background=FF0000&color=fff`}
              alt={user.username}
              className="avatar-md"
            />
            <div className="status status-online"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user.displayName || user.username}</div>
            <div className="text-xs text-muted">#{user.username}</div>
          </div>
          <button onClick={handleLogout} className="btn-secondary p-2 rounded">
            🚪
          </button>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat header */}
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <span className="text-xl">{currentChannel?.type === 'voice' ? '🔊' : '#'}</span>
          <span className="font-medium">{currentChannel?.name || 'Select a channel'}</span>
          {currentChannel?.type === 'voice' && !inVoiceCall && (
            <button className="btn btn-success ml-auto" onClick={handleVoiceCall}>
              Join Voice
            </button>
          )}
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-auto p-4">
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="text-4xl mb-4">{currentChannel?.type === 'voice' ? '🎤' : '💬'}</div>
              <div className="text-lg font-medium mb-2">Welcome to #{currentChannel?.name}</div>
              <div className="text-muted">
                {currentChannel?.type === 'voice' 
                  ? 'This is a voice channel. Click "Join Voice" to start talking!'
                  : 'This is the start of your conversation. Say hello!'
                }
              </div>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="message flex gap-3">
                <img src={msg.user.avatar} alt={msg.user.username} className="avatar-lg" />
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{msg.user.username}</span>
                    <span className="text-xs text-muted">
                      {new Date(msg.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="message-content">{msg.content}</div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Message input */}
        {currentChannel?.type !== 'voice' && (
          <form onSubmit={sendMessage} className="p-4">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message #${currentChannel?.name || ''}`}
              className="input"
            />
          </form>
        )}
      </div>

      {/* Online Users Sidebar */}
      <div className="w-60 p-4" style={{ backgroundColor: 'var(--background-secondary)' }}>
        <div className="text-xs font-medium text-muted mb-4">ONLINE — {onlineUsers.length}</div>
        {onlineUsers.map(u => (
          <div key={u.id} className="flex items-center gap-3 mb-3 px-2 py-1 rounded hover:bg-hover">
            <div className="relative">
              <img
                src={`https://ui-avatars.com/api/?name=${u.username}&background=FF0000&color=fff`}
                alt={u.username}
                className="avatar-md"
              />
              <div className={`status status-${u.status}`}></div>
            </div>
            <span className="text-sm">{u.username}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Main App
function App() {
  const [user, setUser] = useState(globalUser);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    let mounted = true;
    
    if (globalToken) {
      // Quick auth check
      apiCall('/auth/verify')
        .then(data => {
          if (mounted) {
            if (data.valid && data.user) {
              globalUser = data.user;
              setUser(data.user);
            } else {
              globalToken = null;
              localStorage.removeItem('token');
            }
            setChecking(false);
          }
        })
        .catch(() => {
          if (mounted) {
            setChecking(false);
          }
        });
    } else {
      setChecking(false);
    }
    
    return () => { mounted = false; };
  }, []);

  const handleLogin = useCallback((userData) => {
    setUser(userData);
  }, []);

  const handleLogout = useCallback(() => {
    setUser(null);
  }, []);

  if (checking) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: '#1a1a1a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white'
      }}>
        Loading...
      </div>
    );
  }

  return user ? (
    <Chat user={user} onLogout={handleLogout} />
  ) : (
    <Login onLogin={handleLogin} />
  );
}

export default App;
