# Judge0 Integration Setup (No Docker)

This setup lets your duel server run JavaScript + Python judging online without Docker.

## 1) Render service settings

Repository root contains folder `medical`. In Render for this web service set:

- Root Directory: `medical`
- Build Command: `npm install`
- Start Command: `node duel-server.js`

If Root Directory is not `medical`, deploy fails with `ENOENT package.json`.

## 2) Required env vars (Render duel server)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `DUEL_ALLOWED_ORIGINS=https://<your-frontend>.onrender.com`
  - or `FRONTEND_URL=https://<your-frontend>.onrender.com`
- `JUDGE_PROVIDER=judge0`
- `JUDGE0_URL=https://judge0-ce.p.rapidapi.com` (RapidAPI) or your own Judge0 host
- `JUDGE0_API_KEY=...` (only if using RapidAPI)
- `JUDGE0_API_HOST=judge0-ce.p.rapidapi.com` (only if using RapidAPI)
- `JUDGE_TIMEOUT_MS=25000` (optional)
- `DEBUG_DUEL=1` (optional while debugging)

Frontend (Vercel) still needs:

- `VITE_DUEL_SERVER_URL=https://<your-render-service>.onrender.com`

Important:

- `DUEL_ALLOWED_ORIGINS` / `FRONTEND_URL` must be the frontend app URL, not the duel server URL.
- If you have multiple frontend origins, provide a comma-separated list in `DUEL_ALLOWED_ORIGINS`.

## 3) What to expect in logs

On startup you should see:

- `Using Judge0 API: ...`

On submission you should see:

- `[match] judge_done ... result: 'Accepted'` for correct code

## 4) Quick health checks

Server health:

```powershell
curl https://<your-render-service>.onrender.com/health
```

Should return JSON with `"status":"ok"`.

## 5) If submissions still fail

- Confirm match submissions include `language: 'python'` or `language: 'javascript'`.
- Confirm Render env vars were saved, then redeploy.
- Confirm RapidAPI quota/rate limit has not been exceeded.
- Keep `DEBUG_DUEL=1` and inspect `[judge]` + `[match]` lines in Render logs.
