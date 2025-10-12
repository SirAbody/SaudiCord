// SaudiCord Client - Made With Love By SirAbody
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
import './index.css';
import './services/axiosSetup';

const root = ReactDOM.createRoot(document.getElementById('root'));

// Always enable dark mode
document.documentElement.classList.add('dark');

// Remove initial loader when React app mounts
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.style.display = 'none';
}

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1e1e1e',
            color: '#fff',
            border: '1px solid #FF0000',
          },
          success: {
            iconTheme: {
              primary: '#FF0000',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#FF0000',
              secondary: '#fff',
            },
          },
        }}
      />
    </BrowserRouter>
  </React.StrictMode>
);
