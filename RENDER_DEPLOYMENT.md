# 🚀 SaudiCord Render Deployment Guide

## Prerequisites
- GitHub account (SirAbody)
- Render.com account linked to GitHub

## Deployment Steps

### 1. Push to GitHub

```bash
# Initialize git repository
git init

# Add GitHub remote
git remote add origin https://github.com/SirAbody/SaudiCord.git

# Add all files
git add .

# Commit
git commit -m "Initial commit - SaudiCord by SirAbody"

# Push to GitHub
git push -u origin main
```

### 2. Deploy on Render

#### Option A: Using Render Blueprint (Recommended)
1. Go to [Render Dashboard](https://dashboard.render.com)
2. Click "New +" → "Blueprint"
3. Connect your GitHub repository: `SirAbody/SaudiCord`
4. Render will detect the `render.yaml` file
5. Click "Deploy"

#### Option B: Manual Setup
1. Create PostgreSQL Database:
   - Go to Dashboard → New → PostgreSQL
   - Name: `saudicord-db`
   - Database: `saudicord`
   - User: `saudicord_user`
   - Region: Oregon (or your preferred)
   - Plan: Free

2. Create Backend Service:
   - New → Web Service
   - Connect GitHub repo
   - Name: `saudicord-backend`
   - Runtime: Node
   - Build Command: `cd server && npm install`
   - Start Command: `cd server && node index.js`
   - Add environment variables from database

3. Create Frontend Service:
   - New → Static Site
   - Connect GitHub repo
   - Name: `saudicord-frontend`
   - Build Command: `cd client && npm install && npm run build`
   - Publish Directory: `client/build`

## Environment Variables

### Backend Service
The following will be auto-configured from the database:
- `DB_HOST`
- `DB_PORT`
- `DB_NAME`
- `DB_USER`
- `DB_PASSWORD`
- `DATABASE_URL`

Add manually:
- `JWT_SECRET`: Click "Generate" for random value
- `CLIENT_URL`: `https://saudicord-frontend.onrender.com`
- `NODE_ENV`: `production`
- `PORT`: `10000`

### Frontend Service
- `REACT_APP_API_URL`: `https://saudicord-backend.onrender.com/api`
- `REACT_APP_SERVER_URL`: `https://saudicord-backend.onrender.com`

## Post-Deployment

1. **Access your app:**
   - Frontend: `https://saudicord-frontend.onrender.com`
   - Backend API: `https://saudicord-backend.onrender.com/api/health`

2. **First User Registration:**
   - Navigate to `/register`
   - Create your admin account

3. **Monitor Services:**
   - Check logs in Render dashboard
   - Verify database connection
   - Test WebSocket connections

## Troubleshooting

### Database Connection Issues
- Ensure SSL is enabled (handled in code)
- Check DATABASE_URL format
- Verify database is active

### WebSocket Issues
- Render supports WebSockets on paid plans
- For free tier, polling fallback is enabled

### Build Failures
- Check Node version (18+ required)
- Verify all dependencies are listed
- Check build logs for specific errors

## Custom Domain (Optional)

1. Go to your service settings
2. Add custom domain
3. Configure DNS records as instructed
4. Enable auto-SSL

## Scaling

Free tier limitations:
- Services spin down after 15 min inactivity
- 512 MB RAM
- Shared CPU

For production:
- Upgrade to Starter or higher
- Enable auto-scaling
- Add more dynos

---

**Made With Love By SirAbody** ❤️
