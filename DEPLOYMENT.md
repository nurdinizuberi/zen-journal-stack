# Deployment Guide - Zen Journal Stack

This guide covers deploying your full-stack journaling application with:
- **Backend**: Express + Prisma + SQLite on Render
- **Frontend**: Next.js on Vercel

## 🎯 Quick Overview

1. Deploy Backend to Render (with persistent disk for SQLite)
2. Deploy Frontend to Vercel
3. Configure environment variables
4. Test the deployment

---

## 📦 Backend Deployment (Render)

### Step 1: Prepare Your Repository

Ensure your code is pushed to GitHub:

```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### Step 2: Create Render Account

1. Go to [render.com](https://render.com)
2. Sign up or log in with GitHub
3. Authorize Render to access your repository

### Step 3: Create a New Web Service

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository
3. Configure the service:

**Basic Settings:**
- **Name**: `zen-journal-backend` (or your preferred name)
- **Region**: Choose closest to your users
- **Branch**: `main`
- **Root Directory**: `zen-journal-stack/backend`
- **Runtime**: `Node`
- **Build Command**: 
  ```bash
  npm install && npx prisma generate && npx prisma migrate deploy
  ```
- **Start Command**: 
  ```bash
  npm start
  ```

**Instance Type:**
- Select **Free** tier (or paid for better performance)

### Step 4: Add Persistent Disk (IMPORTANT for SQLite)

1. Scroll to **"Disks"** section
2. Click **"Add Disk"**
3. Configure:
   - **Name**: `zen-journal-data`
   - **Mount Path**: `/var/lib/render/data`
   - **Size**: `1 GB` (Free tier allows up to 1GB)

### Step 5: Configure Environment Variables

Add these environment variables in Render dashboard:

| Key | Value | Notes |
|-----|-------|-------|
| `NODE_ENV` | `production` | Required |
| `PORT` | `10000` | Render default |
| `JWT_SECRET` | `[Generate Random String]` | Use a strong random string |
| `DATABASE_URL` | `file:/var/lib/render/data/dev.db` | Points to persistent disk |
| `CORS_ORIGIN` | `https://your-app.vercel.app` | Update after frontend deploy |
| `PUBLIC_BASE_URL` | `https://your-service.onrender.com` | Your Render URL |
| `GEMINI_API_KEY` | `[Your API Key]` | Optional: For AI features |

**To generate a secure JWT_SECRET:**
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 6: Deploy

1. Click **"Create Web Service"**
2. Wait for the build to complete (5-10 minutes)
3. Note your backend URL: `https://your-service.onrender.com`

### Step 7: Verify Backend

Test the health endpoint:
```bash
curl https://your-service.onrender.com/health
```

Expected response:
```json
{"status":"ok","service":"zen-journal-backend"}
```

---

## 🎨 Frontend Deployment (Vercel)

### Step 1: Install Vercel CLI (Optional)

```bash
npm install -g vercel
```

### Step 2: Deploy via Vercel Dashboard

