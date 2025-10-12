// Simple logger without dependencies
const logger = {
  info: (...args) => console.log('[INFO]', new Date().toISOString(), ...args),
  error: (...args) => console.error('[ERROR]', new Date().toISOString(), ...args),
  warn: (...args) => console.warn('[WARN]', new Date().toISOString(), ...args),
  debug: (...args) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DEBUG]', new Date().toISOString(), ...args);
    }
  },
  http: (...args) => console.log('[HTTP]', new Date().toISOString(), ...args),
  
  // Custom logging methods
  logRequest: (req, res, responseTime) => {
    const message = `${req.method} ${req.originalUrl} - ${res.statusCode} - ${responseTime}ms`;
    if (res.statusCode >= 400) {
      console.error('[HTTP ERROR]', new Date().toISOString(), message);
    } else {
      console.log('[HTTP]', new Date().toISOString(), message);
    }
  },
  
  logSocketEvent: (event, socketId, data = {}) => {
    console.log('[SOCKET]', new Date().toISOString(), event, socketId, JSON.stringify(data).substring(0, 100));
  },
  
  logDatabaseQuery: (query, duration) => {
    if (process.env.NODE_ENV === 'development') {
      console.log('[DB]', new Date().toISOString(), query.substring(0, 100), `${duration}ms`);
    }
  },
  
  logError: (error, context = {}) => {
    console.error('[ERROR]', new Date().toISOString(), error.message || 'Unknown error', context);
    if (error.stack) {
      console.error(error.stack);
    }
  }
};

module.exports = logger;
