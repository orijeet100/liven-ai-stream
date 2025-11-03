# Railway Auto-Deploy from GitHub

## ✅ Automatic Deployment Setup

Railway **automatically deploys** when you push to GitHub if:
1. Your repo is connected (✅ you already did this)
2. Auto-deploy is enabled (default)

## Settings to Configure:

### 1. Healthcheck Path (Recommended)
Click **"+ Healthcheck Path"** and enter:
```
/api/health
```
This tells Railway to check if your app is healthy before marking deployment as complete.

### 2. Teardown (Optional)
**Enable Teardown**: Leave OFF (default)
- This kills old deployments immediately when new ones start
- For your app, you can leave it OFF to avoid downtime during deployment

### 3. Resource Limits (Leave Default)
- CPU: 2 vCPU (default, fine for your app)
- Memory: 1 GB (default, fine for your app)
- No need to change unless you hit limits

### 4. Cron Schedule
**Leave empty** - Not needed for your app

## How Auto-Deploy Works:

1. **Push to GitHub** → Railway detects the push
2. **Railway builds** → Runs `npm install` automatically
3. **Railway deploys** → Runs your Start Command (`npm run server:ts`)
4. **Healthcheck runs** → Checks `/api/health` endpoint
5. **Deployment complete** → Old version is replaced

## Verify Auto-Deploy is Working:

1. Make a small change in your code (add a comment)
2. Commit and push to GitHub
3. Go to Railway → **Deployments** tab
4. You should see a new deployment starting automatically

## If Auto-Deploy Doesn't Work:

1. Go to your Railway project → **Settings** → **Source**
2. Make sure your GitHub repo is connected
3. Check "Auto Deploy" is enabled (should be by default)

---

## Summary - What to Set:

- ✅ **Healthcheck Path**: `/api/health` (click + button and add this)
- ✅ **Teardown**: Leave OFF
- ✅ **Resource Limits**: Leave default (2 vCPU, 1 GB)
- ✅ **Cron Schedule**: Leave empty

That's it! Railway will auto-deploy on every GitHub push.

