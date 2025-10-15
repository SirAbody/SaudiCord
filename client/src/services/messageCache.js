// Message Cache Service for faster loading
class MessageCache {
  constructor() {
    this.cache = new Map();
    this.maxCacheSize = 100; // Maximum conversations to cache
    this.maxMessagesPerConversation = 100; // Max messages per conversation
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }

  // Generate cache key
  getCacheKey(conversationId, userId) {
    return `${conversationId}-${userId}`;
  }

  // Store messages in cache
  setMessages(conversationId, userId, messages) {
    const key = this.getCacheKey(conversationId, userId);
    
    // Limit messages to cache
    const messagesToCache = messages.slice(-this.maxMessagesPerConversation);
    
    this.cache.set(key, {
      messages: messagesToCache,
      timestamp: Date.now(),
      conversationId,
      userId
    });

    // Clean old cache if too large
    if (this.cache.size > this.maxCacheSize) {
      this.cleanOldestEntry();
    }
  }

  // Get messages from cache
  getMessages(conversationId, userId) {
    const key = this.getCacheKey(conversationId, userId);
    const cached = this.cache.get(key);
    
    if (!cached) return null;
    
    // Check if cache expired
    if (Date.now() - cached.timestamp > this.cacheExpiry) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.messages;
  }

  // Add new message to existing cache
  addMessage(conversationId, userId, message) {
    const key = this.getCacheKey(conversationId, userId);
    const cached = this.cache.get(key);
    
    if (!cached) return;
    
    // Add message and maintain max size
    cached.messages.push(message);
    if (cached.messages.length > this.maxMessagesPerConversation) {
      cached.messages.shift(); // Remove oldest
    }
    
    cached.timestamp = Date.now(); // Update timestamp
  }

  // Update message in cache
  updateMessage(conversationId, userId, messageId, updates) {
    const key = this.getCacheKey(conversationId, userId);
    const cached = this.cache.get(key);
    
    if (!cached) return;
    
    const messageIndex = cached.messages.findIndex(m => 
      (m.id === messageId) || (m._id === messageId) || (m.tempId === messageId)
    );
    
    if (messageIndex !== -1) {
      cached.messages[messageIndex] = {
        ...cached.messages[messageIndex],
        ...updates
      };
      cached.timestamp = Date.now();
    }
  }

  // Remove message from cache
  removeMessage(conversationId, userId, messageId) {
    const key = this.getCacheKey(conversationId, userId);
    const cached = this.cache.get(key);
    
    if (!cached) return;
    
    cached.messages = cached.messages.filter(m => 
      m.id !== messageId && m._id !== messageId && m.tempId !== messageId
    );
    cached.timestamp = Date.now();
  }

  // Invalidate cache for a conversation
  invalidate(conversationId, userId) {
    const key = this.getCacheKey(conversationId, userId);
    this.cache.delete(key);
  }

  // Clear all cache
  clearAll() {
    this.cache.clear();
  }

  // Clean oldest cache entry
  cleanOldestEntry() {
    let oldest = null;
    let oldestTime = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < oldestTime) {
        oldest = key;
        oldestTime = value.timestamp;
      }
    }
    
    if (oldest) {
      this.cache.delete(oldest);
    }
  }

  // Get cache statistics
  getStats() {
    const stats = {
      totalConversations: this.cache.size,
      totalMessages: 0,
      oldestCache: null,
      newestCache: null
    };

    let oldestTime = Date.now();
    let newestTime = 0;

    for (const value of this.cache.values()) {
      stats.totalMessages += value.messages.length;
      
      if (value.timestamp < oldestTime) {
        oldestTime = value.timestamp;
        stats.oldestCache = new Date(value.timestamp);
      }
      
      if (value.timestamp > newestTime) {
        newestTime = value.timestamp;
        stats.newestCache = new Date(value.timestamp);
      }
    }

    return stats;
  }

  // Preload messages for multiple conversations
  async preloadConversations(conversationIds, userId, fetchFunction) {
    const promises = conversationIds.map(async (convId) => {
      const cached = this.getMessages(convId, userId);
      if (!cached) {
        try {
          const messages = await fetchFunction(convId);
          this.setMessages(convId, userId, messages);
        } catch (error) {
          console.error(`Failed to preload conversation ${convId}:`, error);
        }
      }
    });

    await Promise.all(promises);
  }
}

// Create singleton instance
const messageCache = new MessageCache();

// Export for use in React components
export default messageCache;
