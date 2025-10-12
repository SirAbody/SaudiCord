// Ultra-minimal App for performance
import React, { useState, useEffect } from 'react';
import './index.css';

// Simple login component
function SimpleLogin({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      
      const data = await res.json();
      
      if (res.ok) {
        localStorage.setItem('token', data.token);
        onLogin(data.user);
      } else {
        setError(data.error || 'Login failed');
      }
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="bg-gray-800 p-8 rounded-lg w-96">
        <h1 className="text-2xl font-bold text-white mb-6">SaudiCord</h1>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 bg-gray-700 text-white rounded"
            required
          />
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Loading...' : 'Login'}
          </button>
        </form>
        <div className="mt-4 text-gray-400 text-sm">
          <p>Test accounts:</p>
          <p>• liongtas / Lion509</p>
          <p>• admin / admin123</p>
        </div>
      </div>
    </div>
  );
}

// Simple chat component
function SimpleChat({ user, onLogout }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [channels, setChannels] = useState([]);
  const [currentChannel, setCurrentChannel] = useState(null);

  useEffect(() => {
    // Load channels
    fetch('/api/channels', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    .then(res => res.json())
    .then(data => {
      setChannels(data || []);
      if (data && data.length > 0) {
        setCurrentChannel(data[0]);
      }
    })
    .catch(console.error);
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || !currentChannel) return;
    
    try {
      await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          content: input,
          channelId: currentChannel.id
        })
      });
      
      setInput('');
      // Add optimistic update
      setMessages(prev => [...prev, {
        id: Date.now(),
        content: input,
        user: { username: user.username },
        createdAt: new Date()
      }]);
    } catch (err) {
      console.error('Send failed:', err);
    }
  };

  return (
    <div className="flex h-screen bg-gray-900">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4">
        <div className="text-white font-bold mb-4">SaudiCord</div>
        <div className="text-gray-400 text-sm mb-2">Channels</div>
        {channels.map(ch => (
          <div
            key={ch.id}
            onClick={() => setCurrentChannel(ch)}
            className={`p-2 text-gray-300 hover:bg-gray-700 cursor-pointer rounded ${
              currentChannel?.id === ch.id ? 'bg-gray-700' : ''
            }`}
          >
            # {ch.name}
          </div>
        ))}
        <button
          onClick={onLogout}
          className="mt-4 w-full p-2 bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
        >
          Logout
        </button>
      </div>
      
      {/* Chat area */}
      <div className="flex-1 flex flex-col">
        <div className="bg-gray-800 p-4 text-white">
          # {currentChannel?.name || 'Select a channel'}
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="text-gray-500 text-center mt-10">
              No messages yet. Start a conversation!
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id} className="mb-4">
                <span className="text-white font-bold">{msg.user.username}: </span>
                <span className="text-gray-300">{msg.content}</span>
              </div>
            ))
          )}
        </div>
        
        <form onSubmit={sendMessage} className="p-4 bg-gray-800">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${currentChannel?.name || ''}`}
            className="w-full p-2 bg-gray-700 text-white rounded"
          />
        </form>
      </div>
    </div>
  );
}

// Main App
function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    // Quick auth check
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/auth/verify', {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(data => {
        if (data.valid && data.user) {
          setUser(data.user);
        }
      })
      .catch(() => {})
      .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return user ? (
    <SimpleChat user={user} onLogout={handleLogout} />
  ) : (
    <SimpleLogin onLogin={setUser} />
  );
}

export default App;
