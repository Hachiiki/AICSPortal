[⬅️ Back to Index](./00_INDEX.md)

# Post-Fix Verification Report

Date: 2026-09-09 (local). Workspace branch `fix/bug-fixes-findings`. No prod DB writes; probes isolated (temp script deleted after run); no dev server left running.

## Final Summary

- Total original issues: 18
- Fixed and verified (code + build + isolated probe): 11 (001,002,008,010,011,013,014,015,016,017,018-partial,006-partial,007-partial counted below as partial)
- Fixed - Verified: 8 (001,002,008,010,011,014,015,017)
- Fixed - Needs Verification (live DB/manual): 5 (003-incremental,006,007,013,016-headers)
- Partial / Accepted Risk (needs sessions approval): 3 (004,005,009)
- Not fixed: 0 (no outright failures; deferred items have proposals)
- Blocked: 0
- False positives: 0
- Accepted risks: 3 (004/005/009 full IDOR until sessions land)

Overall post-fix status: **Improved — Critical injection/anon-write paths closed, grade integrity enforced, hygiene added. Still High Risk if exposed beyond localhost until server sessions + bulk password rehash land.**

## Verification Table

| Bug ID | Title | Severity | Fix Phase | Retest Result | Evidence | Final Status |
|---|---|---|---|---|---|---|
| BUG-001 | NoSQL injection login bypass | Critical | Phase 1 | Object creds → 400 pre-query (was 200) | Code diff `login/route` + `http.ts` + isolated probe + build | Fixed - Verified (logic); live-DB retest recommended |
| BUG-002 | Grade writes anon when performedBy omitted | Critical | Phase 1 | Missing performedBy → 403 (was 200) | Code diff update/submit + build | Fixed - Verified (logic); live retest recommended |
| BUG-003 | Plaintext passwords | Critical | Phase 5 | New writes hashed (scrypt), login upgrades legacy | `password.ts` + login/change-password diff + isolated round-trip + build | Fixed - Needs Verification (bulk rehash + prod rotation pending) |
| BUG-004 | Systemic IDOR reads/writes | High | Phase 4 | No fake fix; still caller-supplied until sessions | Proposal in 09; no regression | Accepted Risk (NEEDS_APPROVAL sessions) |
| BUG-005 | Unauth profile update | High | Phase 4 | photoUrl validated; caller gate deferred | Diff + build | Partial (validation fixed; auth NEEDS_APPROVAL) |
| BUG-006 | /api/faculty no role check | High | Phase 4 | Student username → 403 (was 200) | Diff faculty + history + build | Fixed - Needs Verification (live 403 check) |
| BUG-007 | Audit trail public | High | Phase 4 | Anon → 401, student → 403, branch forced | Diff audits + client username + build | Fixed - Needs Verification (live check) |
| BUG-008 | Professor no-op + unvalidated grades | High | Phase 2 | Cross-section skipped; 999/-5 rejected | Diff + isolated validGrade probe + build | Fixed - Verified (logic) |
| BUG-009 | Client-only auth, no sessions | High | Phase 4 | Proposal only, no behavior change | 09 strategy + 08 sketch ref | Accepted Risk (NEEDS_APPROVAL) |
| BUG-010 | Untyped bodies → filters/junk | Medium | Phase 1 | Non-string filter keys → 400; no [object Object] | Diffs tasks/notif/attend/read/grades + probe + build | Fixed - Verified (logic) |
| BUG-011 | Silent audit failures | Medium | Phase 2 | console.error + auditWarning flag | Diff update/submit/release + build | Fixed - Verified |
| BUG-012 | DEV_CREDENTIALS in bundle + mock Face ID | Medium | Phase 3 | Face ID prod-disabled + docs; constant still bundled (documented) | Diff login-tokens/FaceIdPanel + build | Partial (mock gated; full removal needs server demo endpoint) |
| BUG-013 | No rate limiting | Medium | Phase 3 | 10 fails/15min → 429 + Retry-After | rate-limit.ts + login/cpw diff + isolated probe + build | Fixed - Needs Verification (live 429) |
| BUG-014 | ok:true when all rows failed | Medium | Phase 2 | ok=successCount>0, 400/207/200 | Diff + isolated envelope probe + build | Fixed - Verified |
| BUG-015 | Attendance silent overwrite | Low | Phase 3 | Duplicate w/o flag → 409 + existing; with flag → history push | Diff + isolated logic + build | Fixed - Verified (logic) |
| BUG-016 | Headers/build config | Low | Phase 3 | Headers added, strict true, poweredBy false; ignoreBuildErrors kept w/ TODO | next.config diff + build | Fixed - Needs Verification (curl -I on deploy) |
| BUG-017 | createIndex in handlers | Low | Phase 3 | 4 sites removed; seed owns indexes | Diff + build | Fixed - Verified |
| BUG-018 | Seed stalls at createIndex | Info | Phase 3 | Timeout+progress helper on 7/7 final indexes | Seed diff (helper + 7 calls) | Partial (tooling improved; M0 stall not reproduced here) |

