@echo off
echo ===========================================
echo Starting SaudiCord Locally
echo Made With Love By SirAbody
echo ===========================================
echo.

echo [1] Starting Backend Server on port 5000...
cd server
start cmd /k "npm start"
timeout /t 5

echo [2] Starting Frontend Client on port 3000...
cd ../client
start cmd /k "npm start"

echo.
echo ===========================================
echo Servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ===========================================
echo Press any key to exit...
pause > nul
