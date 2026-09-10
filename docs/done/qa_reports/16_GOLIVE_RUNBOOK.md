[⬅️ Back to Index](./00_INDEX.md)

# Report 16 — Corrections, Merge, Go-Live Runbook

Date: 2026-09-10 (local). Branch work on `fix/bug-fixes-findings`; merged to `main`.

## Correction diff summary (Step 1, pushed)

- `docs/qa_reports/15_CAMPAIGN_CLOSEOUT.md`: status line now reads rotation PENDING (deferred 2026-09-10), old credential still live; §2 target resolved = Vercel; §3 gives both credential paths and deletes "old value burned"; new §9 PENDING ITEMS (rotation before real student data).
- `example.env.local`: rotation comment corrected to pending; placeholders only.
- Commit `a2a7d6f` (message states it corrects `d3a5dee`).
- `src/components/portal/FitText.tsx`: one-line null guard (`?? el`), own commit `2156c79`; `tsc` exit 0 (fully clean for the first time).

## Merge (Step 2)

- `1f9aa67` Merge `fix/bug-fixes-findings` → `main` (`--no-ff`), pushed to `origin/main` (was `198741b`).
- Tag `campaign-closeout-2026-09-10` pushed.
- Merge-result checks: `tsc` exit 0; `next build` 26/26 green with active Proxy middleware.
- **Paused-deployment check (owner must confirm):** the Vercel project is paused, so push `1f9aa67` must NOT have produced a deployment. Owner: open Vercel → Deployments → confirm no new deployment for commit `1f9aa67`. If one exists, say so before running the runbook below. Branch `fix/bug-fixes-findings` retained until smoke passes.

## Go-live runbook (Step 3 — OWNER executes, not the agent)

1. Vercel dashboard → project → Settings → Environment Variables (Production scope): set `MONGODB_URI` = current credential (rotation deferred → old value for now), `MONGODB_DB` = `aics_portal`, `AUTH_SECRET` = fresh `openssl rand -hex 32` output (owner-held, never pasted in chat, never committed).
2. Atlas → Network Access: add `0.0.0.0/0` (Vercel has no static egress IPs). Confirm entry saved.
3. Unpause the Vercel project; trigger Deploy (Redeploy latest `main` or any push). Confirm build green.
4. Smoke against the production URL (only owner-ordered prod writes: the seed-scale tests below):
   - `POST /api/auth/demo` → 404
   - `GET /api/auth/session` (no cookie) → 401
   - tampered JWT cookie → 401
   - `maria.cruz` / `juan.santos` (student123), `m.reyes` (faculty123) logins → 200
   - session with valid cookie → 200
   - logout → replay old cookie → 401; re-login → 200
   - one faculty grade write → 200 + audit row appears (revert the grade after, delete the audit row)
5. Watch Vercel runtime logs ~30 min: auth failures, Mongo connection errors, 5xx rate. Result: ______ (owner fills).

## Smoke table

| Check | Expected | Actual |
|---|---|---|
| demo 404 / session 401 / tamper 401 | 404 / 401 / 401 | 404 / 401 / 401 PASS |
| 3 seed logins | 200 × 3 | 200 × 3 PASS |
| logout replay / re-login | 401 / 200 | 401 / 200 PASS |
| grade write + audit (reverted) | 200 + row, then clean | 200 + audit rows, reverted clean, baseline verified PASS |
| 30-min log watch | no anomalies | pending owner |

Smoke executed 2026-09-10 by verifier (Super Z) at owner request against https://aics-portal.vercel.app; auth probes 10/10; grade write proven with full revert (audit rows deleted exactly, baseline restored).

## PENDING (do not lose)

- **Credential rotation BEFORE real student data exists.** Old credential still live. When owner says "rotated": owner updates Vercel `MONGODB_URI` + local `.env.local`; agent runs fresh-connect proof (`db:` = `aics_portal`, 77/77 scrypt, tv ≥ 2) and confirms the redeploy is healthy.
