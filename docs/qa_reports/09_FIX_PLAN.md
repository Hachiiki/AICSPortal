[⬅️ Back to Index](./00_INDEX.md)

# Fix Plan

Generated after reading all QA report files (00–08) in `docs/qa_reports/` + evidence in `docs/qa_evidence/`.

Scope: branch `main @198741b`, local Next.js dev vs isolated DB `aics_portal_qa`. Current workspace branch `fix/bug-fixes-findings`.

## Summary

- Total issues found: 18
- Confirmed bugs: 14 (live evidence: 001,002,004,005,006,007,008,009,010,013,014,015,016 + 003 via DB)
- Code-confirmed: 3 (011,012,017)
- Observed (env/tooling): 1 (018)
- Suspected issues: 0 separate (all classified above)
- Recommendations: covered in 08 + §Fix Strategy
- Critical: 3 (001,002,003)
- High: 6 (004,005,006,007,008,009)
- Medium: 5 (010,011,012,013,014)
- Low: 3 (015,016,017)
- Info: 1 (018)

Main risk areas: auth model (no sessions — umbrella over 001/002/004/005/006/007/009), grade write path (most sensitive writes), plaintext credentials, untyped JSON bodies reaching Mongo filters.

Recommended fix approach: incremental defense-in-depth on local branch. Close deterministically fixable holes first (type coercion, required performedBy, grade validation, audit logging, rate limit, headers, index hygiene, attendance overwrite guard), add partial role hardening where safe (faculty/history/audits), and isolate full session + password-hash migration as high-risk breaking changes with explicit proposals + rollback (NEEDS_APPROVAL for production data).

## Master Issue Table

| Bug ID | Title | Severity | Source | Affected Area | Fix Phase | Status |
|---|---|---|---|---|---|---|
| BUG-001 | NoSQL operator injection on login | Critical | 06_BUG_REGISTRY.md#bug-001, 02_API_FINDINGS.md AUTH-04/06, 05 | Backend/Auth `login/route.ts:6-10`, `queries.ts:14` | Phase 1 | Planned |
| BUG-002 | Grade writes skip role check when performedBy omitted | Critical | 06#bug-002, 02 GRD-07/10 | Backend/AuthZ `grades/update:42-50`, `grades/submit:13-22` | Phase 1 | Planned |
| BUG-003 | Plaintext passwords (77 accounts) | Critical | 06#bug-003, 03, 05 | DB/Auth `types.ts:16`, `queries.ts:14`, `change-password:35,43`, seed | Phase 5 | Planned (NEEDS_APPROVAL for prod data) |
| BUG-004 | Systemic IDOR on user-scoped GETs (+ cross-user task submit) | High | 06#bug-004, 02 STUD/TASK/ENR/NOTIF/SUB | Backend/AuthZ 9 endpoints | Phase 4 | Planned (partial; full fix needs sessions) |
| BUG-005 | Unauthenticated profile update | High | 06#bug-005, 02 STUD-06 | Backend/AuthZ `student/update:11,40` | Phase 4 | Planned (partial; full fix needs sessions) |
| BUG-006 | /api/faculty + history no role check, roster PII | High | 06#bug-006, 02 FAC-01/02/05/06 | Backend/AuthZ `faculty/route.ts:23-86`, `faculty/history` | Phase 4 | Planned |
| BUG-007 | Grade audit trail public | High | 06#bug-007, 02 GRD-01/11 | Backend/AuthZ `grades/audits:4-14` | Phase 4 | Planned |
| BUG-008 | Professor-of-record no-op + unvalidated grade values | High | 06#bug-008, 02 GRD-08/09 | Backend/Business `grades/update:77-80,104-127` | Phase 2 | Planned |
| BUG-009 | Client-only auth, no sessions/middleware | High | 06#bug-009, 04 spoof, 05, 07 | Frontend/Auth arch `use-student-data`, `portal/[...slug]`, missing middleware | Phase 4 | Planned (proposal; NEEDS_APPROVAL) |
| BUG-010 | Untyped JSON bodies reach Mongo filters + junk persistence | Medium | 06#bug-010, 02 TASK-06/ANN-05 | Backend/Validation `tasks:62-79`, `notifications:99-120`, `attendance:68-93`, `grades/*`, `announcements/read:13-38` | Phase 1 | Planned |
| BUG-011 | Grade audit inserts fail silently | Medium | 06#bug-011, 05 | Backend/Integrity `grades/submit:91`, `release:94,109`, `update:172` | Phase 2 | Planned |
| BUG-012 | DEV_CREDENTIALS + mock Face ID in client bundle | Medium | 06#bug-012, 04, 05 | Frontend/Security `login-tokens:17-23`, `FaceIdPanel:81-83` | Phase 3 | Planned |
| BUG-013 | No rate limiting on login/change-password | Medium | 06#bug-013, 02 AUTH-07/CPW-05, 05 | Backend/Abuse `auth/login`, `auth/change-password` | Phase 3 | Planned |
| BUG-014 | grades/update 200 ok:true when all rows failed | Medium | 06#bug-014, 02 GRD-04 | Backend/Contract `grades/update:185-189` | Phase 2 | Planned |
| BUG-015 | Attendance POST silently overwrites | Low | 06#bug-015, 02 ATT-08/09/10 | Backend/Integrity `attendance:90-103` | Phase 3 | Planned |
| BUG-016 | Missing security headers + permissive build config | Low (Med when deployed) | 06#bug-016, 05, 07 | Config `next.config.ts`, `Caddyfile` | Phase 3 | Planned |
| BUG-017 | createIndex in request handlers | Low | 06#bug-017, 05 | Backend/Perf `notifications:146-147`, `announcements/read:29`, `attendance:91` | Phase 3 | Planned |
| BUG-018 | Seed stalls at createIndex on Atlas tier | Info | 06#bug-018, 03 | Tooling `scripts/seed-mongodb.ts` | Phase 3 | Planned |

