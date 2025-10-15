// Webpack configuration override - Optimize for CDN Socket.io
module.exports = function override(config, env) {
  // Only modify production builds
  if (env === 'production') {
    console.log('🔧 Configuring webpack for production...');
    
    // Keep optimization enabled but avoid socket.io issues
    // since we're using CDN version now
    config.optimization.minimize = true;
    
    // No need for socket.io-client fallback since we use CDN
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.fallback) config.resolve.fallback = {};
  }
  
  return config;
};
