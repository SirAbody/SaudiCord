// Webpack configuration override to prevent Socket.io minification issues
module.exports = function override(config, env) {
  // Only modify production builds
  if (env === 'production') {
    // Find and modify TerserPlugin
    if (config.optimization && config.optimization.minimizer) {
      config.optimization.minimizer = config.optimization.minimizer.map(minimizer => {
        if (minimizer.constructor.name === 'TerserPlugin') {
          // Safe property access
          if (!minimizer.options) minimizer.options = {};
          if (!minimizer.options.terserOptions) minimizer.options.terserOptions = {};
          
          // Preserve Socket.io function names
          minimizer.options.terserOptions.keep_fnames = /^(io|Socket|Manager|Emitter|on|emit|off|once|connect|disconnect|isConnected)$/;
          minimizer.options.terserOptions.keep_classnames = true;
          
          // Update mangle settings
          if (!minimizer.options.terserOptions.mangle) {
            minimizer.options.terserOptions.mangle = {};
          }
          minimizer.options.terserOptions.mangle.reserved = [
            'io', 'Socket', 'Manager', 'Emitter', 
            'on', 'emit', 'off', 'once', 
            'connect', 'disconnect', 'isConnected'
          ];
          
          // Update compress settings safely
          if (!minimizer.options.terserOptions.compress) {
            minimizer.options.terserOptions.compress = {};
          }
          minimizer.options.terserOptions.compress = {
            ...(minimizer.options.terserOptions.compress || {}),
            keep_fnames: /^(io|Socket|Manager|Emitter|on|emit|off|once)/,
          };
        }
        return minimizer;
      });
    }
  }
  
  return config;
};
