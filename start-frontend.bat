@echo off
REM Start frontend (runs in current window)
cd /d "%~dp0frontend"
npm run dev
pause
