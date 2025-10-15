@echo off
echo ========================================
echo   SaudiCord MongoDB Setup Script
echo   Made With Love By SirAbody
echo ========================================
echo.

echo [1/4] Installing MongoDB dependencies...
cd server
call npm install mongoose mongodb dotenv jsonwebtoken bcrypt
echo.

echo [2/4] Creating environment file...
(
echo # MongoDB Atlas Connection
echo MONGODB_URI=mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.mongodb.net/saudicord?retryWrites=true^&w=majority
echo.
echo # JWT Secret
echo JWT_SECRET=saudicord-secret-key-2024
echo.
echo # Port
echo PORT=5000
echo.
echo # Environment
echo NODE_ENV=development
) > .env
echo Environment file created!
echo.

echo [3/4] Testing MongoDB connection...
node -e "const {connectDB,testConnection}=require('./config/mongodb');(async()=>{await connectDB();const ok=await testConnection();console.log(ok?'✅ MongoDB Connected!':'❌ Connection Failed');process.exit(0)})();"
echo.

echo [4/4] Starting SaudiCord server with MongoDB...
echo.
echo ========================================
echo   Server starting on port 5000...
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:5000
echo ========================================
echo.

node server-mongodb.js
