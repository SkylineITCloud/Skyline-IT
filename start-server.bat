@echo off
title Skyline IT Server

echo.
echo   ========================================
echo     SKYLINE IT - Backend Server
echo   ========================================
echo.
echo   Starting server on http://localhost:3000
echo   Press Ctrl+C to stop.
echo.

cd /d "%~dp0server"

:restart
node index.js
echo.
echo   [!] Server stopped. Restarting in 3 seconds...
echo.
timeout /t 3 /nobreak >nul
goto restart
