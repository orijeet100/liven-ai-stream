# Deployment Guide

## Architecture Overview
- **Frontend**: React/Vite app (deploy to Vercel)
- **Backend**: Node.js/Express server with WebSocket support (needs full Node.js environment)

## Backend Deployment Options

### Option 1: Railway (Recommended - Easy & Supports WebSockets)
- **Pros**: Simple setup, free tier, WebSocket support, automatic HTTPS
- **Cons**: Free tier has limits
- **Setup**: 
  1. Connect GitHub repo
  2. Set environment variables
  3. Deploy automatically

### Option 2: Render
- **Pros**: Free tier, WebSocket support, easy setup
- **Cons**: Free tier spins down after inactivity
- **Setup**: Similar to Railway

### Option 3: Fly.io
- **Pros**: Generous free tier, great for WebSockets
- **Cons**: Slightly more complex setup
- **Setup**: Uses Dockerfile

### Option 4: DigitalOcean App Platform
- **Pros**: Reliable, good performance
- **Cons**: Paid (starts at $5/month)
- **Setup**: App Platform with WebSocket support

### Option 5: Self-hosted VPS (DigitalOcean, Linode, etc.)
- **Pros**: Full control, cheapest long-term
- **Cons**: Requires server management
- **Setup**: Use PM2 or systemd

## Required Changes for Deployment

### 1. Environment Variables
Create production environment variables:
- `OPENAI_API_KEY` (for xAI/Grok)
- `XAI_API_KEY` (for xAI/Grok)
- `ELEVENLABS_API_KEY` (for TTS)
- `PORT` (optional, defaults to 5174)
- `NODE_ENV=production`

### 2. Frontend Changes
- Replace hardcoded `localhost:5174` with environment variable
- Update Vite config for production API URL
- Use relative URLs in production, absolute in dev

### 3. Backend Changes
- Update CORS to allow production frontend domain
- Use environment variable for port
- Ensure voice-config.json is included in deployment

## Step-by-Step Deployment

### Step 1: Update Code for Production

1. Create `.env.production` file (for frontend)
2. Update backend CORS settings
3. Replace hardcoded URLs with environment variables

### Step 2: Deploy Backend (Railway Example)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Add environment variables
railway variables set XAI_API_KEY=your_key
railway variables set ELEVENLABS_API_KEY=your_key
railway variables set NODE_ENV=production

# Deploy
railway up
```

### Step 3: Deploy Frontend (Vercel)

1. Connect GitHub repo to Vercel
2. Set environment variables:
   - `VITE_API_URL` = your backend URL (e.g., https://your-app.railway.app)
3. Build command: `npm run build`
4. Output directory: `dist`
5. Deploy

## Recommended: Railway + Vercel

**Why Railway for Backend:**
- Free tier: $5 credit/month
- WebSocket support
- Automatic HTTPS
- Easy environment variable management
- Simple deployment

**Why Vercel for Frontend:**
- You already have it
- Perfect for React/Vite
- Free tier
- Automatic deployments
- Edge network

## Post-Deployment Checklist

- [ ] Backend is accessible (check health endpoint)
- [ ] CORS is configured correctly
- [ ] Environment variables are set
- [ ] WebSocket connection works
- [ ] Frontend can reach backend API
- [ ] voice-config.json is accessible
- [ ] HTTPS is enabled (both services)

