@echo off
echo ===========================================
echo SaudiCord Development Setup
echo Made With Love By SirAbody
echo ===========================================
echo.

echo [1] Installing client dependencies...
cd client
call npm install http-proxy-middleware
echo.

echo [2] Killing any existing Node processes...
taskkill /F /IM node.exe 2>nul
echo.

echo [3] Starting Backend Server on port 5000...
cd ../server
start /B cmd /c "npm start 2>&1 | more"
timeout /t 5 /nobreak

echo [4] Starting Frontend Client on port 3000...
cd ../client
set DANGEROUSLY_DISABLE_HOST_CHECK=true
start /B cmd /c "npm start 2>&1 | more"

echo.
echo ===========================================
echo Servers are starting...
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo.
echo Please wait about 30 seconds for servers to fully start
echo ===========================================
timeout /t 10 /nobreak

echo Opening browser...
start http://localhost:3000

echo.
echo Press Ctrl+C to stop all servers
pause > nul
