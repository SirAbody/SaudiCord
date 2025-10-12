// Startup script to ensure required directories exist
const fs = require('fs');
const path = require('path');

const createDirectories = () => {
  const directories = [
    'uploads',
    'uploads/avatars',
    'uploads/attachments',
    'uploads/servers'
  ];

  directories.forEach(dir => {
    const fullPath = path.join(__dirname, dir);
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      console.log(`📁 Created directory: ${dir}`);
    }
  });
};

// Run on module load
createDirectories();

module.exports = createDirectories;
