# Remote Judge Setup

This repo supports two judge modes:

- Local judge (default): `JudgeService` executes in-process.
- Remote judge: `duel-server` calls `judge-service` over HTTPS with signed requests.

## Components

1. `duel-server.js` (Render): matchmaking, sockets, match state, DB writes.
2. `judge-service.js` (Docker-capable host): code execution sandbox.

## Duel Server Env

Set on Render (duel server):

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `JUDGE_URL` (example: `https://judge.example.com`)
- `JUDGE_SHARED_SECRET` (same secret as judge service)
- `JUDGE_TIMEOUT_MS` (optional, default `25000`)

If `JUDGE_URL` is omitted, duel server uses local judge.

## Judge Service Env

Set on judge host:

- `JUDGE_SHARED_SECRET` (required)
- `PORT` (optional, default `7000`)
- `JUDGE_MAX_CLOCK_SKEW_MS` (optional, default `300000`)
- `JUDGE_MAX_CONCURRENCY` (optional, default `4`)
- `JUDGE_BODY_LIMIT` (optional, default `300kb`)
- `JUDGE_RATE_WINDOW_MS` (optional, default `60000`)
- `JUDGE_RATE_MAX` (optional, default `120`)

## Security

- HMAC signature headers on every judge request:
  - `x-timestamp`
  - `x-signature` where `sig = HMAC_SHA256(secret, `${timestamp}.${rawBody}`)`
- Timestamp replay window enforced.
- Rate limiting on judge endpoint.
- In-flight concurrency cap on judge endpoint.

## Run locally

Terminal 1:

```bash
npm run start:judge-service
```

Terminal 2:

```bash
JUDGE_URL=http://localhost:7000 JUDGE_SHARED_SECRET=dev-secret npm run start:duel-server
```

## Deploy notes

- Do not deploy `judge-service` to platforms that do not provide Docker daemon access.
- Keep `JUDGE_SHARED_SECRET` private and rotate if leaked.
- Keep `SUPABASE_SERVICE_ROLE_KEY` only on backend services, never frontend.
