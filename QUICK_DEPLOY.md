# Quick Deployment Guide

## Recommended Setup: Railway (Backend) + Vercel (Frontend)

### Step 1: Deploy Backend to Railway

1. **Sign up/Login to Railway**: https://railway.app
2. **Create New Project** → "Deploy from GitHub repo"
3. **Select your repository**
4. **Configure Service**:
   - Root Directory: `/` (keep as is)
   - Build Command: Leave empty (Railway auto-detects)
   - Start Command: `npm run server:ts`
   - Healthcheck Path: (optional) `/api/health`

5. **Set Environment Variables** in Railway dashboard:
   ```
   XAI_API_KEY=your_key_here
   ELEVENLABS_API_KEY=your_key_here
   OPENAI_API_KEY=your_key_here
   NODE_ENV=production
   FRONTEND_URL=https://your-vercel-app.vercel.app
   PORT=5174
   ```

6. **Deploy** - Railway will auto-deploy
7. **Copy your Railway URL** (e.g., `https://your-app.up.railway.app`)

### Step 2: Deploy Frontend to Vercel

1. **Go to Vercel Dashboard**: https://vercel.com
2. **Import Git Repository** → Select your repo
3. **Configure Project**:
   - Framework Preset: Vite
   - Root Directory: `./`
   - Build Command: `npm run build`
   - Output Directory: `dist`
   - Install Command: `npm install`

4. **Set Environment Variables**:
   ```
   VITE_API_URL=https://your-app.up.railway.app
   ```

5. **Deploy** - Vercel will build and deploy

### Step 3: Update Backend CORS

After getting your Vercel URL, update Railway environment variable:
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Redeploy backend (Railway auto-redeploys on env var changes).

## Alternative Backend Options

### Option A: Render (Free Tier)
- Similar to Railway
- WebSocket support ✅
- Free tier spins down after inactivity

### Option B: Fly.io (Free Tier)
- Best WebSocket support
- Requires Dockerfile (already created)
- Command: `flyctl launch`

### Option C: DigitalOcean App Platform ($5/month)
- Most reliable
- Best for production
- WebSocket support ✅

## Testing After Deployment

1. **Frontend**: Visit your Vercel URL
2. **Backend Health**: `https://your-backend-url/api/health` (if you add one)
3. **Test Features**:
   - Start simulation
   - Check WebSocket connection
   - Verify TTS works
   - Test both voice models

## Troubleshooting

**CORS Errors?**
- Check `FRONTEND_URL` in backend matches your Vercel URL exactly
- Include protocol (`https://`)
- No trailing slash

**WebSocket Not Working?**
- Ensure backend platform supports WebSockets (Railway ✅, Render ✅)
- Check WebSocket URL in browser console

**API 404 Errors?**
- Verify `VITE_API_URL` is set correctly in Vercel
- Check backend is running and accessible

## Cost Estimate

**Free Tier:**
- Vercel: Free (generous limits)
- Railway: $5 credit/month (usually free)
- **Total: ~$0/month**

**Paid (if needed):**
- Railway: $5-10/month
- **Total: ~$5-10/month**

