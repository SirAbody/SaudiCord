const TerserPlugin = require('terser-webpack-plugin');

module.exports = function override(config) {
  // Performance optimizations
  config.optimization = {
    ...config.optimization,
    // Better chunk splitting for performance
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 10,
          enforce: true,
        },
        common: {
          minChunks: 2,
          priority: 5,
          reuseExistingChunk: true,
        },
      },
    },
  };
  
  // Optimize Terser to keep Socket.io method names and improve performance
  if (config.optimization && config.optimization.minimizer) {
    config.optimization.minimizer = config.optimization.minimizer.map((minimizer) => {
      if (minimizer.constructor.name === 'TerserPlugin') {
        return new TerserPlugin({
          terserOptions: {
            compress: {
              drop_console: process.env.NODE_ENV === 'production',
              drop_debugger: process.env.NODE_ENV === 'production',
              pure_funcs: ['console.log', 'console.info', 'console.debug'],
            },
            mangle: {
              reserved: ['io', 'Socket', 'Manager', 'Emitter', 'on', 'emit', 'off', 'once'],
            },
            keep_fnames: /^(io|Socket|Manager|Emitter)$/,
            keep_classnames: /^(io|Socket|Manager|Emitter)$/,
          },
          parallel: true, // Use multiple processes
        });
      }
      return minimizer;
    });
  }

  // Reduce bundle size and improve loading
  if (process.env.NODE_ENV === 'production') {
    config.optimization.usedExports = true;
    config.optimization.sideEffects = false;
  }

  return config;
};
