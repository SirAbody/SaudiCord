// Client-side Error Handler and Logger
class ErrorLogger {
  constructor() {
    this.errors = [];
    this.maxErrors = 50;
  }

  log(error, context = {}) {
    const errorInfo = {
      timestamp: new Date().toISOString(),
      message: error.message || 'Unknown error',
      stack: error.stack,
      context,
      url: window.location.href,
      userAgent: navigator.userAgent
    };

    // Add to local storage for debugging
    this.errors.push(errorInfo);
    if (this.errors.length > this.maxErrors) {
      this.errors.shift();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('Error logged:', errorInfo);
    }

    // Send to server in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToServer(errorInfo);
    }

    return errorInfo;
  }

  sendToServer(errorInfo) {
    // Send error to backend for logging
    fetch('/api/errors/log', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(errorInfo)
    }).catch(err => {
      console.error('Failed to send error to server:', err);
    });
  }

  getErrors() {
    return this.errors;
  }

  clearErrors() {
    this.errors = [];
  }
}

// Global error handler
window.addEventListener('error', (event) => {
  errorLogger.log(new Error(event.message), {
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    type: 'window.error'
  });
});

// Unhandled promise rejection handler
window.addEventListener('unhandledrejection', (event) => {
  errorLogger.log(new Error(event.reason), {
    type: 'unhandledRejection',
    promise: event.promise
  });
});

const errorLogger = new ErrorLogger();

export default errorLogger;

// Socket error handler
export const handleSocketError = (error) => {
  errorLogger.log(error, { type: 'socket' });
  
  // User-friendly error messages
  const errorMessages = {
    'Authentication error': 'Please login again',
    'Connection failed': 'Unable to connect to server',
    'Message failed': 'Failed to send message, please try again',
    'Call failed': 'Unable to start call, please check your connection'
  };

  return errorMessages[error.message] || 'An unexpected error occurred';
};

// API error handler
export const handleAPIError = (error, context) => {
  errorLogger.log(error, { type: 'api', ...context });
  
  if (error.response) {
    // Server responded with error
    const status = error.response.status;
    const message = error.response.data?.error || error.response.data?.message;
    
    switch (status) {
      case 401:
        // Unauthorized - redirect to login
        localStorage.removeItem('token');
        window.location.href = '/login';
        return 'Session expired, please login again';
      case 403:
        return 'Access denied';
      case 404:
        return 'Resource not found';
      case 429:
        return 'Too many requests, please try again later';
      case 500:
        return 'Server error, please try again later';
      default:
        return message || 'An error occurred';
    }
  } else if (error.request) {
    // Request made but no response
    return 'Network error, please check your connection';
  } else {
    // Something else happened
    return error.message || 'An unexpected error occurred';
  }
};
