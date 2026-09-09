[⬅️ Back to Index](./00_INDEX.md)

# Phase 6 Verification — Server Sessions

Date: 2026-09-09 (local). Branch `fix/bug-fixes-findings`. Live probes against isolated `aics_portal_qa` only (dev server port 3100, stopped after). All probe writes reverted and verified.

Closes the accepted-risk trio: [BUG-004](./06_BUG_REGISTRY.md#bug-004), [BUG-005](./06_BUG_REGISTRY.md#bug-005), [BUG-009](./06_BUG_REGISTRY.md#bug-009). Full fix for [BUG-012](./06_BUG_REGISTRY.md#bug-012) included.

## What changed

- `src/lib/session.ts` (new): jose HS256 JWT (8h), `aics_session` httpOnly + SameSite=Lax (+Secure in prod) cookie, `getSession` / `spoofCheck` helpers. `AUTH_SECRET` required in prod, dev-only fallback with warning.
- `POST /api/auth/login`: issues the session cookie; JSON body kept display-only for client routing.
- New: `GET /api/auth/session` (401 or claims), `POST /api/auth/logout` (clears cookie), `POST /api/auth/demo` (dev-only demo session, 404 in prod).
- `src/middleware.ts` (new): valid cookie required for all `/api/*` (except login/demo/session + health stub) → 401 JSON; all `/portal/*` without a cookie redirect to `/`.
- Every route derives identity from `getSession(request)`: student, student/update (own profile, admin same-branch exception), tasks GET/POST/PATCH (self-or-staff reads; writes as session faculty), tasks submit (self only), notifications GET/POST/PATCH, announcements GET/POST/read, enrollment/events/professors (self), faculty/history/tasks (session user), grades update/submit/release/audits, attendance GET/POST, change-password (self). Legacy `username`/`performedBy` fields that mismatch the session → 403. No dual-auth paths.
- Client: `useAuth` rewritten around `/api/auth/session` — zero `localStorage` auth flags left in `src` (grep-verified). `DEV_CREDENTIALS` deleted from the bundle (grep-verified); demo login and Face ID mock call the server demo endpoint.
- `jose ^6.2.12` added as a real dependency (`npm install` also pruned 426 unused extraneous packages incl. next-auth; nothing in `src` imported them — grep-verified). `package-lock.json` now tracked.

## Live probe results (32/32 PASS)

Server: `npx next dev -p 3100`, `MONGODB_DB=aics_portal_qa`. Cookies via curl jars.

| # | Probe | Expected | Actual | Verdict |
|---|---|---|---|---|
| 1 | Anon `GET /api/student?username=maria.cruz` | 401 | 401 | PASS (was 200) |
| 2 | Anon `GET /api/grades/audits` | 401 | 401 | PASS (was 200) |
| 3 | Anon `GET /portal/.../juan.santos` | 307 redirect | 307 | PASS (was render) |
| 4 | Anon `PATCH /api/grades/update` | 401 | 401 | PASS |
| 5 | Anon `GET /api/auth/session` | 401 | 401 | PASS |
| 6 | Injection login `{"$ne":null}` | 400 | 400 | PASS |
| 7 | Regex injection login | 400 | 400 | PASS |
| 8 | Wrong password | 401 generic | 401 | PASS |
| 9 | Valid login `juan.santos` | 200 | 200 | PASS |
| 10 | `Set-Cookie: aics_session=... HttpOnly; SameSite=lax` | present | present | PASS |
| 11 | `POST /api/auth/demo` (dev) | 200 | 200 | PASS |
| 12 | Authed `GET /api/auth/session` | 200 claims | 200 | PASS |
| 13 | Student reads `maria.cruz` | 403 | 403 | PASS (was 200) |
| 14 | Student reads self | 200 | 200 | PASS |
| 15 | Student updates `maria.cruz` profile | 403 | 403 | PASS (was 200) |
| 16 | Student submits `maria.cruz` task | 403 | 403 | PASS (was 200) |
| 17 | Spoofed `performedBy:m.reyes` on student session | 403 | 403 | PASS |
| 18 | Change-password as `maria.cruz` | 403 | 403 | PASS |
| 19 | Faculty login `m.reyes` | 200 | 200 | PASS |
| 20 | Faculty reads `admin` roster | 403 | 403 | PASS (was 200) |
| 21 | Faculty reads own workspace | 200 | 200 | PASS |
| 22 | Faculty audits (scoped) | 200 | 200 | PASS |
| 23 | Grade `999` as faculty | 400 envelope | 400 | PASS |
| 24 | Grade write own section (`CS 208` prelim 90) | 200 | 200 | PASS |
| 25 | Attendance first POST (scratch date) | 200 | 200 | PASS |
| 26 | Attendance duplicate, no flag | 409 | 409 | PASS (was silent overwrite) |
| 27 | Attendance spoofed `performedBy` + overwrite | 403 | 403 | PASS |
| 28 | 11th consecutive bad login | 429 + Retry-After | 429 | PASS |
| 29–31 | `X-Frame-Options: DENY`, `nosniff`, no `X-Powered-By` | present | present | PASS |
| 32 | Session check after logout | 401 | 401 | PASS |

Note: two first-run failures were probe-script artifacts (PowerShell `$args` splat; stale cookie jar on logout check) — both re-ran clean manually (403 / 401). No app changes between runs.

## Regression checks

- `npx tsc --noEmit --skipLibCheck`: only pre-existing `FitText.tsx(42,32)` error (Phase 8 item). No new type errors.
- `npm run build`: 26/26 pages, middleware listed as active Proxy. (Warning only: `middleware` convention deprecated in favor of `proxy` — still functional in Next 16.)
- Happy paths intact per probes 9/14/19/21/24 (login, self reads, faculty workspace, grade write).

## Hygiene

- QA DB restored and verified: `juan.santos / CS 208 / 2026-2027 / 1st Sem` back to `prelim: INC`, `prelimStatus: ''`; 2 probe audit rows deleted; 1 attendance probe doc (`2020-01-02`) deleted. No other writes were possible (all other mutations returned 4xx).
- No server left running (port 3100 closed, verified). No temp files left (probe scripts, jars, JSON bodies, logs, PID file all deleted). No secrets in this report (passwords redacted to field names only).

## Remaining (unchanged plan)

- **Phase 7** (needs explicit "go" + maintenance window): production password rehash + credential rotation.
- **Phase 8**: FitText null check + `ignoreBuildErrors: false`, CSP report-only, M0 seed re-run + `db:indexes` split, substitute-teacher override proposal.
- Follow-up worth noting: `GET /api` health stub is public by design; consider a DB-pinging `/api/health` later. Rate limiter is still in-memory single-node.