## BUG-001: NoSQL operator injection on login grants access as any user

- Source: [BUG-001](./06_BUG_REGISTRY.md#bug-001)
- Severity: Critical
- Affected Component: `src/app/api/auth/login/route.ts:6-10`, `src/lib/mongodb/queries.ts:14` (`findOne({username,password})`)
- Observed Behavior: `{"username":{"$ne":null},"password":{"$ne":null}}` → 200 as `maria.cruz`; regex variant → 200 as `m.reyes167`.
- Likely Root Cause: truthiness check passes objects; values flow untyped into Mongo filter where they become operators.
- Required Fix: `asString()` coercion on `username/password` (400 on non-string/empty) before any query; same helper for all body fields (covers BUG-010). Add `getStudentByCredentials` string guard defense-in-depth.
- Required Tests: object creds → 400; regex creds → 400; valid creds still 200 (mocked); wrong password 401.
- Risk If Not Fixed: full auth bypass, any account takeover in 1 request.
- Dependencies: None. Independent.

## BUG-002: Grade writes require no auth when performedBy omitted

- Source: [BUG-002](./06_BUG_REGISTRY.md#bug-002)
- Severity: Critical
- Affected Component: `src/app/api/grades/update/route.ts:42-50`, `src/app/api/grades/submit/route.ts:13-22` (`if (performedBy)` wrapper)
- Observed Behavior: PATCH update no `performedBy` → `200 1 updated`; POST submit no `performedBy` → `200 3 submitted`.
- Likely Root Cause: optional-performer convenience never tightened; release shows intended required pattern.
- Required Fix: make `performedBy` required (403 if missing/non-string), validate performer is faculty + same branch (update) before loop; submit same. Record `performedBy` from validated performer, never `'unknown'` on success path.
- Required Tests: update/submit without performedBy → 403; as student → 403; as faculty same branch → proceeds to business logic.
- Risk If Not Fixed: anonymous grade tampering, GPA/Dean's Lister corruption.
- Dependencies: BUG-001/010 helpers (asString) reused. No schema change.

## BUG-003: Passwords stored and compared in plaintext

- Source: [BUG-003](./06_BUG_REGISTRY.md#bug-003)
- Severity: Critical
- Affected Component: `src/lib/mongodb/types.ts:16`, `queries.ts:14`, `change-password/route.ts:35,43`, `scripts/seed-mongodb.ts`
- Observed Behavior: 77/77 docs carry plaintext `password` (len 8-10); login/change-password do `===` / `$set` plaintext.
- Likely Root Cause: prototype shortcut (`NOTE: plaintext for demo only`) never migrated.
- Required Fix (NEEDS_APPROVAL for prod): add `bcryptjs`, new writes hash cost 12, login `bcrypt.compare` with plaintext fallback + hash-on-first-login upgrade, one-time rehash script + `passwordVersion` flag, seed writes hashes, regression check `password` field absent. No bulk prod update without approval/backup.
- Required Tests: new password stored as `$2b$` hash; login accepts hash; old plaintext upgraded on login; seed contains no plaintext.
- Risk If Not Fixed: single DB read/backup/log exposes all accounts incl. admin + reuse exposure.
- Dependencies: BUG-001 fix first (type coercion before compare). Migration needs backup/rollback.

## BUG-004: Systemic IDOR on user-scoped GETs

- Source: [BUG-004](./06_BUG_REGISTRY.md#bug-004)
- Severity: High
- Affected Component: `/api/student`, `/api/tasks`, `/api/enrollment`, `/api/notifications`, `/api/events`, `/api/professors`, `/api/announcements`, `/api/announcements/read`, `/api/tasks/[taskId]/submit`
- Observed Behavior: `GET /api/student?username=maria.cruz` anon → 200 full PII + subjects + GPA; fee/balance, tasks, inboxes, cross-user submit same.
- Likely Root Cause: no session layer; identity is caller-supplied query/body.
- Required Fix: full fix = sessions + middleware (BUG-009) replacing `username` with verified claims. Incremental (this phase): document as ACCEPTED_RISK until sessions land; no fake fix that still trusts caller. Add `requireSession` stub + TODO markers.
- Required Tests (post-session): anon → 401; A with B username → 403; self → 200.
- Risk If Not Fixed: full PII/financial disclosure by username iteration + task spoofing.
- Dependencies: Blocked on BUG-009 sessions. Mark NEEDS_APPROVAL (breaking API contract).

## BUG-005: Unauthenticated profile update

- Source: [BUG-005](./06_BUG_REGISTRY.md#bug-005)
- Severity: High
- Affected Component: `src/app/api/student/update/route.ts:11,40`
- Observed Behavior: PATCH `?username=maria.cruz` anon → 200 phone changed.
- Likely Root Cause: same structural issue; whitelist + trim correct, auth missing. `photoUrl` unvalidated URL later rendered in img.
- Required Fix: same session dependency. Incremental: add `photoUrl` http(s) validation + length caps now (safe); auth gate deferred to sessions. Document.
- Required Tests: invalid photoUrl → 400; auth gate post-session.
- Risk If Not Fixed: silent contact/emergency tampering + img injection surface.
- Dependencies: BUG-009.

## BUG-006: /api/faculty has no role check

- Source: [BUG-006](./06_BUG_REGISTRY.md#bug-006)
- Severity: High
- Affected Component: `src/app/api/faculty/route.ts:23-86`, `faculty/history`
- Observed Behavior: anon GET as `m.reyes` → 200 roster emails/phones/GPAs + drafts; as `juan.santos` (student) → 200 faculty-shaped payload empty roster.
- Likely Root Cause: role check added to `faculty/tasks` but not here.
- Required Fix: add `performer.role faculty|admin else 403` to both routes (mirrors `faculty/tasks` FAC-03 pattern). Still caller-supplied until sessions, but closes anonymous-student-shaped access + documents spoof limit. Branch scoping already via performer.branch.
- Required Tests: student username → 403; missing user → 404; faculty → 200 (mocked).
- Risk If Not Fixed: roster-wide PII + draft grade leak per faculty username.
- Dependencies: None (safe incremental).

## BUG-007: Grade audit trail public

- Source: [BUG-007](./06_BUG_REGISTRY.md#bug-007)
- Severity: High
- Affected Component: `src/app/api/grades/audits/route.ts:4-14`
- Observed Behavior: anon GET `?branch=commonwealth` → 200 rows incl. `performedBy:unknown`.
- Likely Root Cause: built for History button, auth never added.
- Required Fix: require `username` query + `faculty|admin` role + branch scoping (`branch` must equal performer.branch); reject cross-branch. Full session replacement later.
- Required Tests: anon/no username → 401/403; student → 403; faculty same branch → 200 scoped.
- Risk If Not Fixed: full grade-manipulation history disclosure; aids BUG-002 attacker.
- Dependencies: None.

## BUG-008: Professor-of-record no-op + unvalidated grades

- Source: [BUG-008](./06_BUG_REGISTRY.md#bug-008)
- Severity: High
- Affected Component: `src/app/api/grades/update/route.ts:77-80,104-127`
- Observed Behavior: `m.reyes` editing CS 205 (Anna Lim) → 200; `999`/`-5` → 200 written.
- Likely Root Cause: `if (performerName && professor!==...) { // allow, log }` empty; values via `String(x)` no range check.
- Required Fix: enforce `existing.professor===performer.fullName else 403 per-row (ok:false)` + `validGrade()` (`100|0-99(.xx)?|INC` case-insensitive) → per-row `ok:false` + reason; explicit `finalGrade` also validated. Keep INC-as-0 math untouched.
- Required Tests: cross-professor → skipped 403-equivalent; 999/-5/abc → skipped; INC/85.5 → accepted.
- Risk If Not Fixed: any faculty (anon via BUG-002) alters any section incl. nonsense into GPA.
- Dependencies: BUG-002 required-performer must land first.

## BUG-009: Client-only auth (umbrella)

- Source: [BUG-009](./06_BUG_REGISTRY.md#bug-009)
- Severity: High
- Affected Component: `use-student-data.ts:104-172`, `portal/[...slug]/page.tsx`, `page.tsx:70-130`, missing `middleware.ts`
- Observed Behavior: 3 localStorage keys = session; edit `aics_username` → full portal as maria.
- Likely Root Cause: API-first + client routing, session layer deferred.
- Required Fix (NEEDS_APPROVAL, breaking): `jose` JWT httpOnly SameSite=Lax Secure cookie `{sub,role,branch,exp}`, `middleware.ts` for `/portal/*` + `/api/*` except login/static, routes read `x-aics-user/role/branch` from middleware, URL username display-only. Proposal + sketch in 08#fix-bug-009, not auto-applied to prod without approval.
- Required Tests: spoof → rejected; anon portal/API → 401; role mismatch → 403.
- Risk If Not Fixed: all AuthZ advisory; umbrella over 001/002/004/005/006/007.
- Dependencies: Blocks full 004/005. Plan first, implement behind flag.

## BUG-010—BUG-018 (summarized, details in registry)

- BUG-010 Med: JSON bodies untyped → nondeterministic AuthZ + `[object Object]` junk. Fix: `asString/asStringArray` + per-route guards; announcements/read rejects non-string ids. Phase 1.
- BUG-011 Med: silent audit `catch{}`. Fix: `console.error` + `auditOk:false` flag / `auditWarning` without failing primary write; document transaction follow-up. Phase 2.
- BUG-012 Med: DEV_CREDENTIALS in bundle + mock Face ID login. Fix: dev-only guard + explicit MOCK label + prod Face ID disabled without backend; document secret rotation (no prod secret change here). Phase 3.
- BUG-013 Med: no rate limit. Fix: in-memory fixed-window per IP+username on auth routes (10 fails/15min → 429 + Retry-After), no new infra. Phase 3.
- BUG-014 Med: `ok:true` when all rows failed. Fix: `ok=successCount>0`, status 200/207/400 by outcome, per-row reasons. Verify client tolerates (it checks per-row + toast). Phase 2.
- BUG-015 Low: attendance silent overwrite. Fix: existing session without `allowOverwrite:true` → 409 + existing summary; with flag → tracked update + `history` push. Client unchanged (gets explicit signal). Phase 3.
- BUG-016 Low: headers/build config. Fix: `poweredByHeader:false`, `reactStrictMode:true`, baseline headers (Frame/Deny, nosniff, referrer, Permissions camera=self), keep `ignoreBuildErrors:true` until tsc clean (document), scope `allowedDevOrigins` note. Caddy header note. Phase 3.
- BUG-017 Low: per-request createIndex. Fix: delete 3 call sites; rely on seed/migration indexes; add `npm run db:indexes` note. Phase 3.
- BUG-018 Info: seed stalls. Fix: progress logs + retry/timeout wrapper + separate index step, exit non-zero on failure. No DB wipe. Phase 3.

## Fix Strategy

1. Phase 1 first: Critical auth bypass + injection (001,002,010). Small, independent, no schema change. asString helper is shared foundation.
2. Phase 2: grade integrity + contract (008,011,014 + release branch check). Depends on Phase 1 performer requirement. No transaction change (replica-set tx documented as follow-up).
3. Phase 3: abuse/config/hygiene (012,013,015,016,017,018). Independent, low risk; rate limit in-memory single-node note; attendance 409 is contract addition (documented).
4. Phase 4: AuthZ hardening within current model (006,007 + 005 photoUrl validation) + session proposal for 004/005/009. Marks full IDOR fix NEEDS_APPROVAL (breaking).
5. Phase 5: password hashing (003) code + migration script behind flag, NEEDS_APPROVAL for prod bulk rehash; verify no plaintext in seed.
6. Phase 6: regression + full retest, evidence, cleanup (delete temp tests, stop dev server).

Risky items (NEEDS_APPROVAL, not auto-applied to prod): sessions/middleware (004/005/009), bulk password rehash (003), release branch strictness if cross-branch admin flows exist, attendance 409 if client auto-retries.

API contract changes: grades/update+submit now 403 without performedBy (intended, matches release); audits now requires username+role; attendance duplicate without flag now 409; update envelope `ok` now reflects successCount. Frontend already sends performedBy/username so happy paths preserved; document for callers.

DB migrations: none required for Phases 1-4 (no schema change). Phase 5 adds `passwordHash/passwordVersion` (additive, rollback = drop fields). Index reliance (017) uses existing seed indexes, no new index.

Frontend updates: minimal — Face ID mock label/dev guard (012), no nav/routing change, no PortalShell change. Full session UI (display-only URL) deferred.

Test updates: repo has no runner; add isolated `scripts/qa-verify-*.mjs` temp scripts (deleted after) + recommend vitest/Playwright per 08 regression list. No existing tests to break.

## Acceptance Criteria

- All Critical/High retested with evidence (API before/after, code diff, build+lint, DB check where safe).
- BUG-001/002/008/010/011/014 verified fixed; 006/007 verified incrementally fixed (role-gated); 012/013/015/016/017/018 verified by code+build+targeted probe.
- BUG-003/004/005/009 have safe incremental state + explicit NEEDS_APPROVAL proposals, not marked Verified unless evidence exists.
- No previously passing happy path broken (`npm run build` + `npm run lint` clean, login/tasks/grades happy-path code paths intact).
- No secrets/PII in reports; temp test artifacts deleted; dev server stopped.
- `11_POST_FIX_VERIFICATION.md` exists with per-bug verdicts.
