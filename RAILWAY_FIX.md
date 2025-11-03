# Railway Fix - Start Command Issue

## Problem
Railway is trying to run `node server/server.js` instead of `npm run server:ts`

## Solution

### Step 1: Check Custom Start Command
1. Go to Railway Dashboard → Your Service
2. Click **"Deploy"** tab (not Build, not Settings)
3. Scroll to **"Custom Start Command"** section
4. **It should say:** `npm run server:ts`
5. **If it says something else** (like `node server/server.js` or `npm run start`):
   - Clear it
   - Type: `npm run server:ts`
   - Save

### Step 2: Config-as-code (Optional)
If you're using config-as-code:
1. Go to **Settings** tab
2. Scroll to **"Config-as-code"** section
3. File path should be: `railway.json` (no slash, no @ symbol)
4. Click "Add File Path" if not already there
5. Enter: `railway.json`

### Step 3: Verify railway.json exists
Make sure `railway.json` is in your repo root and committed to GitHub.

### Step 4: Redeploy
Railway should auto-redeploy when you change the Start Command. If not:
- Click "Redeploy" button
- Or push a small change to GitHub

## Quick Fix Checklist

- [ ] Custom Start Command = `npm run server:ts` (in Deploy tab)
- [ ] Config file path = `railway.json` (if using config-as-code)
- [ ] railway.json is in repo root
- [ ] tsx is in dependencies (not devDependencies) ✅ already done

The most important thing is the **Custom Start Command** in the Deploy tab!

