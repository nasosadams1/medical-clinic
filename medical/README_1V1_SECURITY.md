# 1v1 Duel Security and Anti-Cheat

This document describes the current 1v1 duel security model, the trust boundaries in this repository, and the operational requirements for a production deployment.

## Trust Boundaries

### 1. Browser / client
- Untrusted.
- Used only for UI, code editing, countdown rendering, and server-driven updates.
- Never authoritative for:
  - timers
  - scoring
  - verdicts
  - match outcomes
  - ratings

### 2. App / duel orchestration server
- Trusted for:
  - authentication
  - matchmaking
  - countdown orchestration
  - match lifecycle
  - server-authoritative submission handling
  - anti-cheat event capture
  - replay generation
  - moderation case creation

### 3. Judge service
- Trusted only as an isolated execution boundary if deployed separately.
- In this repository, the local judge is acceptable for development and low-risk environments only.
- Production guidance:
  - do not execute untrusted code on the same hosts as the main app or database
  - replace local judging with an isolated runner control plane

## Current Anti-Cheat Controls

### Preventive
- Server-authoritative countdown, active timer, result computation, and rating updates
- No problem statement or hidden test data leaked before the match actually starts
- Hidden test cases remain on the server
- Stale socket protection:
  - only the latest socket for a user can affect queue, submissions, telemetry, or disconnect forfeits
- Submission protection:
  - blocks submissions before the duel is active
  - blocks duplicate code resubmits
  - blocks concurrent in-flight submissions
  - rate-limits rapid resubmission with dynamic cooldowns
- Privacy-safe opponent feed:
  - shows generic submission state only
  - does not leak hidden test counts or opponent duel score

### Forensic
- Persisted evidence for moderation:
  - every submission source
  - code hash
  - compile and execution logs
  - test summaries
  - submission sequence
  - audit metadata
- Replay generation:
  - stored match replay row
  - code snapshot timelines for both players
  - stored match events
  - final submission summaries
- Session evidence:
  - IP address
  - user agent
  - device cluster ID
  - client timezone/platform/language/origin
- Editor telemetry:
  - paste events
  - large paste events
  - paste character counts
  - major edits
  - focus losses

### Similarity and risk scoring
- Token similarity
- Identifier-renaming-insensitive similarity
- Control-flow similarity
- Line similarity
- Exact code hash match
- Timing correlation
- Shared device/IP/environment signals
- Moderation cases are created only from combined evidence.
- No single heuristic auto-bans a player.

## Admin Moderation Workflow

Admin review is available in the Account page via the duel moderation panel.

Required backend env:

```env
DUEL_ADMIN_USER_IDS=<comma-separated-supabase-user-ids>
```

Accepted admin signals:
- `DUEL_ADMIN_USER_IDS`
- `app_metadata.role=admin`
- `user_metadata.role=admin`
- `user_metadata.is_admin=true`

Available moderation API:
- `GET /api/duel/admin/capabilities`
- `GET /api/duel/admin/cases`
- `GET /api/duel/admin/matches/:matchId/replay`
- `PATCH /api/duel/admin/cases/:caseId/status`

Case statuses:
- `new`
- `in_review`
- `resolved`
- `dismissed`

## Required Database Objects

Run the anti-cheat migration before using the moderation flow:

- `medical/supabase/migrations/20260308193000_add_duel_anti_cheat.sql`

It adds:
- `anti_cheat_cases`
- `anti_cheat_case_events`
- extended submission audit columns

Replay support assumes the following tables already exist:
- `match_replays`
- `code_snapshots`
- `match_events`

## Production Deployment Requirements

### Minimum env

```env
SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...
DUEL_ALLOWED_ORIGINS=https://app.example.com
DUEL_ADMIN_USER_IDS=<uuid1>,<uuid2>
```

### CORS
- `DUEL_ALLOWED_ORIGINS` should be set explicitly in production.
- Do not leave duel socket CORS permissive once deployed.

### Judge execution
Current repository state:
- local judge path is suitable for development
- remote judge/Judge0 can be used as an external executor

Recommended production direction:
- use a separate execution plane for untrusted code
- never execute user code on app or DB hosts

## Remaining Risks

### Not fully solved in this repository
- The browser can still use external second screens or human assistance.
- This code cannot prove AI assistance with certainty.
- Local judge execution is not equivalent to hardened microVM isolation.
- Device/IP similarity can produce false positives.

### Recommended future hardening
- dedicated isolated execution workers
- object storage for replay artifacts and long-lived logs
- security dashboards for suspicious match clusters
- automated similarity backfills across recent matches
- manual rating rollback tooling for moderators

## Validation

Run:

```powershell
npm run test:duel-anticheat
```

This validates representative anti-cheat scenarios:
- exact duplicate code with shared environment
- renamed but structurally similar code with close timing
- normal unrelated match without case creation
