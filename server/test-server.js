// Test server to debug the issue
console.log('Starting test server...');

try {
  require('dotenv').config();
  console.log('Environment loaded');
  
  const express = require('express');
  console.log('Express loaded');
  
  const app = express();
  const PORT = process.env.PORT || 5000;
  
  app.get('/', (req, res) => {
    res.json({ message: 'SaudiCord Test Server Running' });
  });
  
  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Test server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} to test`);
  });
  
  // Keep alive
  setInterval(() => {
    console.log('Server still running...');
  }, 10000);
  
} catch (error) {
  console.error('Error starting server:', error);
  console.error(error.stack);
}
