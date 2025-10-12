const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function(app) {
  // Proxy API requests to the backend server
  app.use(
    '/api',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      changeOrigin: true,
      ws: true, // Enable WebSocket proxying for Socket.io
      logLevel: 'debug',
    })
  );
  
  // Proxy Socket.io requests
  app.use(
    '/socket.io',
    createProxyMiddleware({
      target: process.env.REACT_APP_API_URL || 'http://localhost:5000',
      changeOrigin: true,
      ws: true,
      logLevel: 'debug',
    })
  );
};
