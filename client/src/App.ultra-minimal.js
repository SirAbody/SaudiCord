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
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#1a1a1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Arial, sans-serif'
    }}>
      <div style={{
        backgroundColor: '#2d2d2d',
        padding: '2rem',
        borderRadius: '8px',
        width: '300px'
      }}>
        <h1 style={{ color: '#53FC18', marginBottom: '1rem', textAlign: 'center' }}>
          SaudiCord
        </h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              boxSizing: 'border-box'
            }}
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            style={{
              width: '100%',
              padding: '0.5rem',
              marginBottom: '1rem',
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              boxSizing: 'border-box'
            }}
            required
          />
          {error && (
            <div style={{ color: '#ff6b6b', marginBottom: '1rem', fontSize: '0.9rem' }}>
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: loading ? '#666' : '#53FC18',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <div style={{ marginTop: '1rem', color: '#999', fontSize: '0.8rem' }}>
          <p>Test accounts:</p>
          <p>• liongtas / Lion509</p>
          <p>• admin / admin123</p>
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
          setChannels([{ id: 1, name: 'general' }]);
          setCurrentChannel({ id: 1, name: 'general' });
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
      user: { username: user.username },
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

  const handleLogout = useCallback(() => {
    globalToken = null;
    globalUser = null;
    localStorage.removeItem('token');
    onLogout();
  }, [onLogout]);

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#1a1a1a', color: 'white' }}>
      {/* Sidebar */}
      <div style={{ width: '200px', backgroundColor: '#2d2d2d', padding: '1rem' }}>
        <h3>SaudiCord</h3>
        <div style={{ marginTop: '1rem' }}>
          <h4>Channels</h4>
          {channels.map(ch => (
            <div
              key={ch.id}
              onClick={() => setCurrentChannel(ch)}
              style={{
                padding: '0.5rem',
                cursor: 'pointer',
                backgroundColor: currentChannel?.id === ch.id ? '#404040' : 'transparent',
                borderRadius: '4px',
                margin: '0.2rem 0'
              }}
            >
              # {ch.name}
            </div>
          ))}
        </div>
        <button
          onClick={handleLogout}
          style={{
            marginTop: 'auto',
            padding: '0.5rem',
            backgroundColor: '#666',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%'
          }}
        >
          Logout
        </button>
      </div>
      
      {/* Main area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '1rem', backgroundColor: '#2d2d2d', borderBottom: '1px solid #404040' }}>
          # {currentChannel?.name || 'Select a channel'}
        </div>
        
        <div style={{ flex: 1, padding: '1rem', overflow: 'auto' }}>
          {messages.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#999', marginTop: '2rem' }}>
              No messages yet. Start chatting!
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} style={{ marginBottom: '0.5rem' }}>
                <strong>{msg.user.username}:</strong> {msg.content}
              </div>
            ))
          )}
        </div>
        
        <form onSubmit={sendMessage} style={{ padding: '1rem', backgroundColor: '#2d2d2d' }}>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder={`Message #${currentChannel?.name || ''}`}
            style={{
              width: '100%',
              padding: '0.5rem',
              backgroundColor: '#404040',
              border: 'none',
              borderRadius: '4px',
              color: 'white',
              boxSizing: 'border-box'
            }}
          />
        </form>
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
