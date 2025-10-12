// Configuration overrides for Create React App
// This file is used by react-app-rewired to customize webpack without ejecting

module.exports = function override(config, env) {
  // Prevent minification issues with Socket.io
  if (env === 'production') {
    // Ensure socket.io-client is not incorrectly minified
    if (config.optimization && config.optimization.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.map(minimizer => {
        // Check if it's TerserPlugin and has options
        if (minimizer.constructor.name === 'TerserPlugin' || 
            (minimizer.options && minimizer.options.minimizer)) {
          
          // Safely update terser options
          if (!minimizer.options) {
            minimizer.options = {};
          }
          if (!minimizer.options.terserOptions) {
            minimizer.options.terserOptions = {};
          }
          
          // Set mangle options
          minimizer.options.terserOptions.mangle = {
            ...(minimizer.options.terserOptions.mangle || {}),
            // Don't mangle these specific names
            reserved: ['io', 'Socket', 'Manager', 'Emitter', 'on', 'emit', 'off', 'once'],
          };
          
          // Set compress options
          minimizer.options.terserOptions.compress = {
            ...(minimizer.options.terserOptions.compress || {}),
            // Keep function names for Socket.io
            keep_fnames: /^(io|Socket|Manager|Emitter|on|emit|off|once)/,
          };
          
          // Keep function and class names
          minimizer.options.terserOptions.keep_fnames = true;
          minimizer.options.terserOptions.keep_classnames = true;
        }
        return minimizer;
      });
    }

    // Add socket.io-client to resolve aliases
    if (!config.resolve) {
      config.resolve = {};
    }
    if (!config.resolve.alias) {
      config.resolve.alias = {};
    }
    
    try {
      // Ensure socket.io-client resolves correctly
      config.resolve.alias['socket.io-client'] = require.resolve('socket.io-client');
    } catch (e) {
      // If socket.io-client cannot be resolved, skip alias
      console.warn('Could not resolve socket.io-client:', e.message);
    }
  }

  return config;
};
