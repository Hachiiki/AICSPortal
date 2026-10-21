# Authorization enforcement map (Phase 1 audit)

Status: phase 1 of the 5-phase authorization review (audit only, no code changed).
Branch: `main-full-dev`. Date: 2026-10-21. Source: full read of every `/api` route,
`src/proxy.ts`, `src/lib/session.ts`, `src/lib/session-auth.ts`, `src/lib/http.ts`,
`src/lib/validation.ts`, `src/lib/mongodb/queries.ts`, `src/lib/mongodb/types.ts`,
`src/app/page.tsx`, `src/lib/aics/use-portal-route.ts`, `src/lib/aics/nav-config.ts`,
plus the supporting Cloudinary and moderation modules.

This file is the durable record of what the audit confirmed. The Phase 2 design
(`docs/authz/phase-2-design.md`) builds on it; the Phase 3 plan will cite its
findings by ID.

## 1. Identity model

- Roles: `student`, `faculty`, `admin` (`Role` union, `src/lib/mongodb/types.ts:10`).
  All three live in the `students` collection, distinguished by `role`.
- Session: JWT (jose HS256) in the `aics_session` httpOnly cookie, 8 h (7 days with
  remember-me). Claims: `{ username, role, branch, tv }` (`src/lib/session.ts:18`).
- Revocation: `getAuthedSession` re-checks `tv` against the DB `tokenVersion` on every
  authed route call (`src/lib/session-auth.ts:17`). Logout and password change bump it.
  Role changes do NOT bump it (no route mutates `role`), so a demoted user keeps their
  old claim until expiry or logout.
- Tenant: `branch` on every doc; every read filters `{branch, ...}` (ADR-0001).

## 2. Enforcement layers

| Layer | Mechanism | Notes |
| --- | --- | --- |
| Edge proxy | `src/proxy.ts` | Rate-limit tiers before the session gate; 401 for sessionless `/api` (except `PUBLIC_API`: login, demo, session); `/portal` bounces anonymous users to `/`. |
| Route handler | per-route | `getAuthedSession` (aliased as `getSession` in every route), then ad-hoc role/branch/spoof/relationship checks. ~30 hand-written variants. |
| Query filter | per-route | Ownership keys (`username`, `studentUsername`, `branch`, `professor`) inside Mongo filters. Ownership-inside-the-update-filter pattern in task submit (`queries.ts:86`) and materials delete. |
| Client | `src/app/page.tsx` | URLs are display-only; data always fetched under the session identity; nav is role-keyed (`nav-config.ts`). UX only, correctly treated as non-security. |

## 3. Relationship model (the ABAC inputs that already exist)

| Relationship | How it is derived today | Sites |
| --- | --- | --- |
| Faculty teaches subject | `subjects.professor === faculty.fullName` + same branch + faculty's current AY/semester | `/api/faculty`, `/api/faculty/tasks`, `/api/faculty/history`, `requireTeachingFaculty` (`src/app/api/tasks/route.ts:120`), `/api/grades/update` per-row, `/api/notifications` POST |
| Student enrolled in subject | one `subjects` doc per `studentUsername` x `code` x term | student surface reads, task fan-out |
| Section membership | `students.section` is the source of truth (ADR-0005); roster groups by `code\|academicYear\|semester` | notifications `sectionKey`, attendance |
| Grade visibility | per-period `*Status === 'released'` gates student reads (ADR-0002) | `/api/student`, `/api/faculty/history` |
| Same branch | `session.branch`/DB `branch` equality | nearly every route |

## 4. Route-by-route matrix

Auth fn in every row is `getAuthedSession` (revocation-aware) unless noted.
"DB role" = the route re-fetches the user doc and checks its `role` field.
"JWT role" = the route trusts the token claim (stale-role edge, see M2).

### Auth

