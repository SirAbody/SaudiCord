// Message List Component
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useChatStore } from '../../stores/chatStore';
import { useAuthStore } from '../../stores/authStore';
import Message from './Message';
import { format } from 'date-fns';

function MessageList() {
  const { currentChannel, messages, typingUsers } = useChatStore();
  const { user } = useAuthStore();
  const messagesEndRef = useRef(null);
  const [groupedMessages, setGroupedMessages] = useState([]);

  const channelMessages = useMemo(() => messages[currentChannel?.id] || [], [messages, currentChannel?.id]);
  const typingInChannel = typingUsers[currentChannel?.id] || [];

  useEffect(() => {
    // Group messages by date
    const grouped = [];
    let currentDate = null;
    let currentGroup = null;

    channelMessages.forEach((msg, index) => {
      const msgDate = format(new Date(msg.createdAt), 'yyyy-MM-dd');
      
      if (msgDate !== currentDate) {
        currentDate = msgDate;
        currentGroup = {
          date: msg.createdAt,
          messages: []
        };
        grouped.push(currentGroup);
      }

      // Check if should group with previous message
      const prevMsg = channelMessages[index - 1];
      const shouldGroup = prevMsg && 
        prevMsg.author.id === msg.author.id &&
        new Date(msg.createdAt) - new Date(prevMsg.createdAt) < 5 * 60 * 1000; // 5 minutes

      currentGroup.messages.push({
        ...msg,
        grouped: shouldGroup
      });
    });

    setGroupedMessages(grouped);
  }, [channelMessages]);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [channelMessages]);

  const formatDateDivider = (date) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (format(msgDate, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd')) {
      return 'Today';
    } else if (format(msgDate, 'yyyy-MM-dd') === format(yesterday, 'yyyy-MM-dd')) {
      return 'Yesterday';
    } else {
      return format(msgDate, 'MMMM d, yyyy');
    }
  };

  if (!currentChannel) {
    return null;
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex flex-col">
        {/* Welcome message for empty channel */}
        {channelMessages.length === 0 && (
          <div className="p-4 m-4">
            <h1 className="text-3xl font-bold text-text-primary mb-2">
              Welcome to #{currentChannel.name}!
            </h1>
            <p className="text-text-secondary">
              This is the beginning of the #{currentChannel.name} channel.
            </p>
          </div>
        )}

        {/* Messages grouped by date */}
        {groupedMessages.map((group, groupIndex) => (
          <div key={groupIndex}>
            {/* Date divider */}
            <div className="flex items-center my-4 px-4">
              <div className="flex-1 h-px bg-dark-400"></div>
              <span className="mx-4 text-xs text-text-tertiary font-medium">
                {formatDateDivider(group.date)}
              </span>
              <div className="flex-1 h-px bg-dark-400"></div>
            </div>

            {/* Messages for this date */}
            {group.messages.map((message) => (
              <Message 
                key={message.id} 
                message={message}
                isOwn={message.author.id === user?.id}
                grouped={message.grouped}
              />
            ))}
          </div>
        ))}

        {/* Typing indicators */}
        {typingInChannel.length > 0 && (
          <div className="px-4 py-2 text-sm text-text-secondary italic">
            <div className="flex items-center">
              <div className="flex space-x-1 mr-2">
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 bg-text-tertiary rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>
                {typingInChannel.length === 1
                  ? `Someone is typing...`
                  : `${typingInChannel.length} people are typing...`}
              </span>
            </div>
          </div>
        )}

        {/* Scroll anchor */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}

export default MessageList;