1. Go to [vercel.com](https://vercel.com)
2. Sign up or log in with GitHub
3. Click **"Add New Project"**
4. Import your GitHub repository
5. Configure the project:

**Framework Preset:** Next.js (auto-detected)

**Root Directory:** `zen-journal-stack/frontend`

**Build Settings:**
- **Build Command**: `npm run build` (default)
- **Output Directory**: `.next` (default)
- **Install Command**: `npm install` (default)

### Step 3: Configure Environment Variables

Add this environment variable:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_API_URL` | `https://your-service.onrender.com/api` |

**Important:** Replace `your-service.onrender.com` with your actual Render backend URL.

### Step 4: Deploy

1. Click **"Deploy"**
2. Wait for build to complete (2-5 minutes)
3. Note your frontend URL: `https://your-app.vercel.app`

### Step 5: Update Backend CORS

Go back to Render dashboard and update the `CORS_ORIGIN` environment variable:

```
CORS_ORIGIN=https://your-app.vercel.app
```

This allows your frontend to communicate with the backend.

---

## 🔧 Alternative: Deploy via CLI

### Backend (Render)

Use the provided `render.yaml` file:

```bash
# Update render.yaml with your URLs first
# Then push to GitHub - Render will auto-deploy
git add zen-journal-stack/render.yaml
git commit -m "Update render config"
git push
```

### Frontend (Vercel CLI)

```bash
cd zen-journal-stack/frontend
vercel --prod
```

Follow the prompts and set the environment variable when asked.

---

## 🔐 Security Checklist

- [ ] Generate a strong `JWT_SECRET` (32+ characters)
- [ ] Update `CORS_ORIGIN` to match your frontend URL
- [ ] Never commit `.env` files to Git
- [ ] Keep your `GEMINI_API_KEY` private
- [ ] Use HTTPS for all production URLs
- [ ] Enable Render's auto-deploy on push (optional)

---

## 🐛 Troubleshooting

### Backend Issues

**Problem:** Database not persisting
- **Solution:** Ensure disk is mounted at `/var/lib/render/data`
- **Check:** `DATABASE_URL=file:/var/lib/render/data/dev.db`

**Problem:** CORS errors
- **Solution:** Update `CORS_ORIGIN` to match your Vercel URL exactly
- **Check:** No trailing slash in the URL

**Problem:** Build fails
- **Solution:** Check Render logs for specific errors
- **Common:** Missing dependencies or Prisma migration issues

### Frontend Issues

**Problem:** API calls fail
- **Solution:** Verify `NEXT_PUBLIC_API_URL` is correct
- **Check:** URL should end with `/api` (no trailing slash)

**Problem:** 404 on API routes
- **Solution:** Ensure backend is running and accessible
- **Test:** Visit `https://your-backend.onrender.com/health`

**Problem:** Environment variable not working
- **Solution:** Redeploy after adding env vars
- **Note:** Vercel requires rebuild for env var changes

---

## 📊 Monitoring

### Render Dashboard
- View logs: Click on your service → "Logs" tab
- Monitor metrics: CPU, Memory, Disk usage
- Check deployments: See build history

### Vercel Dashboard
- View deployments: See all builds and their status
- Check logs: Click on deployment → "Functions" tab
- Monitor analytics: View page views and performance

---

## 🚀 Post-Deployment

### Test Your Application

1. **Sign Up**: Create a new account
2. **Create Entry**: Add a journal entry
3. **Add Todo**: Create a task
4. **Set Goal**: Add a goal
5. **Check Analytics**: View your dashboard

### Enable Auto-Deploy

**Render:**
- Automatically deploys on push to `main` branch
- Configure in Settings → "Auto-Deploy"

**Vercel:**
- Automatically deploys on push to `main` branch
- Preview deployments for pull requests

---

## 💰 Cost Estimates

### Free Tier Limits

**Render Free:**
- 750 hours/month
- Spins down after 15 minutes of inactivity
- 1GB persistent disk
- Slower cold starts

**Vercel Free:**
- 100GB bandwidth/month
- Unlimited deployments
- Serverless functions included

### Upgrade Recommendations

For production use with real users:
- **Render**: Upgrade to $7/month for always-on service
- **Vercel**: Free tier is usually sufficient for small apps
- **Database**: Consider PostgreSQL for better performance

---

## 🔄 Updates and Maintenance

### Deploying Updates

```bash
# Make your changes
git add .
git commit -m "Your update message"
git push origin main

# Both Render and Vercel will auto-deploy
```

### Database Migrations

When you update the Prisma schema:

```bash
# Local development
cd zen-journal-stack/backend
npx prisma migrate dev --name your_migration_name

# Push to production
git add .
git commit -m "Add database migration"
git push

# Render will automatically run: npx prisma migrate deploy
```

---

## 📞 Support Resources

- **Render Docs**: https://render.com/docs
- **Vercel Docs**: https://vercel.com/docs
- **Prisma Docs**: https://www.prisma.io/docs
- **Next.js Docs**: https://nextjs.org/docs

---

## ✅ Deployment Checklist

- [ ] Backend deployed to Render
- [ ] Persistent disk configured for SQLite
- [ ] Backend environment variables set
- [ ] Backend health check passes
- [ ] Frontend deployed to Vercel
- [ ] Frontend environment variable set
- [ ] CORS_ORIGIN updated on backend
- [ ] Test signup/login works
- [ ] Test creating journal entries
- [ ] Test all features (todos, goals, reading)
- [ ] Monitor logs for errors

---

**Congratulations! Your Zen Journal Stack is now live! 🎉**

Your users can now access the app at: `https://your-app.vercel.app`
