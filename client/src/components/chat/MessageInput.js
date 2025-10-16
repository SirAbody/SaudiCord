// Message Input Component
import React, { useState, useRef, useEffect } from 'react';
import { PaperAirplaneIcon, PlusIcon, FaceSmileIcon, GifIcon } from '@heroicons/react/24/outline';
import EmojiPicker from 'emoji-picker-react';
import { useChatStore } from '../../stores/chatStore';
import toast from 'react-hot-toast';
import socketService from '../../services/socket';

function MessageInput() {
  const { currentChannel, sendMessage } = useChatStore();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (message.trim() && currentChannel) {
      sendMessage(message);
      setMessage('');
    } else if (!currentChannel) {
      toast.error('Please select a channel first');
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  // Handle typing indicator
  useEffect(() => {
    if (message && currentChannel && !isTyping) {
      setIsTyping(true);
      socketService.emit('typing:start', { channelId: currentChannel.id });
    }

    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Set new timeout to stop typing
    if (message) {
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        socketService.emit('typing:stop', { channelId: currentChannel.id });
      }, 2000);
    } else if (isTyping) {
      setIsTyping(false);
      socketService.emit('typing:stop', { channelId: currentChannel.id });
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [message, currentChannel, isTyping]);

  return (
    <form onSubmit={handleSubmit} className="relative px-4 py-4 border-t border-dark-400 bg-background-secondary">
      <div className="flex items-center bg-background-tertiary rounded-lg px-3">
        {/* File/Attachment button */}
        <button
          type="button"
          className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
        >
          <PlusIcon className="h-5 w-5" />
        </button>

        {/* Message input */}
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={currentChannel ? `Message #${currentChannel.name}` : 'Select a channel'}
          className="flex-1 bg-transparent text-text-primary placeholder-text-tertiary outline-none py-3"
          disabled={!currentChannel}
        />

        {/* Action buttons */}
        <div className="flex items-center pr-1">
          {/* GIF button */}
          <button
            type="button"
            className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
            title="Send GIF"
          >
            <GifIcon className="h-5 w-5" />
          </button>

          {/* Emoji picker button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-gray-400 hover:text-gray-300 transition-colors"
              title="Emoji"
            >
              <FaceSmileIcon className="h-5 w-5" />
            </button>
            
            {/* Emoji Picker Popup */}
            {showEmojiPicker && (
              <div className="absolute bottom-12 right-0 z-50">
                <div className="shadow-2xl rounded-lg overflow-hidden">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    theme="dark"
                    searchDisabled
                    skinTonesDisabled
                    height={350}
                    width={350}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Send button */}
          <button
            type="submit"
            className={`p-2 transition-colors ${
              message.trim()
                ? 'text-accent hover:text-accent-light'
                : 'text-text-tertiary cursor-not-allowed'
            }`}
            disabled={!message.trim()}
            title="Send Message"
          >
            <PaperAirplaneIcon className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Character count */}
      <div className="mt-1 text-right">
        <span className={`text-xs ${message.length > 2000 ? 'text-accent' : 'text-text-tertiary'}`}>
          {message.length}/2000
        </span>
      </div>
    </form>
  );
}

export default MessageInput;
