// Webpack configuration override - Optimize for CDN Socket.io
module.exports = function override(config, env) {
  // Only modify production builds
  if (env === 'production') {
    console.log('🔧 Configuring webpack for production...');
    
    // Disable minification to avoid runtime errors
    // We'll rely on server-side compression instead
    config.optimization.minimize = false;
    
    // No need for socket.io-client fallback since we use CDN
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.fallback) config.resolve.fallback = {};
  }
  
  return config;
};
