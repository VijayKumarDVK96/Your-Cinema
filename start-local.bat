@echo off
echo ===================================================
echo   Starting Your Cinema Development Servers
echo ===================================================

echo Starting Backend Server...
start "Backend - Your Cinema" cmd /k "cd /d %~dp0backend && npm run dev"

echo Starting Frontend Server...
start "Frontend - Your Cinema" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Both servers have been launched in separate terminal windows.
