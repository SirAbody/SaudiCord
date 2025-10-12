// Advanced Logging System for SaudiCord
const winston = require('winston');
const path = require('path');
const fs = require('fs');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Define log levels
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

// Define log colors
const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

winston.addColors(colors);

// Define format
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.errors({ stack: true }),
  winston.format.printf(
    (info) => {
      const { timestamp, level, message, ...args } = info;
      const ts = timestamp.slice(0, 19).replace('T', ' ');
      
      // Include additional context
      let logMessage = `${ts} [${level}]: ${message}`;
      
      if (Object.keys(args).length) {
        logMessage += `\n${JSON.stringify(args, null, 2)}`;
      }
      
      return logMessage;
    }
  )
);

// Define transports
const transports = [
  // Console transport
  new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      format
    )
  }),
  
  // Error log file
  new winston.transports.File({
    filename: path.join(logsDir, 'error.log'),
    level: 'error',
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Combined log file
  new winston.transports.File({
    filename: path.join(logsDir, 'combined.log'),
    maxsize: 5242880, // 5MB
    maxFiles: 5,
  }),
  
  // Debug log file (only in development)
  ...(process.env.NODE_ENV === 'development' ? [
    new winston.transports.File({
      filename: path.join(logsDir, 'debug.log'),
      level: 'debug',
      maxsize: 5242880, // 5MB
      maxFiles: 3,
    })
  ] : [])
];

// Create logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'development' ? 'debug' : 'info'),
  levels,
  format,
  transports,
  exitOnError: false, // Don't exit on handled exceptions
});

// Handle uncaught exceptions and unhandled rejections
logger.exceptions.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'exceptions.log'),
    maxsize: 5242880,
    maxFiles: 3,
  })
);

logger.rejections.handle(
  new winston.transports.File({ 
    filename: path.join(logsDir, 'rejections.log'),
    maxsize: 5242880,
    maxFiles: 3,
  })
);

// Custom logging methods for specific contexts
logger.logRequest = (req, res, responseTime) => {
  const message = `${req.method} ${req.originalUrl}`;
  const meta = {
    method: req.method,
    url: req.originalUrl,
    status: res.statusCode,
    responseTime: `${responseTime}ms`,
    ip: req.ip || req.connection.remoteAddress,
    userAgent: req.get('user-agent') || 'unknown'
  };
  
  if (res.statusCode >= 400) {
    logger.error(message, meta);
  } else {
    logger.http(message, meta);
  }
};

logger.logSocketEvent = (event, socketId, data = {}) => {
  logger.debug(`Socket Event: ${event}`, {
    socketId,
    event,
    data: JSON.stringify(data).substring(0, 500) // Limit data size
  });
};

logger.logDatabaseQuery = (query, duration) => {
  if (process.env.NODE_ENV === 'development') {
    logger.debug('Database Query', {
      query: query.substring(0, 500),
      duration: `${duration}ms`
    });
  }
};

logger.logError = (error, context = {}) => {
  logger.error(error.message || 'Unknown error', {
    stack: error.stack,
    code: error.code,
    ...context
  });
};

module.exports = logger;
