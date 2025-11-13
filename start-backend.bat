@echo off
REM Start backend (runs in current window)
cd /d "%~dp0"
"C:\Python313\python.exe" -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
pause
