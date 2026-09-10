[⬅️ Back to Index](./00_INDEX.md)

# Task 8 DRAFT — Campaign Closeout + Merge/Deploy Plan (do NOT execute)

Status: DRAFT for verifier review. Nothing below has been executed. Post-rotation verification (Task 7 Part A) that backs this draft: `db: aics_portal`, 77 docs, 0 non-scrypt, min tv 2 / 0 below, test-account hashes PASS (juan.santos, maria.cruz, m.reyes), rotation 2026-09-10. Docs touched: `example.env.local` (placeholders only), this report, `00_INDEX.md`.

## 1. Merge strategy: `fix/bug-fixes-findings` → `main`

**Recommendation: merge commit (`--no-ff`), not squash.** This campaign is an evidence trail (09 fix plan → 10 phases → 11/12/13/14 verification); squashing would collapse per-phase commits (`a2d85d3`, `be316c4`, `42d6ff2`, `cb1544b`, `65117ff`, `84ef928`, `a4fe5ef`) into one blob and destroy bisectability of the auth-layer changes. Steps at merge time:

1. Re-run `npx tsc --noEmit --skipLibCheck` (expect: only FitText, fixed by then per Phase 8) and `npm run build` (expect 26/26) on the merge result.
2. `git checkout main && git merge --no-ff fix/bug-fixes-findings`.
3. Push `main`. Keep the branch until post-deploy smoke passes, then delete it (reports live on `main` permanently).

## 2. Deploy target — QUESTION for the user (do not assume)

Options: **(a) VPS + Caddy** (repo ships a `Caddyfile`; keeps data path short to Atlas; needs `MONGODB_URI` + `AUTH_SECRET` in server env, HTTPS via Caddy) — **recommended**, because the Caddyfile already encodes that intent and a school portal benefits from a stable host + Atlas IP allowlisting; **(b) Vercel** (analytics already wired; requires Atlas 0.0.0.0 access + env vars in dashboard; rate limiter is in-memory per instance — fine at school scale, revisit if scaled out); **(c) local-only** (no deploy; campaign still closes, merge ships the code).

## 3. Deployment env checklist (values set at deploy time, never committed)

- `MONGODB_URI` = NEW rotated credential (user-provided at deploy; old value burned).
- `MONGODB_DB=aics_portal` (explicit; tooling aborts when unset).
- `AUTH_SECRET` = fresh 32-byte hex (`openssl rand -hex 32`), distinct from BACKUP_KEY.
- `NODE_ENV=production` (kills `/api/auth/demo` → 404, Secure cookies on, dev fallback disabled).

## 4. Post-deploy smoke tests (9/9 style, against the deployed app)

Login as student/faculty/admin (200 + role-correct workspace); cross-user read → 403; grade write → 200 + audit row; grade `999` → 400; logout then replay cookie → 401; `/api/auth/demo` → 404 on prod build; tampered JWT → 401; injection login → 400. Monitor auth error rate 30 min.

## 5. Rollback plan

- **Code**: revert the merge commit on `main` (or redeploy previous build); branch retained until smoke passes.
- **Data**: restore `C:\Projects\aics-backup\prod-2026-09-10.json.enc` via `--rollback` (key held by user). GO for rollback comes from the user only.
- **Sessions**: any deploy issues → bump concerns are moot (fresh `AUTH_SECRET` invalidates all tokens anyway — note as a side effect).

## 6. User-visible impact

One forced re-login for everyone (new secret + bumped versions). Nothing else: same URLs, same seeded passwords, same features.

## 7. Final registry status 001–018 (one line each)

| ID | Sev | Status |
|---|---|---|
| 001 NoSQL login injection | Critical | Fixed-Verified (400 + probes) |
| 002 anon grade writes | Critical | Fixed-Verified (403/session) |
| 003 plaintext passwords | Critical | Fixed-Verified (77/77 scrypt, window report 14) |
| 004 systemic IDOR reads | High | Fixed-Verified (session 403s, 32/32) |
| 005 unauth profile update | High | Fixed-Verified (own-profile gate) |
| 006 faculty roster open | High | Fixed-Verified (role + session) |
| 007 audits open | High | Fixed-Verified (role + branch) |
| 008 professor no-op + unvalidated | High | Fixed-Verified (record check + range) |
| 009 client-only auth | High | Fixed-Verified (sessions + revocation) |
| 010 untyped bodies | Medium | Fixed-Verified (asString guards) |
| 011 silent audit fails | Medium | Fixed-Verified (logged + flagged) |
| 012 bundle creds + mock FaceID | Medium | Fixed-Verified (server demo endpoint) |
| 013 no rate limit | Medium | Fixed-Verified (429 probes) |
| 014 ok:true on total failure | Medium | Fixed-Verified (honest envelope) |
| 015 attendance overwrite | Low | Fixed-Verified (409 + history) |
| 016 headers/build config | Low | Fixed-Verified (headers live) |
| 017 createIndex in handlers | Low | Fixed-Verified (moved to seed) |
| 018 seed stall on M0 | Info | **Proposed: close as Observed-accepted** — tooling quirk, progress-logging mitigates, rerun pending a real M0 stall. Not security. |

## 8. Remaining user answers needed

Deploy target choice (§2); Phase 8 execution order (FitText/CSP/seed-rerun/override proposal) if wanted before merge.
