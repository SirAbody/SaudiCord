const TerserPlugin = require('terser-webpack-plugin');

module.exports = function override(config) {
  // Optimize Terser to keep Socket.io method names
  if (config.optimization && config.optimization.minimizer) {
    config.optimization.minimizer = config.optimization.minimizer.map((minimizer) => {
      if (minimizer.constructor.name === 'TerserPlugin') {
        return new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: process.env.NODE_ENV === 'production',
            },
            mangle: {
              reserved: ['io', 'Socket', 'Manager', 'Emitter', 'on', 'emit', 'off', 'once'],
            },
            keep_fnames: /^(io|Socket|Manager|Emitter)$/,
            keep_classnames: /^(io|Socket|Manager|Emitter)$/,
          },
        });
      }
      return minimizer;
    });
  }

  return config;
};
