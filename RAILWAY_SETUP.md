# Railway Setup - Step by Step

## After Connecting Your Repo

### Step 1: Configure Service Settings

In Railway dashboard, click on your service → **Settings** tab:

1. **Root Directory**: Leave as `/` (default)
2. **Build Command**: Leave empty (Railway auto-detects)
3. **Start Command**: `npm run server:ts`
4. **Healthcheck Path**: `/api/health` (optional, but recommended)

### Step 2: Add Environment Variables

Click **Variables** tab → **New Variable** → Add each one:

**Required Variables:**
```
XAI_API_KEY=your_xai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

**Optional (but recommended):**
```
PORT=5174
FRONTEND_URL=https://your-vercel-app.vercel.app
```
*(You'll update FRONTEND_URL after deploying frontend)*

### Step 3: Generate Public URL

1. Click **Settings** tab
2. Scroll to **Networking**
3. Click **Generate Domain** (or use custom domain)
4. Copy the URL (e.g., `https://livestream-agent-production.up.railway.app`)

### Step 4: Verify Deployment

1. Railway will auto-deploy when you add env vars
2. Check **Deployments** tab to see build logs
3. Once deployed, test: `https://your-url.railway.app/api/health`
4. Should return: `{"status":"ok","timestamp":"..."}`

### Step 5: Update FRONTEND_URL (After Frontend Deploy)

Once you deploy frontend to Vercel:
1. Go back to Railway → **Variables**
2. Update `FRONTEND_URL` with your Vercel URL
3. Railway will auto-redeploy

## Troubleshooting

**Build fails?**
- Check build logs in **Deployments** tab
- Ensure all dependencies are in `package.json`
- Check that `tsx` is installed (it should be in devDependencies)

**Server not starting?**
- Check **Logs** tab for errors
- Verify all environment variables are set
- Check Start Command is `npm run server:ts`

**Port issues?**
- Railway automatically assigns PORT, but you can set it in env vars
- Server code uses `process.env.PORT || 5174` so it should work

**CORS errors?**
- Make sure `FRONTEND_URL` matches your Vercel URL exactly
- Include `https://` protocol
- No trailing slash

## Quick Checklist

- [ ] Service configured with Start Command: `npm run server:ts`
- [ ] All API keys added (XAI_API_KEY, ELEVENLABS_API_KEY, OPENAI_API_KEY)
- [ ] NODE_ENV=production set
- [ ] Public domain generated
- [ ] Health check works: `/api/health`
- [ ] FRONTEND_URL set (after frontend deploy)

