// Keyboard Shortcuts Hook - Discord-like
// Made With Love By SirAbody

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useChatStore } from '../stores/chatStore';
import { useAuthStore } from '../stores/authStore';
import voiceService from '../services/voiceService';
import soundService from '../services/soundService';

function useKeyboardShortcuts() {
  const navigate = useNavigate();
  const { currentChannel, servers } = useChatStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const handleKeyPress = (e) => {
      // Check if user is typing in an input field
      const isTyping = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
      
      // Ctrl/Cmd + K - Quick server switcher
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        // Open quick server switcher modal (to be implemented)
        console.log('[Shortcuts] Quick switcher triggered');
      }
      
      // Ctrl/Cmd + Shift + M - Toggle mute (when not typing)
      if (!isTyping && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'M') {
        e.preventDefault();
        if (voiceService.isInVoiceChannel()) {
          const isMuted = voiceService.toggleMute();
          soundService.play(isMuted ? 'mute' : 'unmute');
          console.log('[Shortcuts] Toggle mute:', isMuted);
        }
      }
      
      // Ctrl/Cmd + Shift + D - Toggle deafen (when not typing)
      if (!isTyping && (e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'D') {
        e.preventDefault();
        if (voiceService.isInVoiceChannel()) {
          console.log('[Shortcuts] Toggle deafen');
          soundService.play('deafen');
        }
      }
      
      // Escape - Leave voice channel / Close modal
      if (e.key === 'Escape') {
        // Check if modal is open
        const modal = document.querySelector('.modal-backdrop');
        if (modal) {
          // Close modal
          const closeButton = modal.querySelector('.close-modal');
          if (closeButton) closeButton.click();
        } else if (voiceService.isInVoiceChannel()) {
          // Leave voice channel
          voiceService.leaveVoiceChannel();
          soundService.playVoiceLeave();
        }
      }
      
      // Alt + Up/Down - Navigate channels (when not typing)
      if (!isTyping && e.altKey) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          navigateChannels('up');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          navigateChannels('down');
        }
      }
      
      // Ctrl/Cmd + Alt + Right/Left - Navigate servers
      if ((e.ctrlKey || e.metaKey) && e.altKey) {
        if (e.key === 'ArrowRight') {
          e.preventDefault();
          navigateServers('next');
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault();
          navigateServers('prev');
        }
      }
      
      // Ctrl/Cmd + Home - Go to DMs
      if ((e.ctrlKey || e.metaKey) && e.key === 'Home') {
        e.preventDefault();
        navigate('/dm');
      }
      
      // Ctrl/Cmd + / - Show keyboard shortcuts
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        showShortcutsHelp();
      }
    };
    
    // Helper function to navigate channels
    const navigateChannels = (direction) => {
      const channels = document.querySelectorAll('[data-channel-id]');
      if (channels.length === 0) return;
      
      let currentIndex = -1;
      channels.forEach((channel, index) => {
        if (channel.classList.contains('active')) {
          currentIndex = index;
        }
      });
      
      let nextIndex;
      if (direction === 'up') {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : channels.length - 1;
      } else {
        nextIndex = currentIndex < channels.length - 1 ? currentIndex + 1 : 0;
      }
      
      channels[nextIndex]?.click();
    };
    
    // Helper function to navigate servers
    const navigateServers = (direction) => {
      const serverButtons = document.querySelectorAll('[data-server-id]');
      if (serverButtons.length === 0) return;
      
      let currentIndex = -1;
      serverButtons.forEach((server, index) => {
        if (server.classList.contains('active')) {
          currentIndex = index;
        }
      });
      
      let nextIndex;
      if (direction === 'next') {
        nextIndex = currentIndex < serverButtons.length - 1 ? currentIndex + 1 : 0;
      } else {
        nextIndex = currentIndex > 0 ? currentIndex - 1 : serverButtons.length - 1;
      }
      
      serverButtons[nextIndex]?.click();
    };
    
    // Show keyboard shortcuts help
    const showShortcutsHelp = () => {
      const shortcuts = [
        { keys: 'Ctrl/Cmd + K', description: 'Quick server switcher' },
        { keys: 'Ctrl/Cmd + Shift + M', description: 'Toggle mute' },
        { keys: 'Ctrl/Cmd + Shift + D', description: 'Toggle deafen' },
        { keys: 'Escape', description: 'Leave voice / Close modal' },
        { keys: 'Alt + ↑/↓', description: 'Navigate channels' },
        { keys: 'Ctrl/Cmd + Alt + ←/→', description: 'Navigate servers' },
        { keys: 'Ctrl/Cmd + Home', description: 'Go to DMs' },
        { keys: 'Ctrl/Cmd + /', description: 'Show this help' }
      ];
      
      // Create and show modal with shortcuts
      const modal = document.createElement('div');
      modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50 modal-backdrop';
      modal.innerHTML = `
        <div class="bg-dark-800 rounded-lg p-6 max-w-md w-full modal-enter">
          <h2 class="text-xl font-bold text-white mb-4">Keyboard Shortcuts</h2>
          <div class="space-y-2">
            ${shortcuts.map(s => `
              <div class="flex justify-between">
                <kbd class="px-2 py-1 bg-dark-700 rounded text-sm text-gray-300">${s.keys}</kbd>
                <span class="text-gray-400">${s.description}</span>
              </div>
            `).join('')}
          </div>
          <button class="close-modal mt-4 px-4 py-2 bg-primary-500 text-white rounded hover:bg-primary-600 transition">
            Close
          </button>
        </div>
      `;
      
      modal.addEventListener('click', (e) => {
        if (e.target === modal || e.target.classList.contains('close-modal')) {
          modal.remove();
        }
      });
      
      document.body.appendChild(modal);
    };
    
    // Add event listener
    document.addEventListener('keydown', handleKeyPress);
    
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [navigate, currentChannel, servers, user]);
}

export default useKeyboardShortcuts;
