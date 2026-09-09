[⬅️ Back to Index](./00_INDEX.md)

# 06 Bug registry

> Post-fix update (2026-09-09): see [09 Fix plan](./09_FIX_PLAN.md), [10 Fix phases](./10_FIX_PHASES.md), [11 Post-fix verification](./11_POST_FIX_VERIFICATION.md) for per-bug fix phase, retest, and final status. Statuses below are original QA verdicts; final verdicts live in 11.
>
> Phase 6 update (2026-09-09): server sessions landed — [BUG-004](./06_BUG_REGISTRY.md#bug-004), [BUG-005](./06_BUG_REGISTRY.md#bug-005), [BUG-009](./06_BUG_REGISTRY.md#bug-009) are FIXED-VERIFIED (32/32 live probes) and [BUG-012](./06_BUG_REGISTRY.md#bug-012) is FIXED-VERIFIED (bundle). Evidence: [12 Phase 6 verification](./12_SESSIONS_VERIFICATION.md).

Phase 6.5 update (2026-09-09): logout-replay gap (E6) closed via tokenVersion revocation — replay after logout and after password change now 401. `scripts/rehash-passwords.ts` created for Phase 7 (dry-run default). Evidence: [12 addendum](./12_SESSIONS_VERIFICATION.md#addendum--phase-65-real-logout--revocation-e6-gap-closed).

Severity counts: 3 Critical, 6 High, 5 Medium, 3 Low, 1 Info. Status labels: Confirmed (live evidence), Code-confirmed (read from source, not safely provable live), Observed (environment/tooling).

<a id="bug-001"></a>
## BUG-001: NoSQL operator injection on login grants access as any user

| Attribute | Details |
| :--- | :--- |
| Severity | Critical |
| Status | Confirmed |
| Area | Backend / Auth |
| Environment | Local dev against test DB; the code path is environment-independent |
| Affected component | `src/app/api/auth/login/route.ts:6-10`, `src/lib/mongodb/queries.ts:14` |

### Description
The login route reads `username` and `password` from the JSON body, checks only that they are truthy, and passes them straight into `findOne({ username, password })`. When the values are operator objects instead of strings, MongoDB evaluates them as query operators. `{"$ne": null}` matches any document, so the request returns the first student in the collection and the API responds 200 with a valid login.

### Steps to reproduce
1. POST `/api/auth/login` with body `{"username":{"$ne":null},"password":{"$ne":null}}`
2. Observe the response

### Expected vs actual result
- Expected: 401, because neither field is a valid credential string
- Actual: `200 {"ok":true,"username":"maria.cruz","branch":"commonwealth","role":"student"}`

### Evidence
- AUTH-04: body above returned 200 as `maria.cruz`
- AUTH-06: `{"username":{"$regex":"^m\\.reyes"},"password":{"$ne":"zzz"}}` returned 200 as `m.reyes167`, proving arbitrary account selection with a regex
- Code: `queries.ts:14` is `return col.findOne({ username, password })` with no type validation upstream

### Root cause hypothesis
Missing type coercion. The truthiness check at `login/route.ts:7` passes objects, since JS objects are truthy.

### Impact
Full authentication bypass without knowing any password. Combined with the absence of server sessions ([BUG-009](./06_BUG_REGISTRY.md#bug-009)), an attacker obtains any user's identity tokens (`username`, `branch`, `role`) in one request.

### Recommended fix and regression test
See [08_RECOMMENDATIONS_AND_FIXES.md, fix for BUG-001](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-001)

<a id="bug-002"></a>
## BUG-002: Grade writes and grade-status changes require no authentication when performedBy is omitted

| Attribute | Details |
| :--- | :--- |
| Severity | Critical |
| Status | Confirmed |
| Area | Backend / Authorization |
| Environment | Local dev against test DB |
| Affected component | `src/app/api/grades/update/route.ts:42-50`, `src/app/api/grades/submit/route.ts:13-22` |

### Description
Both routes wrap their entire role check inside `if (performedBy)`. The body field is caller-supplied, so omitting it skips the check completely. Even supplying an honest value only verifies the named user's role, not the caller's. `/api/grades/release` does this correctly by making `performedBy` required; the other two do not.

### Steps to reproduce
1. PATCH `/api/grades/update` with body `{"updates":[{"studentUsername":"maria.cruz","subjectCode":"CS 208","branch":"commonwealth","academicYear":"2026-2027","semester":"1st Sem","prelim":"99"}]}` and no `performedBy`
2. POST `/api/grades/submit` with `{"branch":"commonwealth","subjectCode":"CS 208","academicYear":"2026-2027","semester":"1st Sem","period":"prelim"}` and no `performedBy`

### Expected vs actual result
- Expected: 401/403 on both
- Actual: step 1 returned `200 {"message":"1 updated, 0 skipped"}`; step 2 returned `200 {"message":"3 grade(s) submitted for approval.","modifiedCount":3}`

### Evidence
- GRD-07 (200, grade value written), GRD-10 (200, three subjects flipped `prelimStatus: draft -> submitted`, `gradeStatus: submitted`)
- Code: `update/route.ts:42` `if (performedBy) { ...role check... }`, same shape in `submit/route.ts:13`

### Root cause hypothesis
The optional-performer pattern was written for convenience and never tightened. Release shows the intended pattern (required `performedBy`).

### Impact
Anonymous grade tampering and premature release-state flips. Grades feed GPA, Dean's Lister status, and student-facing release states. This is the app's most sensitive write path.

### Recommended fix and regression test
See [fix for BUG-002](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-002). All documents my probes mutated were restored from a pre-test snapshot.

<a id="bug-003"></a>
## BUG-003: Passwords stored and compared in plaintext

| Attribute | Details |
| :--- | :--- |
| Severity | Critical |
| Status | Confirmed |
| Area | Database / Auth |
| Environment | Applies to any environment using this schema |
| Affected component | `src/lib/mongodb/types.ts:16`, `src/lib/mongodb/queries.ts:14`, `src/app/api/auth/change-password/route.ts:35,43`, seed script |

### Description
Password fields hold plaintext strings. Login compares them with an equality match; change-password compares and writes plaintext. The type definition carries a `// NOTE: plaintext for demo only` comment. All 77 seeded accounts follow this pattern.

### Steps to reproduce
1. `db.students.findOne({}, { projection: { password: 1 } })` (values redacted here)
2. Observe the raw password string

### Expected vs actual result
- Expected: only irreversible hashes are stored; comparison uses bcrypt/argon2
- Actual: 77 of 77 documents carry a plaintext `password` field (lengths 8-10 observed)

### Evidence
- DB presence check in `../qa-evidence/db-analysis.json`
- `change-password/route.ts:35` `if (student.password !== currentPassword)` and `:43` `$set: { password: newPassword }`

### Root cause hypothesis
Prototype shortcut documented in the code, never migrated.

### Impact
One database read (or any backup, log, or support dump) exposes every account, including the admin. No hashing means password reuse across other systems is exposed too.

### Recommended fix and regression test
See [fix for BUG-003](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-003)

<a id="bug-004"></a>
## BUG-004: Systemic IDOR: any user-scoped GET returns any user's data to an anonymous caller

| Attribute | Details |
| :--- | :--- |
| Severity | High |
| Status | Confirmed |
| Area | Backend / Authorization |
| Environment | Local dev |
| Affected component | `/api/student`, `/api/tasks`, `/api/enrollment`, `/api/notifications`, `/api/events`, `/api/professors`, `/api/announcements`, `/api/announcements/read`, `/api/tasks/[taskId]/submit` (write) |

### Description
These endpoints take `username` from the query string or body and return or modify that user's data with no verification of who is asking. The IDOR is structural: there is no session to compare against.

### Steps to reproduce
1. `GET /api/student?username=maria.cruz` with no credentials

### Expected vs actual result
- Expected: 401/403
- Actual: 200 with fullName, studentNumber, program, email, phone, address, emergency contacts, subjects, GPA

### Evidence
- STUD-02 (student profile), STUD-05 (faculty profile PII), TASK-02 (tasks), ENR-01 (fee assessment and balance), NOTIF-01/02 (inboxes), SUB-02 (submitted a task on another student's behalf, 200)

### Root cause hypothesis
Same as BUG-002: identity is caller-supplied because no session layer exists.

### Impact
Full PII and financial-data disclosure for all 77 accounts by iterating usernames. Task-submission spoofing on behalf of other students.

### Recommended fix and regression test
See [fix for BUG-004](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-004)

<a id="bug-005"></a>
## BUG-005: Unauthenticated profile update for any username

| Attribute | Details |
| :--- | :--- |
| Severity | High |
| Status | Confirmed |
| Area | Backend / Authorization |
| Environment | Local dev |
| Affected component | `src/app/api/student/update/route.ts:11,40` |

### Description
PATCH `/api/student/update?username=X` accepts a whitelisted set of contact fields (phone, email, address, emergency contact name/number, photoUrl) and writes them for X with no authentication.

### Steps to reproduce
1. PATCH `/api/student/update?username=maria.cruz` with `{"phone":"+63 917 000 QA-TEST"}`

### Expected vs actual result
- Expected: 401/403
- Actual: `200 {"ok":true,"message":"Profile updated successfully."}`

### Evidence
STUD-06. I restored her phone from the seed value afterwards (verified in the cleanup output).

### Root cause hypothesis
Same structural issue as BUG-002/004.

### Impact
Silent tampering with contact and emergency-contact data; `photoUrl` is unvalidated as a URL and is later rendered in an img tag.

### Recommended fix and regression test
See [fix for BUG-005](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-005)

<a id="bug-006"></a>
## BUG-006: /api/faculty has no role check; roster PII available to any username

| Attribute | Details |
| :--- | :--- |
| Severity | High |
| Status | Confirmed |
| Area | Backend / Authorization |
| Environment | Local dev |
| Affected component | `src/app/api/faculty/route.ts:23-86`; same pattern in `faculty/history` |

### Description
The route resolves the `username` param, never checks `role`, and returns the faculty workspace: for a faculty username this includes the branch-wide roster with emails, phones, and GPAs, plus draft grades for their subjects.

### Steps to reproduce
1. GET `/api/faculty?username=m.reyes` with no credentials
2. GET `/api/faculty?username=juan.santos` (a student) with no credentials

### Expected vs actual result
- Expected: step 1 requires a faculty session; step 2 returns 403
- Actual: both 200. Step 2 returned juan's own PII in a faculty-shaped payload with an empty roster (name-join matched nothing)

### Evidence
FAC-01, FAC-02. Compare FAC-03 (`/api/faculty/tasks` as a student returned 403), which proves the codebase knows how to do this check.

### Root cause hypothesis
The role check was added to `faculty/tasks` but not to `faculty` or `faculty/history`.

### Impact
Roster-wide PII disclosure (75 students per branch) to anyone who supplies any faculty username. Draft grades leak before release.

### Recommended fix and regression test
See [fix for BUG-006](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-006)

<a id="bug-007"></a>
## BUG-007: Grade audit trail readable with zero authentication

| Attribute | Details |
| :--- | :--- |
| Severity | High |
| Status | Confirmed |
| Area | Backend / Authorization |
| Environment | Local dev |
| Affected component | `src/app/api/grades/audits/route.ts:4-14` |

### Description
GET `/api/grades/audits` accepts `branch`, `subjectCode`, `studentUsername`, and `limit` (capped at 200) straight from the query string and returns the grade-change history: who changed what, old and new values, and when. No auth check exists in the file.

### Steps to reproduce
1. GET `/api/grades/audits?branch=commonwealth&limit=50` with no credentials

### Expected vs actual result
- Expected: 401/403
- Actual: 200 with audit rows (my probes' entries showed `performedBy: "unknown"` for the unauthenticated writes, which is itself a traceability hole)

### Evidence
GRD-01 (empty trail, 200), GRD-11 (200 with rows after grade probes)

### Root cause hypothesis
The endpoint was built for the faculty History button and the authorization layer around it was never added.

### Impact
Complete disclosure of grade-manipulation history per student or branch. An attacker with write access (BUG-002) also learns exactly which changes persisted.

### Recommended fix and regression test
See [fix for BUG-007](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-007)

<a id="bug-008"></a>
## BUG-008: Professor-of-record check in grades/update is a deliberate no-op; grade values unvalidated

| Attribute | Details |
| :--- | :--- |
| Severity | High |
| Status | Confirmed |
| Area | Backend / Business logic |
| Environment | Local dev |
| Affected component | `src/app/api/grades/update/route.ts:77-80,104-127` |

### Description
Two related defects. First, the comment says "For now allow, but log" for faculty editing subjects they do not teach; the block is empty and logs nothing. Second, grade values pass through `String(x)` with no numeric or range validation.

### Steps to reproduce
1. PATCH `/api/grades/update` with `performedBy: "m.reyes"` and an update for CS 205 (taught by Prof. Anna Lim): accepted
2. PATCH with `prelim: "999"` and `prelim: "-5"`: accepted

### Expected vs actual result
- Expected: step 1 blocked or explicitly overridden-with-audit; step 2 rejected with 400
- Actual: both 200, values written (restored afterwards from snapshot)

### Evidence
GRD-08 (`1 updated`), GRD-09 (`2 updated`)

### Root cause hypothesis
Intentional scaffolding left in; validation never added behind it.

### Impact
Any faculty account (and anonymously, via BUG-002) can alter any section's grades, including nonsense values that flow into GPA math and remarks.

### Recommended fix and regression test
See [fix for BUG-008](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-008)

<a id="bug-009"></a>
## BUG-009: Client-only authentication: identity lives in localStorage, no server sessions or middleware

| Attribute | Details |
| :--- | :--- |
| Severity | High |
| Status | Confirmed |
| Area | Frontend / Auth architecture |
| Environment | Any |
| Affected component | `src/lib/aics/use-student-data.ts:104-172`, `src/app/portal/[...slug]/page.tsx`, `src/app/page.tsx:70-130`, absent `middleware.ts` |

### Description
After login, the client stores `aics_username`, `aics_branch`, `aics_role` in localStorage. Portal rendering and routing read these values. There is no server-side guard anywhere: the catch-all portal route re-exports the client shell, and no middleware exists.

### Steps to reproduce
1. Log in as any user
2. In devtools: `localStorage.setItem('aics_username','maria.cruz')` and reload

### Expected vs actual result
- Expected: server rejects the session for a user who never authenticated as maria
- Actual: the portal renders fully as maria ("Welcome back, Maria!"), screenshot `../qa-evidence/screenshots/06-localstorage-spoof-maria.png`

### Evidence
Storage dump after login showed exactly the three keys; spoof demo reproduced in the browser walkthrough

### Root cause hypothesis
The app was built API-first with client-side routing and the server session layer was deferred.

### Impact
Every authorization decision in the app is advisory. This bug is the umbrella over BUG-001/002/004/005/006/007; fixing it (server sessions plus middleware) is also the fix for those.

### Recommended fix and regression test
See [fix for BUG-009](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-009)

<a id="bug-010"></a>
## BUG-010: JSON body fields reach Mongo filters untyped; operator injection into authorization queries and junk persistence

| Attribute | Details |
| :--- | :--- |
| Severity | Medium |
| Status | Confirmed |
| Area | Backend / Input validation |
| Environment | Local dev |
| Affected component | `tasks/route.ts:62-79,160-166`, `notifications/route.ts:99-120`, `attendance/route.ts:68-93`, `grades/*` bodies, `announcements/read/route.ts:13-38` |

### Description
Query-string parameters are always strings in Next.js, so they are safe. JSON body fields are not coerced: objects pass through into Mongo filters. In authorization checks this means an operator object can steer which user document a role check matches; the outcome then depends on natural document order, which makes authorization nondeterministic. Separately, `announcements/read` persists `String(id)` for each id, so an object id becomes the literal junk value `"[object Object]"` in the database.

### Steps to reproduce
1. POST `/api/tasks` with `performedBy: {"$regex":"^m"}` (TASK-06): the object reached `findOne` and matched a student doc, producing 403 only because the matched user happened to be a student
2. POST `/api/announcements/read` with `announcementId: {"$ne":null}` (ANN-05): 200, `marked: 1`, junk row stored

### Expected vs actual result
- Expected: 400 for non-string fields before any query runs
- Actual: queries executed with attacker-shaped filters; junk row persisted

### Evidence
TASK-06, ANN-05. I deleted the junk `announcement_reads` row during cleanup.

### Root cause hypothesis
No body validation layer; each route hand-picks fields and checks truthiness.

### Impact
Nondeterministic authorization outcomes and data hygiene problems. Escalates to Critical anywhere the injected object matches a privileged user first (login already demonstrated this in BUG-001).

### Recommended fix and regression test
See [fix for BUG-010](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-010)

<a id="bug-011"></a>
## BUG-011: Grade audit inserts can fail silently

| Attribute | Details |
| :--- | :--- |
| Severity | Medium |
| Status | Code-confirmed |
| Area | Backend / Data integrity |
| Environment | Any |
| Affected component | `grades/submit/route.ts:91`, `grades/release/route.ts:94,109`, `grades/update/route.ts:172` |

### Description
All three grade routes wrap audit inserts in `try { insertMany(audits) } catch {}`. A failed audit write is swallowed and the primary operation still reports success.

### Steps to reproduce
Code inspection; no safe way to force an insert failure without disrupting the shared cluster.

### Expected vs actual result
- Expected: audit failure surfaces (retry, dead letter, or at minimum a log)
- Actual: empty catch

### Root cause hypothesis
Deliberate choice to keep grade writes resilient, taken without a compensating control.

### Impact
The audit trail (the app's tamper evidence) can have silent gaps exactly when things go wrong, such as connection loss during a batch.

### Recommended fix and regression test
See [fix for BUG-011](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-011)

<a id="bug-012"></a>
## BUG-012: Dev credentials and a mock Face ID login ship in the client bundle

| Attribute | Details |
| :--- | :--- |
| Severity | Medium |
| Status | Code-confirmed |
| Area | Frontend / Security |
| Environment | Bundle behavior, any deployment |
| Affected component | `src/components/auth/login-tokens.ts:17-23`, `src/components/auth/FaceIdPanel.tsx:81-83`, `CredentialsForm.tsx:58-62` |

### Description
`DEV_CREDENTIALS = { username: 'juan.santos', password: 'student123' }` is a client module constant, so it is bundled into production JS even though `SHOW_DEMO_LOGIN` only gates the button's visibility in dev. The Face ID panel, which performs no biometric matching, logs in with these credentials on a successful scan.

### Steps to reproduce
1. Build for production and inspect the JS bundle for `student123`

### Expected vs actual result
- Expected: no credentials in client code
- Actual: credentials present as a module constant

### Root cause hypothesis
Dev convenience wired at module scope instead of behind an env-gated dynamic import.

### Impact
Publishes a working account (currently a student; the pattern invites adding more) and undermines the Face ID feature's credibility, since it authenticates a fixed demo user.

### Recommended fix and regression test
See [fix for BUG-012](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-012)

<a id="bug-013"></a>
## BUG-013: No rate limiting on login or change-password

| Attribute | Details |
| :--- | :--- |
| Severity | Medium |
| Status | Confirmed |
| Area | Backend / Abuse resistance |
| Environment | Any |
| Affected component | `auth/login/route.ts`, `auth/change-password/route.ts` |

### Description
Neither endpoint throttles attempts, locks accounts, or backs off. Change-password requires only the current password, so it doubles as an online oracle for guessing it.

### Steps to reproduce
1. Send repeated failed logins (AUTH-07: 8 rapid attempts)
2. Send repeated change-password guesses with wrong current passwords (CPW-05 pattern, unlimited)

### Expected vs actual result
- Expected: 429s, exponential backoff, or lockout after N failures
- Actual: uniform 401s forever, no 429 observed

### Root cause hypothesis
No rate-limiting middleware or library in the stack.

### Impact
Practical online brute force of student passwords (seeded passwords are weak, e.g. `student123`), amplified by plaintext storage in BUG-003.

### Recommended fix and regression test
See [fix for BUG-013](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-013)

<a id="bug-014"></a>
## BUG-014: grades/update returns 200 with ok:true even when every row failed

| Attribute | Details |
| :--- | :--- |
| Severity | Medium |
| Status | Confirmed |
| Area | Backend / API contract |
| Environment | Any |
| Affected component | `grades/update/route.ts:185-189` |

### Description
The route always responds 200 with `ok: true` and a per-row results array. A client that checks only `res.ok` cannot distinguish "12 rows saved" from "12 rows skipped".

### Steps to reproduce
1. PATCH with a top-level `branch` (a plausible client mistake, since `grades/submit` takes top-level fields): response is `200 {"ok":true,"message":"0 updated, 1 skipped","results":[{"ok":false,...}]}`

### Expected vs actual result
- Expected: either 4xx when nothing succeeded, or a documented convention the client checks per-row
- Actual: `ok: true` regardless

### Root cause hypothesis
Per-row partial success semantics were chosen without a top-level failure signal.

### Impact
Silent data loss for clients that trust the envelope; misleading monitoring.

### Recommended fix and regression test
See [fix for BUG-014](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-014)

<a id="bug-015"></a>
## BUG-015: Repeated attendance POST silently overwrites the existing session

| Attribute | Details |
| :--- | :--- |
| Severity | Low |
| Status | Confirmed |
| Area | Backend / Data integrity |
| Environment | Local dev |
| Affected component | `attendance/route.ts:90-103` |

### Description
The POST upserts by `(branch, sectionKey, date)`. A second post for the same session replaces the records with no warning, no diff, and no history. The unique index catches only true concurrent races (409); sequential duplicates just overwrite.

### Steps to reproduce
1. POST attendance for CS 208 on 2026-09-08 with records A: 200
2. POST again for the same session with different records: 200
3. GET: records match payload 2

### Expected vs actual result
- Expected: 409 with the existing records surfaced, or an explicit "update" action with an audit note
- Actual: silent replacement

### Evidence
ATT-08, ATT-09, ATT-10. Test docs deleted during cleanup.

### Root cause hypothesis
Upsert semantics chosen for edit support without an edit-vs-create distinction.

### Impact
A misposted attendance sheet quietly erases the original. Low volume today, but attendance feeds student records.

### Recommended fix and regression test
See [fix for BUG-015](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-015)

<a id="bug-016"></a>
## BUG-016: Missing security headers and permissive build config

| Attribute | Details |
| :--- | :--- |
| Severity | Low (until deployed, then Medium) |
| Status | Confirmed |
| Area | Configuration |
| Environment | Local dev server response inspected |
| Affected component | `next.config.ts`, `Caddyfile` |

### Description
No CSP, HSTS, X-Frame-Options, X-Content-Type-Options, or Referrer-Policy on responses; `X-Powered-By: Next.js` is exposed. `typescript.ignoreBuildErrors: true` lets type errors ship. `allowedDevOrigins: ["*.space-z.ai"]` is a wildcard. The Caddyfile adds no headers and includes a query-param port-transform hop.

### Steps to reproduce
1. `curl -I http://localhost:3000/` and inspect headers

### Expected vs actual result
- Expected: baseline headers present; strict mode on; no wildcard origins in prod
- Actual: none of the listed headers present

### Root cause hypothesis
Headers were never part of the setup scripts.

### Impact
Clickjacking, MIME sniffing, and framework fingerprinting exposure once deployed; silent type errors in production builds.

### Recommended fix and regression test
See [fix for BUG-016](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-016)

<a id="bug-017"></a>
## BUG-017: createIndex calls run inside request handlers

| Attribute | Details |
| :--- | :--- |
| Severity | Low |
| Status | Code-confirmed |
| Area | Backend / Performance |
| Environment | Any |
| Affected component | `notifications/route.ts:146-147`, `announcements/read/route.ts:29`, `attendance/route.ts:91` |

### Description
Three routes call `createIndex` on the request path. MongoDB treats index creation as a no-op when the index exists, but it is still a round-tripped command per request, and on a cold collection it is a build operation triggered by user traffic.

### Steps to reproduce
Code inspection; visible in every request to those routes.

### Expected vs actual result
- Expected: indexes created by migration/seed tooling, not per request
- Actual: per-request commands

### Impact
Avoidable latency and cluster load; surprising permission requirements for the DB user.

### Recommended fix and regression test
See [fix for BUG-017](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-017)

<a id="bug-018"></a>
## BUG-018: Seed script stalls at createIndex steps on this Atlas tier

| Attribute | Details |
| :--- | :--- |
| Severity | Info |
| Status | Observed |
| Area | Tooling / Environment |
| Environment | Atlas M0 cluster, 2026-09-08 |
| Affected component | `scripts/seed-mongodb.ts:65,532,574,...` |

### Description
Two consecutive seed runs hung for minutes at a `createIndex` call (run 1 after programs, run 2 after tasks) and produced no further output until killed. A patched copy with index creation removed completed in under a minute. The index builds from the killed runs appear to have completed server-side afterwards, since the QA database now has the full index set.

### Steps to reproduce
1. Run `node --experimental-strip-types scripts/seed-mongodb.ts` against this cluster
2. Watch it stall after the tasks insert

### Expected vs actual result
- Expected: the seed finishes or fails loudly
- Actual: silent multi-minute hangs

### Root cause hypothesis
M0-tier index build queuing or throttling; the script has no timeouts or progress output around index creation.

### Impact
An interrupted seed leaves a half-populated database, and if index steps are among the skipped work, the unique constraints that currently guard duplicate usernames may be missing. Worth checking the real `aics_portal` database's index list after any seed interruption.

### Recommended fix and regression test
See [fix for BUG-018](./08_RECOMMENDATIONS_AND_FIXES.md#fix-bug-018)

