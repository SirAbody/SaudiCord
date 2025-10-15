// Webpack configuration override - Fix Socket.io minification issues
module.exports = function override(config, env) {
  // Only modify production builds
  if (env === 'production') {
    console.log('🔧 Configuring webpack for production...');
    
    // Completely disable minification to avoid ALL issues
    config.optimization.minimize = false;
    
    // Add fallback for socket.io-client
    if (!config.resolve) config.resolve = {};
    if (!config.resolve.fallback) config.resolve.fallback = {};
    
    // Ensure socket.io-client can be found
    config.resolve.fallback = {
      ...config.resolve.fallback,
      "socket.io-client": require.resolve("socket.io-client")
    };
    
    // Alias to ensure proper import
    if (!config.resolve.alias) config.resolve.alias = {};
    config.resolve.alias['socket.io-client'] = require.resolve('socket.io-client');
  }
  
  return config;
};
