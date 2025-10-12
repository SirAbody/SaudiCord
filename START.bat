@echo off
cls
echo ============================================================
echo                    SaudiCord Application
echo                  Made With Love By SirAbody
echo ============================================================
echo.
echo [INFO] Stopping any existing Node processes...
taskkill /F /IM node.exe 2>nul >nul
timeout /t 2 /nobreak >nul

echo [1/3] Starting Backend Server (Port 5000)...
cd server
start "SaudiCord Server" /min cmd /c "node debug-server.js"
timeout /t 5 /nobreak >nul

echo [2/3] Starting Frontend Client (Port 3000)...
cd ../client
start "SaudiCord Client" /min cmd /c "npm start"
timeout /t 3 /nobreak >nul

echo [3/3] Opening browser...
echo.
echo ============================================================
echo             SaudiCord is now running!
echo ============================================================
echo.
echo   Backend API:  http://localhost:5000/api
echo   Frontend:     http://localhost:3000
echo.
echo   Default Users:
echo   - Admin:      admin / admin509
echo   - User:       Liongtas / Lion509
echo.
echo ============================================================
echo.
timeout /t 5 /nobreak >nul
start http://localhost:3000

echo Press any key to stop all servers and exit...
pause >nul

echo.
echo Stopping servers...
taskkill /F /IM node.exe 2>nul >nul
echo Done. Goodbye!
timeout /t 2 /nobreak >nul
