# Railway Environment Variables - What to Set

## ✅ SET THESE IN RAILWAY (Backend):

### Required:
```
XAI_API_KEY=your_xai_api_key_here
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
OPENAI_API_KEY=your_openai_api_key_here
NODE_ENV=production
```

### Optional (set after frontend deploy):
```
FRONTEND_URL=https://your-vercel-app.vercel.app
PORT=5174
```

## ❌ DO NOT SET IN RAILWAY (These are for Frontend/Vercel):

These variables starting with `VITE_` are for the frontend only:
- `VITE_API_URL` → Set this in **Vercel**, not Railway
- `VITE_SUPABASE_URL` → Remove this (we don't use Supabase anymore)
- `DEV` → Remove this (not needed)

## 🎯 Action Plan:

1. **In Railway**, keep only:
   - `XAI_API_KEY`
   - `ELEVENLABS_API_KEY`
   - `FRONTEND_URL` (set after Vercel deploy)
   - `NODE_ENV=production`
   - `OPENAI_API_KEY` (if you have one)

2. **Delete/Remove from Railway**:
   - `VITE_API_URL` ❌
   - `VITE_SUPABASE_URL` ❌
   - `DEV` ❌

3. **Set in Vercel later** (when deploying frontend):
   - `VITE_API_URL=https://your-railway-url.railway.app`

## Quick Fix:

Click the **X** icon next to:
- `VITE_API_URL`
- `VITE_SUPABASE_URL`
- `DEV`

Keep only the backend variables!

