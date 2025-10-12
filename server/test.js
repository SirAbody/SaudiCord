console.log('Testing models loading...');

try {
  const models = require('./models');
  console.log('✅ Models loaded successfully');
  console.log('Available models:', Object.keys(models));
} catch (error) {
  console.error('❌ Failed to load models:');
  console.error(error.message);
  console.error(error.stack);
}

console.log('\nTesting routes...');
try {
  const authRoutes = require('./routes/auth');
  console.log('✅ Auth routes loaded');
} catch (error) {
  console.error('❌ Failed to load auth routes:');
  console.error(error.message);
}
