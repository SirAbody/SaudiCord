// Configuration overrides for Create React App
// This file is used by react-app-rewired to customize webpack without ejecting

module.exports = function override(config, env) {
  // Prevent minification issues with Socket.io
  if (env === 'production') {
    // Ensure socket.io-client is not incorrectly minified
    config.optimization = {
      ...config.optimization,
      minimize: true,
      minimizer: config.optimization.minimizer.map(minimizer => {
        // Check if it's TerserPlugin
        if (minimizer.constructor.name === 'TerserPlugin') {
          minimizer.options.terserOptions = {
            ...minimizer.options.terserOptions,
            mangle: {
              // Don't mangle these specific names
              reserved: ['io', 'Socket', 'Manager', 'Emitter', 'on', 'emit', 'off', 'once'],
            },
            compress: {
              ...minimizer.options.terserOptions.compress,
              // Keep function names for Socket.io
              keep_fnames: /^(io|Socket|Manager|Emitter|on|emit|off|once)/,
            },
            keep_fnames: true,
            keep_classnames: true,
          };
        }
        return minimizer;
      }),
    };

    // Add socket.io-client to externals if needed
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve.alias,
        // Ensure socket.io-client resolves correctly
        'socket.io-client': require.resolve('socket.io-client'),
      },
    };
  }

  return config;
};
