# Complete Deployment Guide: Render (Backend) + Cloudflare Pages (Frontend)

This guide covers deploying a FastAPI backend to Render with Docker and a React/Vite frontend to Cloudflare Pages, based on lessons learned from deploying Ancestra Business Manager.

## Pre-Deployment Checklist

### 1. Project Structure Requirements
```
project/
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── models/
│   ├── routes/
│   └── ...
├── frontend/
│   ├── src/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
├── Dockerfile (at root)
├── .dockerignore
├── render.yaml
└── .gitignore
```

### 2. Backend Requirements (requirements.txt)

**Critical Version Constraints:**
```txt
# Use Python 3.11 (NOT 3.13 - compatibility issues)
# In Dockerfile: FROM python:3.11-slim

fastapi==0.110.0
uvicorn[standard]==0.29.0
SQLAlchemy==2.0.29

# Authentication - MUST pin these versions
passlib[bcrypt]==1.7.4
bcrypt==4.0.1  # Critical: fixes __about__ attribute error
python-jose==3.3.0

# Image handling - version compatibility
Pillow==10.3.0  # NOT 10.2.0 - Python 3.11 compatible

# PDF generation - simple deployment
fpdf2==2.7.9  # Use fpdf2, NOT reportlab (reportlab has complex C dependencies)

# Other dependencies
python-multipart==0.0.9
python-dotenv==1.0.1
alembic==1.13.1
qrcode==7.4.2
pydantic==1.10.13
```

### 3. Dockerfile Configuration

**Critical: System Dependencies for Image Libraries**
```dockerfile
# Use Python 3.11 (more stable than 3.13)
FROM python:3.11-slim

WORKDIR /app

# Install ALL required system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    make \
    libpq-dev \
    python3-dev \
    libjpeg-dev \
    zlib1g-dev \
    libfreetype6-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY backend/requirements.txt .

# Upgrade pip first (important!)
RUN pip install --upgrade pip setuptools wheel

# Install dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code (DO NOT copy database files)
COPY backend/ ./backend/

# Create uploads directory
RUN mkdir -p uploads/logos uploads/expense_receipts

# Expose port
EXPOSE 8000

# Environment variables
ENV PYTHONUNBUFFERED=1
ENV MEDIA_ROOT=/app/uploads

# Run application
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 4. .dockerignore (Critical!)
```
# Frontend (not needed in backend Docker image)
frontend/
node_modules/

# Development files
.env
.env.local
*.db
*.sqlite
*.sqlite3

# Documentation
*.md
docs/

# IDE
.vscode/
.idea/
*.swp
*.swo

# Python cache
__pycache__/
*.pyc
*.pyo
*.pyd
.Python
*.so
*.egg
*.egg-info/

# Git
.git/
.gitignore

# OS
.DS_Store
Thumbs.db
```

### 5. Backend CORS Configuration (main.py)

**Critical: Must include frontend URLs**
```python
from fastapi.middleware.cors import CORSMiddleware

allowed_origins = [
    "http://localhost:5173",           # Local dev
    "http://127.0.0.1:5173",           # Local dev
    "https://yourapp.pages.dev",       # Production frontend
    "https://*.pages.dev",             # Preview deployments (optional)
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],  # For PDF downloads
)
```

### 6. Frontend API Configuration (src/utils/api.js)

**Critical: Handle trailing slashes properly**
```javascript
import axios from 'axios'

const baseURL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
const apiURL = baseURL.endsWith('/') ? baseURL + 'api' : baseURL + '/api'

