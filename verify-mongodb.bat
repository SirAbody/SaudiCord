@echo off
echo ========================================
echo   MongoDB Atlas Connection Verifier
echo   SaudiCord Database Check
echo ========================================
echo.

cd server

echo [1/3] Checking MongoDB connection...
node test-mongodb-connection.js

echo.
echo [2/3] Quick database stats...
node -e "const mongoose=require('mongoose');(async()=>{try{await mongoose.connect('mongodb+srv://abood3alshrary_db_user:tRW1DvPPDkdhkjrA@saudicord.mongodb.net/saudicord?retryWrites=true&w=majority');const stats=await mongoose.connection.db.stats();console.log('Database Size:',Math.round(stats.dataSize/1024/1024),'MB');console.log('Collections:',stats.collections);console.log('Objects:',stats.objects);await mongoose.connection.close();}catch(e){console.error('Error:',e.message);}})();"

echo.
echo [3/3] Testing authentication...
curl -X POST http://localhost:5000/api/auth/verify -H "Content-Type: application/json"

echo.
echo ========================================
echo   Press any key to exit...
pause > nul