| Route | Gate | Scoping | Notes |
| --- | --- | --- | --- |
| POST `/api/auth/login` | public; proxy auth tier + failure throttle | `findOne({username})`; role/branch/tv from DB | role not validated against the `Role` union (L3) |
| POST `/api/auth/demo` | `NODE_ENV !== 'development'` -> 404 | fixed `juan.santos` | env signal differs from `env.ts` APP_ENV matrix (L5) |
| GET `/api/auth/session` | revocation-aware despite public proxy entry | self claims | clean |
| POST `/api/auth/logout` | signature-only verify (proxy already gated) | bumps own `tv` | bump is best-effort |
| POST `/api/auth/change-password` | self-only equality gate + old-password verify + `tv` bump | `{username}` = session | clean |

### Student surface

| Route | Gate | Scoping | Notes |
| --- | --- | --- | --- |
| GET `/api/student` | self OR same-branch faculty/admin (JWT role, `route.ts:24`) | `{username}` + post-lookup branch gate | 404 fires before the 403 gate -> username existence oracle (L1); staff read exposes full PII (D2) |
| GET `/api/student/export` | self-only | session-substituted keys everywhere; unreleased grades masked | cleanest route audited |
| PATCH `/api/student/update` | self OR admin (JWT role) + branch pre-check | write filter `{username}` | moderation on profile fields |
| POST/DELETE `/api/student/photo` | self | `{username, branch}` + session-built Cloudinary folder | clean |
| POST `/api/student/photo/cleanup` | folder-prefix containment from session values | own subtree only | clean |
| GET `/api/tasks` | self OR same-branch staff (JWT role) | `{studentUsername, branch, term.*}` | L1 oracle pattern |
| POST `/api/tasks` | faculty only (DB role) + `requireTeachingFaculty` + spoofCheck | fan-out derived from teaching load | term stamped from the faculty doc, not the subject doc |
| PATCH `/api/tasks` | faculty only + `requireTeachingFaculty` + spoofCheck | `{branch, subjectCode, title, term.*}` | keyed by client `title` |
| PATCH `/api/tasks/[taskId]/submit` | ownership inside the atomic update filter | `{_id, studentUsername, submitted:false, submissionsClosed:{$ne:true}}` | strongest pattern in the repo |
| PATCH `/api/tasks/[taskId]/grade` | faculty only + `requireTeachingFaculty` on `task.subjectCode` + branch | write re-asserts `{_id, branch}` | past-term tasks gradeable under a current-term load; feedback unmoderated; no audit trail (decision #32, D6) |
| GET `/api/enrollment` | self-only (staff denied by design) | `{studentUsername, branch, term}` | financial data, clean |
| GET `/api/attendance` | faculty/admin (DB role) | `{branch, sectionKey}` client-supplied | NO teaching/section ownership check (H2) |
| POST `/api/attendance` | faculty only (DB role) + spoofCheck + branch parity | `{branch, sectionKey, date}` upsert | NO section ownership; `records` keys not roster-validated (H2); branch mismatch returns 400 not 403 (L2) |

### Faculty and grades

| Route | Gate | Scoping | Notes |
| --- | --- | --- | --- |
| GET `/api/faculty` | faculty/admin (DB role), self username | `{branch, professor: fullName}` | roster projection includes email/phone/gpa (D2) |
| GET `/api/faculty/tasks` | faculty/admin (DB role) | server-derived subject codes + current term | clean |
| GET `/api/faculty/tasks/submissions` | faculty ONLY (DB role) + `requireTeachingFaculty` + branch | `{branch, subjectCode}` + task filters | strongest faculty route |
| GET `/api/faculty/history` | faculty/admin (DB role) | `{branch, professor: fullName}`, released-only rows | discloses current holder names for past codes |
| POST `/api/grades/submit` | faculty only (DB role) + spoofCheck + branch parity | `{branch, code: subjectCode}` | **NO teaching-load check: any same-branch faculty can submit any subject's grades (C1)** |
| PATCH `/api/grades/update` | faculty only (DB role) + branch parity | per-row `{studentUsername, branch, code, term}` | per-row professor check is skipped when `performer.fullName` is falsy (H1b); **no status guard: edits reset submitted/released periods to draft (H1a)**; 207 partial-success envelope |
| GET/POST `/api/grades/release` | admin only (DB role, both methods) + branch parity | GET queue `{branch}`; POST `{branch, code, term}` | partial-period release flips legacy `gradeStatus` -> premature `finalGrade`/`remarks` exposure (A5) |
| GET `/api/grades/audits` | faculty/admin (JWT role) | `{branch}` + optional subject/student filters | **no teaching-load scoping: any same-branch faculty reads the whole branch's grade-change history (M1)** |

### Materials

| Route | Gate | Scoping | Notes |
| --- | --- | --- | --- |
| GET `/api/materials` | student (enrolled) / faculty (load); admin excluded | `{branch, studentUsername}` or `{branch, subjectCode: {$in: load}}` | clean |
| POST `/api/materials` | faculty + `requireTeachingFaculty` + moderation | insert branch from session | file record fields are client-asserted; URL check is prefix-only, not folder-scoped (M4) |
| POST `/api/materials/sign` | faculty + `requireTeachingFaculty` | server-built sanitized folder | apiSecret never leaves the server; signature binds folder+timestamp |
| DELETE `/api/materials/[id]` | faculty via `requireTeachingFaculty` on `doc.subjectCode` | delete re-asserts `{_id, branch}` | delete is by teaching load, not uploader; no admin path; current-term check strands past-term materials (D3) |

### Admin

| Route | Gate | Scoping | Notes |
| --- | --- | --- | --- |
| GET `/api/admin/people` | admin (DB role) | `find({})` school-wide read | documented product decision (D1) |
| GET `/api/admin/stats` | admin (DB role) | all collections `{}` | school-wide incl. finances (D1) |
| GET `/api/admin/enrollment` | admin (DB role) | `find({})` school-wide read (D1) | PATCH/POST writes are branch-scoped (`existing.branch !== performer.branch` -> 403); payments stamped `postedBy: session.username` |

### Announcements, notifications, shared reads

| Route | Gate | Scoping | Notes |
| --- | --- | --- | --- |
| `/api/announcements` GET/POST/PATCH/DELETE | reads any authed; writes admin (DB role) + branch filter + spoofCheck + moderation | write filters carry `branch: performer.branch` | clean |
| POST `/api/announcements/bulk-delete` | admin (DB role) | `{_id: {$in}, branch}` | ids capped at 200, 24-hex validated |
| `/api/announcements/read` POST/DELETE | self-only | `{branch, username, announcementId}` | `ids[]` array unbounded (L4) |
| GET `/api/notifications` | self OR staff (JWT role) | `{branch, studentUsername}` + branch guard | any same-branch faculty reads any student inbox (D2); JWT role (M2) |
| POST `/api/notifications` | faculty only (DB role) + spoofCheck + branch + section ownership filter (`professor: fullName`) | unowned `sectionKeys` silently dropped | fullName join (A1) |
| PATCH `/api/notifications` | self-only | `{branch, studentUsername}` | clean |
| GET `/api/notifications/sent` | faculty/admin (DB role) + own outbox only | `{branch, fromUsername, createdAt >= cutoff}` | clean |
| GET/POST `/api/notifications/cleanup` | admin (JWT role) OR `Bearer CRON_SECRET` | `deleteMany({createdAt < cutoff})` global | **cron path unreachable: the proxy 401s cookie-less requests before the Bearer branch runs (M3)**; secret compare not timing-safe |
| `/api/events`, `/api/professors` | reads any authed self-only; writes admin (DB role) | every write filter carries `branch: performer.branch` | clean |

## 5. Findings register

Confirmed vulnerabilities (behavior bugs, fix candidates for Phase 3/4):

| ID | Severity | Finding | Evidence |
| --- | --- | --- | --- |
| C1 | Critical | Any same-branch faculty can submit another professor's subject grades (draft -> submitted, enters the admin release queue) | `src/app/api/grades/submit/route.ts:58` query is `{branch, code}`; no `requireTeachingFaculty`, no `professor` key |
| H1a | High | Faculty can edit submitted or released grades; the edit silently resets the period to draft, hiding it from students; resubmit + re-release completes a tamper loop around the approval chain | `src/app/api/grades/update/route.ts:172-189` unconditional status reset |
| H1b | High | The per-row professor-of-record check is skipped entirely when `performer.fullName` is falsy | `src/app/api/grades/update/route.ts:125-127` (`performerName &&` guard) |
| H2 | High | Any same-branch faculty can read and overwrite attendance for ANY section (including other faculties'); `records` keys are not validated against the enrolled roster | `src/app/api/attendance/route.ts:78,133-158` |
| M1 | Medium | Any same-branch faculty can enumerate the entire branch's grade-change audit history (other professors' students, old/new values) | `src/app/api/grades/audits/route.ts:29-30,45-47` |
| M2 | Medium | Four gates trust the JWT `role` claim instead of the DB role (student, tasks GET, notifications GET staff path, notifications cleanup); a demoted user keeps powers until token expiry (up to 7 days) | `student/route.ts:25`, `tasks/route.ts:32`, `notifications/route.ts:86`, `notifications/cleanup/route.ts:56` |
| M3 | Medium | The cron cleanup route's `Bearer CRON_SECRET` path is dead code behind the proxy 401; scheduled retention silently no-ops | `src/proxy.ts:56-58` vs `notifications/cleanup/route.ts:50-53` |
| M4 | Medium | Material file records are client-asserted; the URL check is cloud-prefix-only, so any asset in the Cloudinary cloud can be attached to a material | `src/app/api/materials/route.ts:185-203` |
| L1 | Low | Username existence oracle: 404 returns before the 403 authorization gate | `student/route.ts:22`, `tasks/route.ts:29` |
| L2 | Low | Attendance branch mismatch returns 400 where every sibling returns 403 | `attendance/route.ts:120` |
| L3 | Low | Login signs whatever string the DB `role` field holds; no `Role` union validation | `auth/login/route.ts:64` |
| L4 | Low | `announcements/read` accepts an unbounded `ids[]` array (junk-marker upserts) | `announcements/read/route.ts:16` |
| L5 | Low | Demo login gates on `NODE_ENV` while the rest of the env matrix uses `APP_ENV`/`VERCEL_ENV` (`src/lib/env.ts`) | `auth/demo/route.ts:9-11` |
| L6 | Low | In-memory throttles key on the first `x-forwarded-for` hop (rotatable on self-hosted deploys only) | `rate-limit.ts:88-90` |

Architectural hazards (structural risks, not confirmed exploits):

| ID | Hazard | Why it matters |
| --- | --- | --- |
| A1 | Faculty identity is a display-name string (`subjects.professor === faculty.fullName`) at 6+ enforcement sites | A duplicate or renamed `fullName` silently transfers a teaching load between faculty; renames break loads |
| A2 | The shared guard `requireTeachingFaculty` lives inside `src/app/api/tasks/route.ts` and is imported by 5 other route files | A route file exporting cross-cutting security logic; import cycles, unclear ownership, easy to bypass by forgetting the import (exactly what C1 shows) |
| A3 | No shared deny taxonomy: 401/403/404/400/207 semantics are decided per route | Inconsistent client handling (L2 is one instance); makes the route matrix hard to reason about |
| A4 | Role + branch + spoof checks are re-implemented ~30 times with visible drift (M2 is the drift already surfaced) | Every new route is a fresh chance to forget one; the drift will keep growing |
| A5 | Grade status duality: per-period statuses are the rule (ADR-0002) but legacy `gradeStatus` still gates student `finalGrade`/`remarks` visibility | Releasing one period flips `gradeStatus` and prematurely exposes the final grade |
| A6 | Task grading leaves no actor trail (documented decision #32) | Score changes have no audit record; revisit is an owner decision, not an automatic fix |
| A7 | Rate limiter is in-memory per instance | Documented BUG-013 caveat; out of scope for this review beyond noting it |

## 6. Product decisions to confirm (current behavior, owner sign-off needed before changing)

| ID | Current behavior | Question |
| --- | --- | --- |
| D1 | Admin reads are school-wide (`people`, `stats`, `enrollment` GET); admin writes are branch-scoped | Confirm "every branch admin is a school-wide reader" is intended |
| D2 | Same-branch staff can read any student's full profile/inbox (roster drawer and bell inbox) | Confirm the PII breadth (email, phone, gpa, emergency contacts) |
| D3 | Material deletes are by teaching load (not uploader); no admin path; current-term check strands past-term materials | Pick the ownership rule: uploader, subject co-management, or admin override |
| D4 | Attendance is writable by any same-branch faculty for any section | Confirm the intended scope (see H2) |
| D5 | Faculty can edit grades after submit/release (resets to draft) | Confirm the intended workflow rule (see H1a) |
| D6 | Task scores write no `grade_audits` rows (decision #32) | Revisit only if the owner wants score history |

## 7. GitHub issue map (2026-10-21)

Every finding is filed as one GitHub issue (title prefix `authz <ID>:`), each
with a local `issue/<number>-<id>` branch on this worktree. Dispositions carry
the owner sign-off from `phase-3-plan.md` section 9.1 (commit ff37873).

| Finding | Issue | Branch | Disposition |
| --- | --- | --- | --- |
| C1 | #57 | issue/57-c1 | fix approved (C3.1) |
| H1a (+D5) | #58 | issue/58-h1a | fix approved with condition (C3.3) |
| H1b | #59 | issue/59-h1b | fix approved (C3.2) |
| H2 (+D4) | #60 | issue/60-h2 | fix approved (C3.4) |
| M1 | #61 | issue/61-m1 | fix approved (C3.5) |
| M2 | #62 | issue/62-m2 | fix approved (rides C2.1/C2.2/C2.4) |
| M3 | #63 | issue/63-m3 | fix approved with condition (C3.6) |
| M4 | #64 | issue/64-m4 | fix approved (C3.7) |
| L1 | #65 | issue/65-l1 | fix approved (C3.8) |
| L2 | #66 | issue/66-l2 | fix approved (C3.9) |
| L3 | #67 | issue/67-l3 | fix approved (C3.10) |
| L4 | #68 | issue/68-l4 | fix approved (C3.11) |
| L5 | #69 | issue/69-l5 | fix approved (C3.12) |
| A5 | #70 | issue/70-a5 | fix approved (C3.13) |
| L6 | #71 | issue/71-l6 | backlog (accepted) |
| A1 | #72 | issue/72-a1 | deferred (migration OUT this pass) |
| A2 | #73 | issue/73-a2 | resolved by centralization (C4.1) |
| A3 | #74 | issue/74-a3 | resolved by centralization (stage 1) |
| A4 | #75 | issue/75-a4 | resolved by centralization (stage 2) |
| A6 (+D6) | #76 | issue/76-a6 | confirmed keep (closed) |
| A7 | #77 | issue/77-a7 | backlog (accepted) |
| D1 | #78 | issue/78-d1 | confirmed intended (closed) |
| D2 | #79 | issue/79-d2 | UNRESOLVED policy question (open) |
| D3 | #80 | issue/80-d3 | confirmed intended (closed) |

D4 and D5 are folded into the H2 and H1a issues (same product question); D6 is
folded into A6. Issue branches start at the sign-off commit and are fast
forwarded to the commit that closes each finding as fixes land.
