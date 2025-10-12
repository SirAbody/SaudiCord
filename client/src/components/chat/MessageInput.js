// Message Input Component
import React, { useState, useRef, useEffect } from 'react';
import { PlusCircleIcon, GiftIcon, PhotoIcon, FaceSmileIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';
import EmojiPicker from 'emoji-picker-react';
import socketService from '../../services/socket';
import { useChatStore } from '../../stores/chatStore';
import toast from 'react-hot-toast';

function MessageInput() {
  const { currentChannel } = useChatStore();
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  const handleSend = () => {
    if (message.trim() || selectedFiles.length > 0) {
      // Send message via socket
      socketService.sendMessage(currentChannel.id, message.trim(), selectedFiles);
      
      // Clear input
      setMessage('');
      setSelectedFiles([]);
      
      // Stop typing indicator
      if (isTyping) {
        socketService.stopTyping(currentChannel.id);
        setIsTyping(false);
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      socketService.startTyping(currentChannel.id);
    }

    // Reset typing timeout
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping) {
        socketService.stopTyping(currentChannel.id);
        setIsTyping(false);
      }
    }, 3000);
  };

  const handleEmojiClick = (emojiObject) => {
    setMessage(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      // Upload files logic here
      toast.success(`${files.length} file(s) selected`);
      setSelectedFiles(files);
    }
  };

  useEffect(() => {
    // Cleanup typing indicator on unmount
    return () => {
      if (isTyping) {
        socketService.stopTyping(currentChannel.id);
      }
      clearTimeout(typingTimeoutRef.current);
    };
  }, [currentChannel.id, isTyping]);

  return (
    <div className="px-4 pb-6 mt-auto">
      {/* Selected files preview */}
      {selectedFiles.length > 0 && (
        <div className="mb-2 p-2 bg-dark-300 rounded-lg">
          <p className="text-sm text-text-secondary mb-1">
            {selectedFiles.length} file(s) attached
          </p>
          <button
            onClick={() => setSelectedFiles([])}
            className="text-xs text-accent hover:text-accent-light"
          >
            Clear attachments
          </button>
        </div>
      )}

      {/* Input container */}
      <div className="flex items-center bg-dark-400 rounded-lg">
        {/* File upload button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-3 text-text-tertiary hover:text-text-primary transition-colors"
          title="Upload File"
        >
          <PlusCircleIcon className="w-6 h-6" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
        />

        {/* Text input */}
        <input
          type="text"
          value={message}
          onChange={(e) => {
            setMessage(e.target.value);
            handleTyping();
          }}
          onKeyDown={handleKeyDown}
          placeholder={`Message #${currentChannel?.name || 'channel'}`}
          className="flex-1 bg-transparent text-text-primary placeholder-text-tertiary outline-none py-3"
        />

        {/* Action buttons */}
        <div className="flex items-center pr-1">
          {/* Gift button */}
          <button
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
            title="Send Gift"
          >
            <GiftIcon className="w-5 h-5" />
          </button>

          {/* GIF button */}
          <button
            className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
            title="Send GIF"
          >
            <PhotoIcon className="w-5 h-5" />
          </button>

          {/* Emoji picker button */}
          <div className="relative">
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="p-2 text-text-tertiary hover:text-text-primary transition-colors"
              title="Emoji"
            >
              <FaceSmileIcon className="w-5 h-5" />
            </button>
            
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
            onClick={handleSend}
            className={`p-2 transition-colors ${
              message.trim() || selectedFiles.length > 0
                ? 'text-accent hover:text-accent-light'
                : 'text-text-tertiary cursor-not-allowed'
            }`}
            disabled={!message.trim() && selectedFiles.length === 0}
            title="Send Message"
          >
            <PaperAirplaneIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Character count */}
      <div className="mt-1 text-right">
        <span className={`text-xs ${message.length > 2000 ? 'text-accent' : 'text-text-tertiary'}`}>
          {message.length}/2000
        </span>
      </div>
    </div>
  );
}

export default MessageInput;
