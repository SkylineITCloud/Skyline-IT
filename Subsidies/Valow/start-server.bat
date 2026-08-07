@echo off
title VALOW. Vote Server — Monitor
color 0D
echo.
echo   ╔══════════════════════════════════════════╗
echo   ║        VALOW. VOTE SERVER               ║
echo   ║     Monitoring Console                  ║
echo   ╚══════════════════════════════════════════╝
echo.
cd /d "%~dp0server"
echo   [✓] Starting server on port 3456 ...
echo   [i] Admin dashboard: http://localhost:3456/
echo   [i] Main site:       http://localhost:3456/site/index.html
echo   [i] Close this window to stop the server.
echo.
npm start
pause
