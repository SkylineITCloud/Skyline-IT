@echo off
start "VALOW Server Monitor" /MIN /B /WAIT cmd /k "cd /d "%~dp0" && start-server.bat"