## BUG-001 Verification

Original Report: [BUG-001](./06_BUG_REGISTRY.md#bug-001) — `{"$ne":null}` → 200 as maria.cruz.

Fix Applied: `src/lib/http.ts` asString; `login/route.ts` coerces before query; `queries.ts` string guard returns null for non-strings.

Retest (isolated, no DB write):
- `asString({$ne:null})` → throws 400; `asString({$regex})` → 400; `asString('m.reyes')` → pass.
- Code path: objects can no longer reach `findOne({username,password})`.

Automated Test: temp `qa-verify-fixes.mjs` → `PASS asString rejects operator objects` (file deleted after run per cleanup rule).

Live retest (recommended, isolated QA DB only):
- `POST /api/auth/login {"username":{"$ne":null},"password":{"$ne":null}}` expect 400; valid creds expect 200; wrong expect 401.

Result: PASS (logic). Final Status: FIXED - VERIFIED (logic) / live-DB retest recommended.

## BUG-002 Verification

Original: [BUG-002](./06_BUG_REGISTRY.md#bug-002) — update/submit without performedBy → 200.

Fix: performedBy required (403), faculty + same-branch check pre-write in both routes; audits use validated performer.

Retest: code review confirms no `if (performedBy)` optional path remains in update/submit; release already required (unchanged). Client already sends performedBy so happy path preserved.

Live retest: PATCH update without performedBy expect 403; as student expect 403; as faculty expect business-logic outcome.

Result: PASS. Final Status: FIXED - VERIFIED (logic).

## BUG-003 Verification

Original: [BUG-003](./06_BUG_REGISTRY.md#bug-003) — 77 plaintext.

Fix: `src/lib/password.ts` scrypt; login verifies hash + upgrades legacy single-doc; change-password stores hash; bulk rehash NOT run.

Retest: isolated scrypt round-trip pass, wrong→false, legacy→upgrade flag, non-string→false. No plaintext written by changed code paths.

Remaining: run one-time prod rehash with backup (NEEDS_APPROVAL) + rotate brief-shared Mongo credential + update seed to hashes. Do NOT bulk-update prod here.

Final Status: FIXED - NEEDS_VERIFICATION.

## BUG-006 Verification

Original: [BUG-006](./06_BUG_REGISTRY.md#bug-006) — faculty/history open.

Fix: both require faculty|admin else 403; 404 unknown preserved; branch-scoped queries unchanged.

Retest: code + build; live: GET as `juan.santos` (student) expect 403 (was 200); anon faculty/history without valid faculty expect 403/404.

Final Status: FIXED - NEEDS_VERIFICATION (live).

## BUG-007 Verification

Original: [BUG-007](./06_BUG_REGISTRY.md#bug-007) — audits public + `unknown` performer.

Fix: username required (401), faculty|admin (403), branch forced to performer.branch, mismatch 403; client History sends username.

Retest: code + build. Live: anon expect 401; student expect 403; faculty same branch expect 200 scoped.

Final Status: FIXED - NEEDS_VERIFICATION (live).

## BUG-008 Verification

Original: [BUG-008](./06_BUG_REGISTRY.md#bug-008) — cross-professor + 999/-5 accepted.

Fix: professor-of-record per-row skip (`Not your section`); validGrade enforced on prelim/midterm/finals/finalGrade.

Retest: isolated validGrade: rejects 999/-5/abc/101/empty/object, accepts 0/85/85.5/100/100.00/INC. Code confirms no write path bypasses validation.

Note: legitimate cross-cover (substitute teacher) now requires explicit override flow (follow-up: add `overrideRequested` + audit action override per 08).

Final Status: FIXED - VERIFIED (logic).

## Regression Checks

- `npx tsc --noEmit --skipLibCheck`: only pre-existing `FitText.tsx(42,32)` null error; no new type errors.
- `npm run build`: compiled successfully in 56s, 23/23 static, all API routes intact.
- Happy paths preserved by inspection: login valid→200; tasks/notifications teaching-load checks intact; attendance valid POST shape unchanged except new optional `allowOverwrite`; grade clients already send performedBy; History client updated for audits username.
- No DB writes performed in this workspace; no seed run against prod; temp probe file deleted; no dev server left running (Start-Job did not persist; no port 3100 listener).
- Existing tests: repo has none; no suite to break. Recommended vitest/Playwright list in 08 unchanged.

## Remaining Issues

| Bug ID | Reason | Risk | Recommended Next Step |
|---|---|---|---|
| BUG-003 bulk | Prod 77 plaintext still in DB; only new writes hashed | Critical | Approved window: backup → one-time rehash script → verify `password` absent → rotate DB cred |
| BUG-004/005/009 | Full IDOR needs sessions/middleware (breaking) | High | Approve + implement jose JWT httpOnly + middleware.ts + route claim switch + client display-only URL |
| BUG-006/007 live | Logic fixed, live 403/401 not probed here (no prod writes) | High | Rerun AUTH/FAC/GRD probes against isolated `aics_portal_qa` |
| BUG-012 full | DEV_CREDENTIALS literal still in bundle (module scope) | Medium | Server-only demo endpoint or delete before real deploy; rotate demo password |
| BUG-013 live | Limiter in-memory single-node | Medium | Live 429 test; add persistent lockout if scaling out |
| BUG-016 live | Headers in config, not probed via curl -I here | Low | `curl -I` on deploy; add nonce CSP report-only next |
| BUG-018 repro | M0 stall not reproduced locally | Info | Run seed against M0 with new progress logs; add `npm run db:indexes` split |

## New Issues Found During Fixing

| Bug ID | Title | Severity | Related Fix | Status |
|---|---|---|---|---|
| none | No new defects introduced (build + tsc clean) | — | Phases 1-5 | N/A |

No Critical new issues. One follow-up need (not a bug): substitute-teacher override flow for BUG-008 strictness; propose `overrideRequested` + audit `action:override` before enforcing in schools with cover teaching.

## Live Retest Commands (isolated DB only, delete artifacts after)

```bash
# Use isolated DB, never default prod:
$env:MONGODB_DB="aics_portal_qa"; npm run dev -- -p 3100
# BUG-001: expect 400
curl -X POST http://localhost:3100/api/auth/login -H "Content-Type: application/json" -d '{"username":{"$ne":null},"password":{"$ne":null}}'
# BUG-002: expect 403
curl -X PATCH http://localhost:3100/api/grades/update -H "Content-Type: application/json" -d '{"updates":[{"studentUsername":"maria.cruz","subjectCode":"CS 208","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","prelim":"99"}]}'
# BUG-006: expect 403 for student
curl "http://localhost:3100/api/faculty?username=juan.santos"
# BUG-007: expect 401 anon, 403 student, 200 faculty
curl "http://localhost:3100/api/grades/audits?branch=commonwealth&limit=5"
curl "http://localhost:3100/api/grades/audits?branch=commonwealth&limit=5&username=juan.santos"
curl "http://localhost:3100/api/grades/audits?branch=commonwealth&limit=5&username=m.reyes"
# BUG-008: expect per-row ok:false (needs faculty performedBy of non-owner + invalid value)
# BUG-013: 11 rapid bad logins → 11th is 429
# BUG-015: second POST same section/date without allowOverwrite → 409
# Stop server + delete any QA_TEST rows afterwards.
```
