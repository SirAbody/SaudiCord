// SaudiCord Client - Ultra-minimal version to prevent memory leaks
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Remove initial loader when React app mounts
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.style.display = 'none';
}

root.render(<App />);
