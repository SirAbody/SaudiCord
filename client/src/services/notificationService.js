// Global Notification Service
import toast from 'react-hot-toast';
import soundService from './soundService';

class NotificationService {
  constructor() {
    this.enabled = true;
    this.soundEnabled = true;
    this.desktopEnabled = false;
    this.messageQueue = [];
    this.isPageVisible = true;
    this.unreadCount = 0;
    
    // Check browser notification support
    if ('Notification' in window) {
      this.checkDesktopPermission();
    }
    
    // Track page visibility
    document.addEventListener('visibilitychange', () => {
      this.isPageVisible = !document.hidden;
      if (this.isPageVisible) {
        this.unreadCount = 0;
        this.updateTitle();
      }
    });
  }
  
  async checkDesktopPermission() {
    if (Notification.permission === 'granted') {
      this.desktopEnabled = true;
    } else if (Notification.permission !== 'denied') {
      // Ask for permission later when user interacts
      this.desktopEnabled = false;
    }
  }
  
  async requestDesktopPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      this.desktopEnabled = permission === 'granted';
      return this.desktopEnabled;
    }
    return false;
  }
  
  // Show notification for direct messages
  showMessageNotification(data) {
    if (!this.enabled) return;
    
    const { senderName, message, avatar, conversationId } = data;
    
    // Don't show if user is currently viewing this conversation
    const currentPath = window.location.pathname;
    if (currentPath === '/dashboard' && this.isPageVisible) {
      // Check if viewing this conversation
      const selectedConvId = document.querySelector('[data-conversation-id]')?.dataset.conversationId;
      if (selectedConvId === conversationId) {
        return; // User is already viewing this conversation
      }
    }
    
    // Play notification sound
    if (this.soundEnabled) {
      soundService.playSound('notification');
    }
    
    // Update unread count if page not visible
    if (!this.isPageVisible) {
      this.unreadCount++;
      this.updateTitle();
    }
    
    // Show toast notification
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
        max-w-md w-full bg-gray-900 shadow-lg rounded-lg pointer-events-auto 
        flex ring-1 ring-black ring-opacity-5 border border-gray-700`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              {avatar ? (
                <img className="h-10 w-10 rounded-full" src={avatar} alt="" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-red-500 flex items-center justify-center">
                  <span className="text-white font-semibold">
                    {senderName?.[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                {senderName}
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {message.length > 100 ? message.substring(0, 100) + '...' : message}
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-700">
          <button
            onClick={() => {
              // Navigate to conversation
              window.location.href = '/dashboard';
              toast.dismiss(t.id);
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 
              flex items-center justify-center text-sm font-medium text-red-400 
              hover:text-red-300 hover:bg-gray-800 focus:outline-none"
          >
            View
          </button>
        </div>
      </div>
    ), {
      duration: 5000,
      position: 'bottom-right'
    });
    
    // Show desktop notification if enabled
    if (this.desktopEnabled && !this.isPageVisible) {
      this.showDesktopNotification({
        title: senderName,
        body: message,
        icon: avatar || '/SaudiCordLogo.png'
      });
    }
  }
  
  // Show notification for friend requests
  showFriendRequestNotification(data) {
    if (!this.enabled) return;
    
    const { username, avatar } = data;
    
    // Play notification sound
    if (this.soundEnabled) {
      soundService.playSound('notification');
    }
    
    // Show toast
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
        max-w-md w-full bg-gray-900 shadow-lg rounded-lg pointer-events-auto 
        flex ring-1 ring-black ring-opacity-5 border border-gray-700`}
      >
        <div className="flex-1 w-0 p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="h-10 w-10 rounded-full bg-green-500 flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                    d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
              </div>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm font-medium text-white">
                Friend Request
              </p>
              <p className="mt-1 text-sm text-gray-400">
                {username} sent you a friend request
              </p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-gray-700">
          <button
            onClick={() => {
              window.location.href = '/dashboard';
              toast.dismiss(t.id);
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg p-4 
              flex items-center justify-center text-sm font-medium text-green-400 
              hover:text-green-300 hover:bg-gray-800 focus:outline-none"
          >
            View
          </button>
        </div>
      </div>
    ), {
      duration: 6000,
      position: 'bottom-right'
    });
  }
  
  // Show notification for server messages
  showServerMessageNotification(data) {
    if (!this.enabled) return;
    
    const { serverName, channelName, senderName, message, avatar } = data;
    
    // Don't show if user is in this channel
    const currentChannel = document.querySelector('[data-channel-id]')?.dataset.channelId;
    if (currentChannel === data.channelId && this.isPageVisible) {
      return;
    }
    
    // Play notification sound (quieter for server messages)
    if (this.soundEnabled) {
      soundService.playSound('message');
    }
    
    // Only show toast if user is mentioned or it's important
    if (data.isMention || data.isImportant) {
      toast(`💬 ${senderName} in #${channelName}`, {
        description: message.substring(0, 100),
        duration: 4000,
        style: {
          background: '#1f2937',
          color: '#fff',
          border: '1px solid #374151'
        }
      });
    }
    
    // Update unread count
    if (!this.isPageVisible) {
      this.unreadCount++;
      this.updateTitle();
    }
  }
  
  // Show desktop notification
  showDesktopNotification(options) {
    if (!this.desktopEnabled) return;
    
    const notification = new Notification(options.title, {
      body: options.body,
      icon: options.icon,
      badge: '/SaudiCordLogo.png',
      tag: options.tag || 'saudicord-notification',
      requireInteraction: false
    });
    
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    
    // Auto close after 5 seconds
    setTimeout(() => notification.close(), 5000);
  }
  
  // Update page title with unread count
  updateTitle() {
    const baseTitle = 'SaudiCord';
    if (this.unreadCount > 0) {
      document.title = `(${this.unreadCount}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
  }
  
  // Clear all notifications
  clearAll() {
    this.messageQueue = [];
    this.unreadCount = 0;
    this.updateTitle();
  }
  
  // Toggle sound
  toggleSound() {
    this.soundEnabled = !this.soundEnabled;
    return this.soundEnabled;
  }
  
  // Toggle notifications
  toggleNotifications() {
    this.enabled = !this.enabled;
    return this.enabled;
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;
