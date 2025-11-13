# Deployment Guide - Ancestra Business Manager

This guide covers deploying the backend to Render and the frontend to Cloudflare Pages.

## Prerequisites

1. GitHub account
2. Render account (https://render.com)
3. Cloudflare account (https://cloudflare.com)
4. Git installed locally

---

## Part 1: Deploy Backend to Render (with Docker)

### Step 1: Prepare Your Repository

1. **Initialize Git** (if not already done):
```bash
cd "h:\python Projects\Smart Business_SME"
git init
git add .
git commit -m "Initial commit - Ancestra Business Manager"
```

2. **Create a GitHub repository**:
   - Go to https://github.com/new
   - Name it: `ancestra-business`
   - Make it Private (recommended) or Public
   - Don't initialize with README
   - Click "Create repository"

3. **Push to GitHub**:
```bash
git remote add origin https://github.com/YOUR_USERNAME/ancestra-business.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Render

1. **Go to Render Dashboard**:
   - Visit https://dashboard.render.com
   - Click "New +" → "Web Service"

2. **Connect GitHub**:
   - Select "Build and deploy from a Git repository"
   - Click "Connect" next to GitHub
   - Find and select your `ancestra-business` repository

3. **Configure Service**:
   - **Name**: `ancestra-backend`
   - **Region**: Choose closest to your users
   - **Branch**: `main`
   - **Runtime**: `Docker`
   - **Dockerfile Path**: `./Dockerfile`
   - **Docker Context**: `.` (root)

4. **Configure Environment**:
   - **Plan**: Free (or choose paid for better performance)
   - **Advanced** → Environment Variables:
     ```
     PYTHONUNBUFFERED=1
     MEDIA_ROOT=/app/uploads
     ```

5. **Deploy**:
   - Click "Create Web Service"
   - Wait 5-10 minutes for deployment
   - Your backend URL will be: `https://ancestra-backend.onrender.com`

### Step 3: Update Backend CORS

Once deployed, update the backend to allow your frontend domain:

Edit `backend/main.py`:
```python
allowed_origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://ancestra.pages.dev",  # Add your Cloudflare Pages URL
    "https://your-custom-domain.com"  # Add custom domain if you have one
]
```

Commit and push:
```bash
git add backend/main.py
git commit -m "Update CORS for production"
git push
```

Render will auto-deploy the changes.

---

## Part 2: Deploy Frontend to Cloudflare Pages

### Step 1: Update Frontend API URL

1. Edit `frontend/.env.production`:
```env
VITE_API_BASE_URL=https://ancestra-backend.onrender.com
```
Replace with your actual Render backend URL.

2. Commit changes:
```bash
git add frontend/.env.production
git commit -m "Update production API URL"
git push
```

### Step 2: Deploy to Cloudflare Pages

1. **Go to Cloudflare Dashboard**:
   - Visit https://dash.cloudflare.com
   - Select "Workers & Pages" from sidebar
   - Click "Create application"
   - Select "Pages" tab
   - Click "Connect to Git"

2. **Connect GitHub**:
   - Authorize Cloudflare to access your GitHub
   - Select your `ancestra-business` repository

3. **Configure Build Settings**:
   - **Project name**: `ancestra`
   - **Production branch**: `main`
   - **Framework preset**: `Vite`
   - **Build command**: `cd frontend && npm install && npm run build`
   - **Build output directory**: `frontend/dist`

4. **Environment Variables**:
   - Click "Add variable"
   - Add: `VITE_API_BASE_URL` = `https://ancestra-backend.onrender.com`

5. **Deploy**:
   - Click "Save and Deploy"
   - Wait 2-5 minutes for build
   - Your site will be live at: `https://ancestra.pages.dev`

### Step 3: Custom Domain (Optional)

1. **In Cloudflare Pages**:
   - Go to your project → "Custom domains"
   - Click "Set up a custom domain"
   - Enter your domain (e.g., `app.yourdomain.com`)
   - Follow DNS configuration instructions

2. **Update CORS**:
   - Add your custom domain to `allowed_origins` in `backend/main.py`
   - Commit and push

---

## Part 3: Database Considerations

⚠️ **Important**: SQLite doesn't persist on Render's free tier between deploys.

### Option A: PostgreSQL (Recommended for Production)

1. **Create PostgreSQL on Render**:
   - Dashboard → "New +" → "PostgreSQL"
   - Name: `ancestra-db`
   - Plan: Free
   - Click "Create Database"

2. **Update Backend**:
   - Install psycopg2: Add to `backend/requirements.txt`:
     ```
     psycopg2-binary==2.9.9
     ```
   
   - Update `backend/database.py`:
     ```python
     import os
     from sqlalchemy import create_engine
     
     DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./ancestra.db")
     
     # Fix for Render PostgreSQL URL
     if DATABASE_URL.startswith("postgres://"):
         DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
     
     engine = create_engine(DATABASE_URL, connect_args={} if "postgresql" in DATABASE_URL else {"check_same_thread": False})
     ```

3. **Connect to Backend**:
   - In Render backend service → Environment
   - Add variable: `DATABASE_URL` → Select your PostgreSQL database (internal connection string)
   - Click "Save Changes"

### Option B: Keep SQLite (Development Only)

SQLite will reset on each deploy. Good for testing, not production.

---

## Part 4: Testing Your Deployment

1. **Test Backend API**:
```bash
curl https://ancestra-backend.onrender.com/
```

2. **Test Frontend**:
   - Visit `https://ancestra.pages.dev`
   - Try logging in
   - Check browser console for errors

3. **Check CORS**:
   - Open browser DevTools → Network tab
   - Login and verify API calls succeed
   - Should see no CORS errors

---

## Part 5: Continuous Deployment

Both services auto-deploy on git push:

```bash
# Make changes
git add .
git commit -m "Your changes"
git push

# Render auto-deploys backend (~5 min)
# Cloudflare auto-deploys frontend (~2 min)
```

---

## Troubleshooting

### Backend Issues

1. **Check Render Logs**:
   - Dashboard → Service → Logs tab
   - Look for errors in deployment or runtime

2. **Health Check Failing**:
   - Ensure port 8000 is exposed
   - Check `CMD` in Dockerfile

3. **Database Connection**:
   - Verify DATABASE_URL in environment
   - Check PostgreSQL connection string

### Frontend Issues

1. **Build Failures**:
   - Check Cloudflare build logs
   - Verify `package.json` scripts
   - Ensure `vite.config.js` is correct

2. **API Connection**:
   - Check `VITE_API_BASE_URL` in environment
   - Verify CORS settings in backend
   - Check browser Network tab

3. **404 on Refresh**:
   - Create `frontend/public/_redirects`:
     ```
     /*    /index.html   200
     ```

---

## Cost Breakdown

### Free Tier
- **Render**: Free plan with limitations (sleeps after inactivity)
- **Cloudflare Pages**: Free unlimited bandwidth
- **Total**: $0/month

### Recommended Production
- **Render**: Starter ($7/month) - Always on, better performance
- **PostgreSQL**: Render free tier or paid ($7/month for production)
- **Cloudflare Pages**: Free (unlimited)
- **Total**: $7-14/month

---

## Security Checklist

- [ ] Change default passwords in production
- [ ] Use environment variables for secrets
- [ ] Enable HTTPS (automatic on both platforms)
- [ ] Set strong JWT secret in backend
- [ ] Enable database backups
- [ ] Add rate limiting to API
- [ ] Monitor logs regularly

---

## Support

For issues:
1. Check service logs (Render/Cloudflare dashboards)
2. Review error messages
3. Verify environment variables
4. Test API endpoints with curl/Postman

---

## Next Steps

1. Set up PostgreSQL database
2. Configure custom domain
3. Add monitoring/alerts
4. Set up automated backups
5. Implement CI/CD pipeline
6. Add error tracking (e.g., Sentry)
