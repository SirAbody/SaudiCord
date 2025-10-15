// Webpack configuration override - DISABLE MINIFICATION FOR SOCKET.IO
module.exports = function override(config, env) {
  // Only modify production builds
  if (env === 'production') {
    console.log('🔧 Configuring webpack for production...');
    
    // Option 1: Completely disable minification (temporary fix)
    config.optimization.minimize = false;
    
    // Option 2: If we want to keep some optimization, use this instead:
    /*
    if (config.optimization && config.optimization.minimizer) {
      const TerserPlugin = require('terser-webpack-plugin');
      
      config.optimization.minimizer = [
        new TerserPlugin({
          terserOptions: {
            parse: {
              ecma: 8,
            },
            compress: {
              ecma: 5,
              warnings: false,
              comparisons: false,
              inline: 2,
              drop_console: false, // Keep console logs
              keep_fnames: true,  // Keep all function names
            },
            mangle: false, // DISABLE MANGLING COMPLETELY
            output: {
              ecma: 5,
              comments: false,
              ascii_only: true,
            },
            keep_classnames: true,
            keep_fnames: true,
          },
        }),
      ];
    }
    */
  }
  
  return config;
};