const api = axios.create({
  baseURL: apiURL
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('your_token_key')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

export default api
```

### 7. Frontend Environment Variables

**frontend/.env.production:**
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

**frontend/.env (local development):**
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
# OR for local backend:
# VITE_API_BASE_URL=http://localhost:8000
```

### 8. Cloudflare Pages Redirect Configuration

**frontend/public/_redirects:**
```
/*    /index.html   200
```

This ensures client-side routing works correctly.

### 9. .gitignore (Comprehensive)

```gitignore
# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
*.egg
*.egg-info/
dist/
build/
*.db
*.sqlite
*.sqlite3

# Node
node_modules/
frontend/dist/
frontend/build/
npm-debug.log*

# Environment
.env
.env.local
.env.*.local
frontend/.env

# IDE
.vscode/
.idea/
*.swp
*.swo

# OS
.DS_Store
Thumbs.db

# Uploads (local only, preserve structure)
uploads/*
!uploads/.gitkeep
!uploads/*/
uploads/*/.gitkeep

# Do NOT ignore these
!frontend/.env.production
!frontend/.env.example
```

---

## Deployment Steps

### Phase 1: Push to GitHub

```bash
# Initialize git (if not already)
git init

# Configure git
git config user.name "YourUsername"
git config user.email "your@email.com"

# Add all files
git add .

# Commit
git commit -m "Initial deployment setup"

# Add remote (create repo on GitHub first)
git remote add origin https://github.com/username/repo.git

# Push
git branch -M main
git push -u origin main
```

### Phase 2: Deploy Backend to Render

1. **Go to https://render.com**
2. Click "New +" → "Web Service"
3. Connect GitHub repository
4. **Configuration:**
   - **Name:** `your-backend`
   - **Runtime:** Docker
   - **Branch:** main
   - **Plan:** Free (or paid for production)
5. **Environment Variables (Optional):**
   - `PYTHONUNBUFFERED=1`
   - `DATABASE_URL` (if using PostgreSQL)
6. Click "Create Web Service"
7. **Wait 5-10 minutes** for deployment
8. **Test:** Visit `https://your-backend.onrender.com/docs`
9. **Copy backend URL** for frontend configuration

### Phase 3: Deploy Frontend to Cloudflare Pages

1. **Go to https://dash.cloudflare.com**
2. Navigate to "Workers & Pages" → "Create application" → "Pages"
3. Connect to Git → Select your repository
4. **Build Configuration:**
   - **Framework preset:** Vite
   - **Build command:** `cd frontend && npm install && npm run build`
   - **Build output directory:** `frontend/dist`
   - **Root directory:** (leave empty)
5. **Environment Variables:**
   - **Name:** `VITE_API_BASE_URL`
   - **Value:** `https://your-backend.onrender.com` (your Render URL)
6. Click "Save and Deploy"
7. **Wait 3-5 minutes** for deployment
8. **Copy frontend URL:** `https://yourapp.pages.dev`

### Phase 4: Update CORS (Critical!)

After frontend deploys, update backend CORS:

**backend/main.py:**
```python
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://yourapp.pages.dev",  # Add your actual Cloudflare URL
]
```

Commit and push:
```bash
git add backend/main.py
git commit -m "Add Cloudflare Pages to CORS"
git push
```

Render will auto-redeploy (2-3 minutes).

---

## Common Errors & Solutions

### Error 1: "ancestra.db not found" during Docker build
**Cause:** Database file in .gitignore, Docker trying to copy it

**Solution:** Remove database copy from Dockerfile:
```dockerfile
# DON'T DO THIS:
# COPY ancestra.db ./ancestra.db

# Database will be created automatically on startup
```

### Error 2: "Failed to build Pillow" / "KeyError: '__version__'"
**Cause:** Python 3.13 compatibility issues

**Solution:**
- Use Python 3.11: `FROM python:3.11-slim`
- Pin Pillow version: `Pillow==10.3.0`
- Add system dependencies in Dockerfile (see #3 above)

### Error 3: "bcrypt __about__ attribute error"
**Cause:** Incompatible bcrypt version

**Solution:** Add to requirements.txt:
```txt
bcrypt==4.0.1
```

### Error 4: "ReportLab installation errors"
**Cause:** Complex C dependencies, freetype, libjpeg issues

**Solution:** Switch to fpdf2:
```txt
# Remove: reportlab==4.0.7
# Add: fpdf2==2.7.9
```

Update PDF generation code to use FPDF instead of ReportLab.

### Error 5: "ERR_CONNECTION_REFUSED localhost:8000"
**Cause:** Frontend trying to connect to local backend

**Solution:** Create `frontend/.env`:
```env
VITE_API_BASE_URL=https://your-backend.onrender.com
```

### Error 6: "404 Not Found //api/auth/login" (double slash)
**Cause:** baseURL already has trailing slash

**Solution:** Handle in api.js (see #6 above)

### Error 7: "CORS policy: No 'Access-Control-Allow-Origin'"
**Cause:** Backend doesn't allow frontend origin

**Solution:**
1. Add frontend URL to allowed_origins (see #5)
2. Push to trigger backend redeploy
3. Wait 2-3 minutes for Render to redeploy

### Error 8: "502 Bad Gateway"
**Cause:** Backend still deploying or crashed

**Solution:**
- Check Render logs
- Verify all environment variables
- Ensure database is accessible
- Check bcrypt/Pillow versions

---

## Testing Checklist

### Backend Tests:
```bash
# Test root endpoint
curl https://your-backend.onrender.com/

# Test API docs
curl https://your-backend.onrender.com/docs

# Test login
curl -X POST "https://your-backend.onrender.com/api/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=owner&password=owner123"
```

### Frontend Tests:
1. Open `https://yourapp.pages.dev`
2. Check browser console for errors
3. Test login functionality
4. Test API calls (Network tab)
5. Verify CORS is working

---

## Production Considerations

### Database: SQLite vs PostgreSQL

**SQLite (Free tier):**
- ⚠️ **Warning:** Render free tier resets files on redeploy
- Data will be lost on every deployment
- Only use for testing

**PostgreSQL (Recommended for production):**
1. Create PostgreSQL database on Render
2. Add `DATABASE_URL` environment variable
3. Update `backend/database.py`:
```python
import os
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ancestra.db")
```
4. Add `psycopg2-binary` to requirements.txt

### Custom Domain (Optional)

**Cloudflare Pages:**
1. Go to Pages → Settings → Custom domains
2. Add your domain
3. Update CORS in backend with new domain

### Environment Variables Security

Never commit:
- `.env` files with secrets
- Database credentials
- API keys

Always use:
- Render environment variables
- Cloudflare Pages environment variables

---

## Quick Reference: Deployment Prompt

**Use this prompt for future deployments:**

> "I need to deploy my FastAPI backend to Render using Docker and my React/Vite frontend to Cloudflare Pages. The backend uses:
> - FastAPI with uvicorn
> - SQLAlchemy for database
> - bcrypt for authentication (must use bcrypt==4.0.1)
> - Pillow for images (must use Pillow==10.3.0)
> - fpdf2 for PDF generation (NOT reportlab)
> - Python 3.11 (NOT 3.13)
>
> The frontend uses Vite and needs to connect to the backend API. Please help me:
> 1. Create proper Dockerfile with all system dependencies (gcc, g++, libjpeg-dev, zlib1g-dev, libfreetype6-dev)
> 2. Set up .dockerignore to exclude frontend and database files
> 3. Configure CORS in backend to allow Cloudflare Pages
> 4. Set up frontend API client to handle trailing slashes
> 5. Create .env.production for frontend
> 6. Add _redirects for SPA routing
> 7. Configure both deployments step-by-step
>
> Key requirements:
> - Backend: Render with Docker, port 8000
> - Frontend: Cloudflare Pages with Vite build
> - Handle CORS properly
> - Avoid double slash in API URLs
> - Use environment variables for API URL"

---

## Monitoring & Maintenance

### Check Logs:
- **Render:** Dashboard → Logs tab
- **Cloudflare:** Pages → Deployment → View build logs

### Redeploy:
- **Automatic:** Push to main branch
- **Manual:** Render/Cloudflare dashboard → Deploy

### Performance:
- **Render free tier:** Spins down after inactivity (cold starts ~30s)
- **Upgrade to paid:** Keeps service always running

---

## Success Indicators

✅ Backend `/docs` endpoint accessible  
✅ Login returns JWT token  
✅ Frontend loads without CORS errors  
✅ All API calls succeed (200 status)  
✅ File uploads work (if applicable)  
✅ PDF downloads work (if applicable)  

---

## Support Resources

- **Render Docs:** https://render.com/docs
- **Cloudflare Pages:** https://developers.cloudflare.com/pages
- **FastAPI Deployment:** https://fastapi.tiangolo.com/deployment/
- **Vite Environment Variables:** https://vitejs.dev/guide/env-and-mode.html

---

**Last Updated:** November 2025  
**Tested Configuration:** Python 3.11 + FastAPI + React/Vite + Render + Cloudflare Pages
