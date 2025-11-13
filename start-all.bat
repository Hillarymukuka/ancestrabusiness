@echo off
REM Start backend and frontend each in their own new window
REM Backend window will stay open and show logs
start "Backend" cmd /k "cd /d "%~dp0" && "C:\Python313\python.exe" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000"
REM Frontend window will stay open and show vite logs
start "Frontend" cmd /k "cd /d "%~dp0frontend" && npm run dev"

echo Started backend and frontend in new windows.
pause
