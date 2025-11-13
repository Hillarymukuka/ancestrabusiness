# Smart Business SME - Quick Start Guide

## Starting the Application

Three batch files are provided in the project root to easily start the servers:

### Option 1: Start Everything (Recommended)
Double-click `start-all.bat` or run from PowerShell:
```powershell
.\start-all.bat
```
This opens two separate command windows:
- **Backend window** - FastAPI server on http://localhost:8000
- **Frontend window** - React app on http://localhost:5173

Both windows stay open and show server logs.

### Option 2: Start Backend Only
Double-click `start-backend.bat` or run:
```powershell
.\start-backend.bat
```
Starts the FastAPI backend server on port 8000.

### Option 3: Start Frontend Only
Double-click `start-frontend.bat` or run:
```powershell
.\start-frontend.bat
```
Starts the React/Vite frontend on port 5173.

## Accessing the Application

Once both servers are running:
- **Frontend (Main App)**: http://localhost:5173
- **Backend API Docs**: http://localhost:8000/docs
- **API Health Check**: http://localhost:8000/api/health

## Default Login Credentials

- **Username**: `owner`
- **Password**: `owner123`

## Stopping the Servers

- Press `Ctrl+C` in the command window to stop a server
- Or simply close the command window

## Requirements

- Python 3.13 installed at `C:\Python313\` (if different, edit the .bat files)
- Node.js and npm installed
- All dependencies installed (see main README for installation)

## Troubleshooting

### Backend won't start
- Make sure Python is at `C:\Python313\python.exe`
- If Python is elsewhere, edit `start-backend.bat` and `start-all.bat` to update the path
- Run from the project root directory: `h:\python Projects\Smart Business_SME`

### Frontend won't start
- Make sure you've run `npm install` in the frontend directory
- Check that Node.js and npm are in your PATH

### Port already in use
- Backend: Another process is using port 8000
- Frontend: Another process is using port 5173
- Stop the other process or edit the batch files to use different ports

## Manual Start Commands

If the batch files don't work, you can start manually:

**Backend:**
```powershell
cd "h:\python Projects\Smart Business_SME"
C:\Python313\python.exe -m uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

**Frontend:**
```powershell
cd "h:\python Projects\Smart Business_SME\frontend"
npm run dev
```
