// SaudiCord Client - Made With Love By SirAbody
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App';
// Import styles
import './index.css';
import './styles/animations.css';
// Import axios setup for MongoDB
import './services/axiosSetup-mongodb';

console.log('[Index] Starting SaudiCord application...');
console.log('[Index] All imports loaded successfully');

// Get root element
const rootElement = document.getElementById('root');
console.log('[Index] Root element found:', !!rootElement);

if (!rootElement) {
  console.error('[Index] CRITICAL: No root element found!');
  document.body.innerHTML = '<div style="color: white; padding: 20px;">Error: Root element not found</div>';
} else {
  console.log('[Index] Creating React root...');
}

const root = ReactDOM.createRoot(rootElement);

// Always enable dark mode
document.documentElement.classList.add('dark');
console.log('[Index] Dark mode enabled');

// Remove initial loader when React app mounts
const loader = document.getElementById('initial-loader');
if (loader) {
  loader.style.display = 'none';
  console.log('[Index] Initial loader removed');
}

// Disable React StrictMode in production for better performance
const AppWrapper = process.env.NODE_ENV === 'development' ? React.StrictMode : React.Fragment;
console.log('[Index] Environment:', process.env.NODE_ENV);

console.log('[Index] Rendering React application...');

try {
  root.render(
    <AppWrapper>
      <BrowserRouter>
        <App />
        <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000, // Shorter duration to reduce memory
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
    </AppWrapper>
  );
  console.log('[Index] React app rendered successfully');
} catch (error) {
  console.error('[Index] CRITICAL: Failed to render app:', error);
  document.body.innerHTML = `<div style="color: white; padding: 20px;">Error: ${error.message}</div>`;
}

// Add global error handler
window.addEventListener('error', (event) => {
  console.error('[Index] Global error:', event.error);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('[Index] Unhandled promise rejection:', event.reason);
});
