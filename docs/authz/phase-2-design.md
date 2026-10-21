# Phase 2: centralized authorization design

Status: design phase of the 5-phase authorization review. No code changed in this
phase. Precedes: `docs/authz/enforcement-map.md` (Phase 1 audit, findings cited as
C1/H1/M1/A1/D1 and so on). Follows: the Phase 3 implementation plan (separate
document, owner approval required before any Phase 4 implementation).

Goal restated from the brief: move authorization rules that are currently spread
across route handlers into one centralized, policy-driven module. Use ABAC where
contextual rules carry real weight (faculty assignment, enrollment, grade status,
branch tenancy). Keep plain RBAC where a role check is the whole rule. No external
policy engine, no database-managed permission matrix, no new roles. Nothing widens
access. Every behavior change is listed in section 10 and requires sign-off.

## 1. Design goals and hard constraints

Goals:

1. One source of truth for every allow/deny decision, strong-typed in TypeScript.
2. Service-layer enforcement: every protected operation is checked server-side
   before data is returned or mutated. The frontend consumes the same model for
   display decisions only.
3. Query alignment: the same policy definitions that answer "may this actor touch
   this resource" also produce the Mongo filter fragments that scope reads and
   writes. Guards and queries cannot drift apart because they read one definition.
4. Auditability: one deny taxonomy with stable codes and HTTP statuses, so the
   verify scripts can assert exact outcomes.

Hard constraints (from CLAUDE.md and the review brief, non-negotiable):

- Branch filter on every Mongo read and write (ADR-0001, guardrail 1).
- Grade writes: faculty for update/submit, admin for release, same branch,
  `grade_audits` row on every save/submit/release (ADR-0006, guardrails 2 and 7).
- Per-period statuses only for new logic (ADR-0002, guardrail 3).
- Student visibility gates each period on `released` (guardrail 6).
- Existing session machinery is untouched: JWT claims shape, cookie flags, 8 h and
  remember-me lifetimes, `tokenVersion` revocation, proxy `PUBLIC_API` set, rate
  tiers, login/logout/change-password flows, scrypt + legacy upgrade.
- Roles stay `student | faculty | admin`. No dynamic roles, no permission matrix in
  the database, no runtime-editable policy. Permissions are static code.
- Nothing in this design broadens access. Where a fix tightens behavior, it is a
  row in section 10 awaiting sign-off, not a silent change.
- Dev artifacts stay on `main-full-dev`; the production whitelist governs what can
  ever reach `main` (CLAUDE.md 6a).

## 2. Current state in brief

The full route-by-route matrix lives in `docs/authz/enforcement-map.md`. The shape
that matters for this design:

- Enforcement is real but hand-rolled: every route re-implements session check,
  performer fetch, role check, branch parity, spoof check, and (sometimes) a
  relationship check. About 30 variants, already drifting: four routes trust the
  JWT role claim while the rest re-fetch the DB role (M2).
- The strongest existing patterns are exactly what this design generalizes:
  ownership keys inside the atomic update filter (task submit, materials delete),
  the DB-fresh performer fetch (attendance, admin routes), and the teaching-load
  guard `requireTeachingFaculty` (which itself lives inside a route file, A2).
- The confirmed vulnerabilities (C1, H1, M1 through M4) are all cases where a
  check that exists elsewhere in the codebase was not applied on one route. That
  is the failure mode a centralized module eliminates.
- The database is MongoDB Atlas via the native driver. There is no RLS, so the
   application layer IS the row-level boundary. Tenant and ownership keys must
  travel inside the Mongo filter, never be applied after the fetch.

## 3. Target architecture

### 3.1 Request lifecycle (after the design lands)

```
client
  |
  v
src/proxy.ts                 unchanged: rate tier -> signature gate (401) -> PUBLIC_API passthrough
  |
  v
route handler                1. Zod parse of query/body (unchanged, src/lib/validation.ts)
  |                          2. az = await requireCan(request, resource, action)
  |                             one line. 401/403/404 HttpError on deny, standard envelope.
  |                          3. business logic, with az.scope.* filter fragments
  |                          4. writes re-assert ownership keys in update/delete filters
  v
src/lib/mongodb/queries.ts   unchanged thin data access; new functions take filters as parameters
```

The policy module sits between the route and the data access. Routes stay thin
parse-then-act shells. There is no separate service tier in this codebase and the
design does not invent one: `requireCan` plus scope fragments IS the service-layer
boundary, invoked at the top of every handler before any data leaves.

### 3.2 Module layout

```
src/lib/authz/
  types.ts        resource descriptors, actions, decisions, deny codes
  context.ts      resolveContext(request): session -> DB actor doc -> AuthzContext
  relations.ts    attribute resolvers over Mongo (teaches, enrolled, grade row state)
  policies.ts     the decision table: can(ctx, rel, resource, action) -> AuthzDecision
  guards.ts       requireCan / requireRole route sugar, HttpError mapping, spoof check
  scopes.ts       filter-fragment builders derived from the same relations
  permissions.ts  client-safe permission IDs only (no server imports) for nav/UI
  index.ts        public surface re-exports
```

Server-only by construction: everything except `permissions.ts` imports
`src/lib/mongodb/connection.ts` and `src/lib/session-auth.ts`.

## 4. The policy module

### 4.1 Types (`types.ts`)

Resources are tagged unions so the policy switch gets compile-time exhaustiveness
(a missed case fails `tsc`, and CI already runs typecheck):

```ts
export type TermKey = { academicYear: string; semester: string }
export type Period = 'prelim' | 'midterm' | 'finals'

export type AuthzResource =
  | { kind: 'student.profile'; username: string }
  | { kind: 'student.finances'; username: string }          // enrollment record
  | { kind: 'grade.row'; studentUsername: string; subjectCode: string; term: TermKey }
  | { kind: 'grade.period'; ...same as grade.row; period: Period }
  | { kind: 'grade.releaseQueue' }
  | { kind: 'grade.audits'; subjectCode?: string; studentUsername?: string }
  | { kind: 'task'; taskId: string }
  | { kind: 'task.section'; subjectCode: string; term: TermKey }
  | { kind: 'attendance'; sectionKey: string }
  | { kind: 'material.list' }
  | { kind: 'material'; id: string }
  | { kind: 'material.upload'; subjectCode: string; term: TermKey }
  | { kind: 'announcement'; id?: string }
  | { kind: 'announcement.reads' }
  | { kind: 'notification.inbox'; username: string }
  | { kind: 'notification.send'; sectionKeys: string[] }
  | { kind: 'admin.directory' } | { kind: 'admin.stats' }
  | { kind: 'admin.enrollment'; id: string }
  | { kind: 'branch.calendar' } | { kind: 'branch.directory' }
  | { kind: 'account.password' } | { kind: 'account.photo'; username: string }

export type Action =
  | 'read' | 'create' | 'update' | 'delete' | 'submit' | 'release'
  | 'grade' | 'send' | 'markRead' | 'close' | 'signUpload' | 'cleanup'
```

Decisions carry a deny code, an HTTP status, and a user-facing message (the
existing `{ ok: false, error }` envelope is kept, so no client changes):

```ts
export type DenyCode =
  | 'unauthenticated'   // 401
  | 'role'              // 403  wrong role for the action
  | 'branch'            // 403  cross-branch
  | 'spoof'             // 403  claimed identity != session identity
  | 'notAssigned'       // 403  faculty does not teach the subject/section
  | 'notEnrolled'       // 404  student is not enrolled (masked)
  | 'notOwner'          // 403  resource belongs to another user
  | 'notFound'          // 404  existence would leak (after the authz gate)
  | 'state'             // 403  invalid grade-status transition

export type AuthzDecision =
  | { ok: true }
  | { ok: false; code: DenyCode; status: 401 | 403 | 404; error: string }
```

This single taxonomy retires hazard A3. Every route returns one of these shapes;
the verify scripts assert code plus status per scenario.

### 4.2 Context (`context.ts`)

One canonical actor resolution replaces the ~26 scattered performer fetches and
fixes the M2 stale-role class by construction:

```ts
export interface AuthzActor {
  username: string
  role: Role            // from the DB doc, never the JWT claim
  branch: Branch
  fullName: string
  academicYear: string  // current term fields, already on the students doc
  semester: string
  yearLevel: string
  section: string
}

export interface AuthzContext {
  actor: AuthzActor
  claims: SessionClaims   // advisory: display name, spoof comparisons, tv already verified
}

export async function resolveContext(request: NextRequest): Promise<AuthzContext | null>
```

`resolveContext` runs `getAuthedSession` (revocation-aware, unchanged) then one
`findOne` on `students` with a projection of the ten actor fields. The four routes
that currently trust the JWT role pay one extra query; the rest replace an
identical fetch they already perform. The JWT `role` claim becomes advisory
everywhere, exactly like the client localStorage role already is
(CONTEXT.md: "display state only").

### 4.3 Relations (`relations.ts`)

The ABAC attribute resolvers. These absorb every current derivation of "teaches",
"is enrolled", "same section" so each relationship is computed in exactly one
place (retiring the six copies of `professor === fullName`):

```ts
export interface Relations {
  teachesSubject(code: string, term?: TermKey): Promise<boolean>   // term defaults to actor's current
  teachesSection(sectionKey: string): Promise<boolean>             // section roster intersects the load
  isEnrolled(studentUsername: string, code: string, term?: TermKey): Promise<boolean>
  gradeRowState(ref: { studentUsername; subjectCode; term }): Promise<{
    professor: string; branch: string
    statuses: { prelim: GradePeriodStatus; midterm: GradePeriodStatus; finals: GradePeriodStatus }
  } | null>
}
```

Today `teachesSubject` is `subjects.find({ branch, professor: actor.fullName, code })`
plus the actor's current term, i.e. the logic inside `requireTeachingFaculty`
(`src/app/api/tasks/route.ts:120-145`) which moves here unchanged in behavior.
After the A1 migration (section 8) the same function reads `professorUsername`
first with a name fallback. Callers never know which key matched.

Lookups are memoized per request via the guard object, so a route that checks the
same subject twice (guard, then scope build) costs one query, not two.

### 4.4 Policies (`policies.ts`)

The decision table. Pure logic over resolved attributes; database access happens
only through the injected `Relations`, which is what makes the table unit-testable
with fakes:

```ts
export async function can(
  ctx: AuthzContext,
  rel: Relations,
  resource: AuthzResource,
  action: Action
): Promise<AuthzDecision>
```

Where the RBAC/ABAC split lands, concretely:

- Plain role rules (RBAC, no relations needed): admin-only writes on
  `announcement`, `branch.calendar`, `branch.directory`, `admin.*`,
  `grade.releaseQueue`; faculty-only writes on `grade.*`, `task.section`,
  `attendance`, `notification.send`, `material.upload`; any-authed reads on
  branch calendars and directories; self-service on `account.*`.
- Contextual rules (ABAC, relations required): branch parity on every cross-user
  resource; `teachesSubject`/`teachesSection` for faculty actions on
  `grade.row`, `grade.period`, `task.section`, `attendance`, `material.upload`,
  `notification.send`; `isEnrolled` for student reads of materials and task
  sections; self-ownership (`notOwner`) for profiles, inboxes, finances, reads;
  the grade-status state machine on `grade.period` `update`/`submit`/`release`
  (draft -> submitted -> released, transitions only forward except the signed-off
  withdrawal path, see section 10 FIX-H1a).

Two examples of the table's shape (the real file is exhaustive switches, one case
per resource kind):

```ts
// grade.period submit: faculty, same branch, teaches the subject, rows must be draft
case 'grade.period': {
  if (action === 'submit') {
    if (ctx.actor.role !== 'faculty') return deny('role', 403, 'Unauthorized: faculty only.')
    const st = await rel.gradeRowState(ref)
    if (!st) return deny('notFound', 404, 'No enrollment found.')
    if (st.branch !== ctx.actor.branch) return deny('branch', 403, 'Branch mismatch.')
    if (!(await rel.teachesSubject(ref.subjectCode, ref.term)))
      return deny('notAssigned', 403, 'Subject is not in your teaching load.')
    return allow()
  }
  ...
}

// student.profile read: self, or same-branch staff, with the gate BEFORE any 404
case 'student.profile': {
  if (action !== 'read') return deny('role', 403, 'Not supported.')
  if (resource.username === ctx.actor.username) return allow()
  const staff = ctx.actor.role === 'faculty' || ctx.actor.role === 'admin'
  if (!staff) return deny('notOwner', 403, 'Forbidden.')
  if (!(await rel.sameBranchUsername(resource.username)))
    return deny('notFound', 404, 'No student found.')   // masked, fixes L1
  return allow()
}
```

Note the second case: authorization precedes existence. The L1 username oracle
dies because unknown usernames now answer 404 only after the actor clears the
staff-and-branch gate, and non-staff callers cannot distinguish 403-because-not-
yours from 404-because-absent for arbitrary names.

### 4.5 Guards (`guards.ts`)

Route sugar. One import, one line per handler:

```ts
export interface Guarded {
  ctx: AuthzContext
  rel: Relations
  scope: AuthzScopes            // section 6
}

export async function requireCan(
  request: NextRequest,
  resource: AuthzResource,
  action: Action
): Promise<Guarded>             // throws HttpError(status, error) on deny
```

`requireCan` internally: `resolveContext` (401 when null, message unchanged),
`spoofCheck(claims, claimedIdentity)` for the legacy `username`/`performedBy`
body fields (the existing helper from `src/lib/session.ts:84`, semantics
preserved), then `can()`, then the `HttpError` throw with the decision's status
and message. `requireRole(request, 'admin')` remains available for the handful of
surfaces where role alone is the whole rule, and is what the admin CRUD routes
use. The exported surface replaces `requireTeachingFaculty`, which is deleted
from `src/app/api/tasks/route.ts` in the same swap commit (A2 retired).

### 4.6 Frontend mirror (`permissions.ts`)

A client-safe module of permission IDs only, no server imports, no policy logic:

```ts
export const PERMISSIONS = {
  viewReleaseQueue: 'grade.releaseQueue.read',
  manageAnnouncements: 'announcement.create',
  encodeGrades: 'grade.period.update',
  postTasks: 'task.section.create',
  // ...
} as const
export type PermissionId = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]
```

`nav-config.ts` items gain an optional `permission?: PermissionId`. The nav filter
checks IDs against a role-to-permission map that mirrors the server table for
display purposes only. Nothing security-relevant is decided here, which is the
existing, correct architecture (URLs display-only, data under session identity,
`src/app/page.tsx:76-82`). `RoleGate.tsx` is stale (its own header says the
faculty and admin portals do not exist; they ship) and is retired during the
Phase 4 swap of the client surface after a usage check.

## 5. Route enforcement, before and after

`/api/grades/submit` is the worked example because it carries the critical
finding. Today (`src/app/api/grades/submit/route.ts`): session check, spoof
check, performer fetch, role check, branch parity, about 20 lines, and then a
write query of `{ branch, code: subjectCode }` with no teaching-load key (C1).

After the swap:

```ts
export async function POST(request: NextRequest) {
  const body = submitSchema.parse(await request.json().catch(() => ({})))
  const { subjectCode, academicYear, semester, period } = body

  const az = await requireCan(request, {
    kind: 'grade.period', studentUsername: '*', subjectCode,
    term: { academicYear: academicYear ?? az.actor.academicYear, ... },
    period,
  }, 'submit')

  const query = {
    ...az.scope.subjectRows(subjectCode, term),   // { branch, code, professor }
    ...(period ? { [`${period}Status`]: 'draft' } : { ...draftStates }),
  }
  const result = await col.updateMany(query, { $set: submittedSets })
  // audit insert unchanged, performedBy: az.ctx.actor.username
}
```

The C1 fix falls out of the scope fragment: `subjectRows` always carries the
professor-of-record key, so another faculty's rows simply do not match. The
behavior change (cross-faculty submits now 403) is FIX-C1 in section 10, gated
on sign-off, delivered as its own commit after the mechanical swap is proven.

Three rules govern every swap commit:

1. Equivalence first. A swap commit changes who writes the decision, not the
   decision. Old inline checks are deleted only in the same commit where the
   guard demonstrably covers them, with a mapping table in the commit message
   (old check line -> policy case).
2. Status and message compatibility. Where a route's current denial differs from
   the taxonomy (attendance's 400 branch mismatch, L2), the swap preserves the
   current behavior and the normalization ships later as its own FIX commit.
3. Business logic does not move. Zod schemas, moderation calls, audit inserts,
   fan-out loops, and response shapes stay in the route. Only the decision moves.

## 6. Query alignment and database integration

### 6.1 Scope fragments (`scopes.ts`)

Filter builders share the relation definitions with the policies, so "what you
may touch" and "what the query returns" are one statement:

```ts
export interface AuthzScopes {
  ownStudentRows(): { branch: Branch; studentUsername: string }
  teachingLoad(term?: TermKey): { branch: Branch; professor: string }
  subjectRows(code: string, term?: TermKey): { branch: Branch; code: string; professor: string }
  branchDocs(): { branch: Branch }
}
```

`teachingLoad` is `teachesSubject`'s filter form; both come from the one relation
definition. This is the structural answer to the brief's requirement that query
constraints derive from the same policy source instead of being re-implemented
per route. The repo already filters in-query everywhere (the Phase 1 audit found
no fetch-then-filter-in-memory pattern on any protected surface), so the design's
job here is consolidation and gap-closing, not a paradigm change: the three gaps
where ownership keys are missing from write queries are exactly C1
(`grades/submit`), H2 (`attendance`), and M1 (`grades/audits`).

### 6.2 No RLS: the application layer is the boundary

The stack is MongoDB Atlas with the native driver, so there is no row-level
security to review or align with (the brief's Supabase/RLS clause does not
apply). Consequences the design makes explicit:

- Every protected read and write MUST carry tenant and ownership keys inside the
  Mongo filter. This is already CLAUDE.md guardrail 1 ("missing branch filter =
  bug"); the scope fragments make it mechanical.
- Writes re-assert ownership in the update/delete filter even when a pre-check
  ran, generalizing the pattern the repo already trusts (`submitTask`
  `queries.ts:86-93`, materials delete `route.ts:61`). TOCTOU windows close for
  free.
- Privileged credentials stay server-side by construction and are re-verified in
  Phase 5: `MONGODB_URI`, `AUTH_SECRET`, and `CLOUDINARY_API_SECRET` are read
  only in `src/lib/env.ts`, `src/lib/mongodb/connection.ts`, and
  `src/app/api/materials/cloudinary.ts`; none are `NEXT_PUBLIC_`, none are
  returned by any route (the sign route returns only public identifiers plus the
  folder-bound signature, `materials/sign/route.ts:50-59`). The audit found no
  path where a client obtains a server credential.
- One deliberate non-goal: separate Mongo database users per role. Everything
  runs under the single app credential; the boundary is the shared policy layer,
  which is the standard trade for a single-tenant-per-branch Atlas deployment.

### 6.3 Grade visibility stays a projection concern

The released-only gate (guardrail 6) remains where it is: the student route's
projection (`/api/student/route.ts:54-66`) and `/api/student/export`'s masking.
The policy layer owns who may call the route; the projection owns what a
student sees of their own rows. Encoding both in one place would couple the
policy module to response shaping for no enforcement gain. The A5 inconsistency
(final grade visibility keyed on legacy `gradeStatus`) is handled as FIX-A5 in
section 10, in the projection, not the policy.

## 7. What stays untouched

The compatibility inventory. Phase 5 verification walks this list:

- Session issuance and claims shape, cookie attributes, lifetimes, revocation
  counter, proxy `PUBLIC_API`, rate tiers and their ordering.
- Login, logout, change-password, demo login flows, including their throttles.
- The role set, the branch tenancy model, and every collection schema except
  the optional `professorUsername` addition (section 8).
- Admin school-wide reads (D1) and staff student-profile reads (D2) pending
  sign-off; until then they behave exactly as today.
- Moderation pipeline position (guard, then moderate, then write) and
  `moderation_logs` actor stamping.
- `grade_audits` schema and write points; the decision that task scores write no
  audit rows (D6) stands unless the owner reopens it.
- Response envelopes (`{ ok, ... }`), the 207 partial-success convention on
  `grades/update` row batches, and all success-path response shapes.
- The client architecture: display-only URLs, session-driven data fetching,
  localStorage display state, nav structure.

## 8. Faculty identity migration (hazard A1)

The single structural change in scope, and it is optional until the owner
approves it: teaching assignment is matched on a display-name string at six
enforcement sites (`subjects.professor === faculty.fullName`). A duplicate or
renamed `fullName` silently reassigns a teaching load, and renames break loads.

Phased migration, each step shippable and reversible:

1. Write both: subject writes (seed, admin surfaces) stamp
   `professorUsername` alongside `professor`. `relations.teachesSubject` and
   `scopes.teachingLoad` prefer `professorUsername` and fall back to the name
   match. Enforcement behavior is unchanged for existing data.
2. Backfill: a dev-branch script (pattern: `scripts/rehash-passwords.ts`) sets
   `professorUsername` from the current name match, report-first, owner-run,
   idempotent, dry-run mode default.
3. Read strictly: fallback removed; mismatched rows surface in a verification
   report instead of silently passing.

The migration is deliberately sequenced AFTER the guard swap so the refactor and
the data change never share a diff. `MongoSubject` gains
`professorUsername?: string` (types.ts, backward-compatible).

## 9. Migration strategy

Five stages, each a set of small reviewable commits on `main-full-dev`. Stage 3
is the only one that changes observable behavior, and it is fenced behind the
Phase 3 sign-off.

- Stage 0, characterize (no src/ changes). `scripts/verify-authz.sh` records the
  CURRENT behavior of every protected endpoint, including the vulnerabilities,
  as golden expectations. The C1/H1/M1 rows are documented as "currently
  permits" so the later fix diff is explicit rather than implicit.
- Stage 1, scaffold. Add `src/lib/authz/` with unit tests. No route imports it.
  Optional shadow mode behind `AUTHZ_SHADOW=1`: routes log the guard's decision
  next to their live decision, divergence reports without blocking. Deleted in
  the cleanup stage.
- Stage 2, swap guards per route group, equivalence-preserving (section 5
  rules). Order is easiest-to-hardest so the pattern settles before the risky
  surface: G1 admin writes (announcements, events, professors, people, stats,
  admin/enrollment) -> G2 self-surface (student, export, update, photo, photo
  cleanup, enrollment, announcements/read, notifications PATCH) -> G3 faculty
  reads (faculty, faculty/tasks, submissions, history, sent) -> G4 faculty
  writes and materials (tasks POST/PATCH, task grade, materials trio,
  notifications POST) -> G5 grades and attendance. Each group: swap commit,
  verify-authz.sh rerun, all-green before the next group.
- Stage 3, behavior fixes. One finding per commit, section 10 registry, each
  flipping the golden expectations it owns. Owner sign-off on the registry is
  the gate to enter this stage (Phase 4 approval).
- Stage 4, cleanup. Remove shadow mode, delete `requireTeachingFaculty` from
  `tasks/route.ts`, retire `RoleGate.tsx` after a usage check, wire
  `permissions.ts` into `nav-config.ts`, write ADRs 0007 (centralized
  authorization) and 0008 (grade write state machine), refresh README security
  notes and CLAUDE.md guardrails to reference the module.

Rollback: every stage is plain commits; `git revert` restores the previous
behavior with no data coupling. The only data-touching step is the section 8
backfill, which ships with its own undo (unset `professorUsername`).

## 10. Behavior changes requiring sign-off

Each row is a Phase 1 finding turned into a proposed change. Nothing here lands
without the owner approving this registry (that approval IS the Phase 4 gate).
"Preserves" rows change no observable behavior; they are listed because the
diff touches the enforcement path.

| Fix | Finding | Current | Proposed | Risk |
| --- | --- | --- | --- | --- |
| FIX-C1 | C1 | Any same-branch faculty can submit any subject's grades | `submit` requires the subject in the caller's teaching load; scope carries the professor key | A co-teacher scenario must be enumerated in the load query exactly as `requireTeachingFaculty` does today (name match includes any professor-of-record row) |
| FIX-H1a | H1a, D5 | Faculty edits reset submitted/released periods to draft; released grades editable | Forward-only state machine: `update` allowed while a period is `''`/`draft`; `submitted` is withdrawable by the teaching faculty back to draft (audited as a withdrawal); `released` is immutable to faculty. Admin correction path is a new audited `unrelease` action, not silent editing | Removes an existing (unsafe) faculty power; workload shifts to admin for post-release corrections. Withdrawal must be a visible audit row |
| FIX-H1b | H1b | Professor-of-record check skipped when `fullName` is falsy | Unconditional check; missing `fullName` fails closed | None beyond the check itself |
| FIX-H2 | H2, D4 | Any same-branch faculty reads/writes any section's attendance; `records` keys unvalidated | `attendance` requires `teachesSection(sectionKey)`; `records` keys validated against the enrolled roster; GET stays faculty/admin with load scoping for faculty | Sections co-taught must pass the load query; historical data with off-roster usernames needs a tolerant read path |
| FIX-M1 | M1 | Faculty read the whole branch's grade audit history | `grade.audits` scoped to subjects the caller is professor-of-record on (any term), admin sees the branch | Faculty lose branch-wide visibility they arguably should never have had; audits for abandoned subjects become admin-only |
| FIX-M2 | M2 | Four gates trust the JWT role claim | DB role is the authority everywhere via `resolveContext` | One extra `findOne` on four GET routes; stale-role powers end at the next request instead of token expiry |
| FIX-M3 | M3 | Cron cleanup path dead behind the proxy 401; retention silently no-ops | Proxy admits the cleanup path when a valid `Authorization: Bearer` matches `CRON_SECRET` (timing-safe compare); route keeps its own admin-or-cron authorization | Widens nothing: the Bearer branch already existed and never ran; without the secret set, behavior is unchanged |
| FIX-M4 | M4 | Material file records accept any asset under the Cloudinary prefix | `url`/`publicId` must sit under the signed `materialFolder(base, branch, subjectCode)` tree; `bytes` treated as advisory | Legacy records outside the tree (if any) need a report, not a silent break |
| FIX-L1 | L1 | 404 precedes the authz gate (username oracle) | Authz precedes existence; unknown names 404 post-gate, non-staff see uniform 403/404 | None |
| FIX-L2 | L2 | Attendance branch mismatch returns 400 | 403 like every sibling | Clients keying on 400 for that case (none known) |
| FIX-L3 | L3 | Login signs any DB `role` string | Validate against the `Role` union at login; unknown values fail closed | Corrupt role data blocks login loudly instead of minting an odd token (desired) |
| FIX-L4 | L4 | `announcements/read` accepts unbounded `ids[]` | Cap at 200 like bulk-delete | None |
| FIX-L5 | L5 | Demo login gates on `NODE_ENV` only | Gate on the `env.ts` classification (development only) | None |
| FIX-A5 | A5 | Releasing one period flips legacy `gradeStatus`, prematurely exposing `finalGrade`/`remarks` | Student visibility of `finalGrade`/`remarks` derives from all three periods released (or the projection stops reading `gradeStatus`); legacy field kept for backward compat | None observable except closing the early-exposure window |
| PRESERVE | D1, D2, D3, D6, A6, A7 | School-wide admin reads; staff PII breadth; material delete by load; task-score audit opt-out; in-memory limiter | Unchanged in Phase 4; each is a yes/no question for the owner at Phase 3 sign-off and a backlog line if declined | Deciding "intended" closes the finding without a diff |

## 11. Testing methodology

Adapted to what exists: no unit test runner by decree (CLAUDE.md 3: "do not
invent npm test"), and a strong verify-script tradition
(`scripts/verify-admin-portal.sh` ran 57/57 auth-gate checks; `mint-session.mjs`
already mints sessions for testing). Three layers:

### 11.1 Policy unit tests (new, dev-branch only)

`can()` with fabricated `AuthzContext` values and a fake `Relations` object: no
database, no HTTP, pure decision-table coverage of every resource kind x action
x deny code. Exhaustiveness is doubly enforced: the switch's `never` default
fails `tsc` when a resource kind is added without policies, and the test table
fails when a policy is added without cases.

Runner options, decided at Phase 3 (both keep `main` clean because test files
live only on `main-full-dev`):

- `bun test` (recommended): bun-types is already a devDependency and CI runs bun.
- `node --experimental-strip-types --test`: the seed script already uses this
  flag, so it adds zero dependencies.

Either way there is NO `npm test` script in `package.json` on `main`. If a test
script entry is added on `main-full-dev` for convenience, it is explicitly
excluded from every port command (package.json is whitelisted on main, so port
discipline is the control; the Phase 3 plan lists this as a standing warning).

### 11.2 Route integration runbook: `scripts/verify-authz.sh`

Same shape as `verify-admin-portal.sh`: seed the scratch DB, mint sessions with
`mint-session.mjs` for a fixed cast (student A, student B, faculty X teaching
CS101, faculty Y teaching CS102, admin, and a second-branch admin), then curl
every protected endpoint for every actor, asserting status code plus envelope.

The matrix is the brief's section 7 mapped onto real endpoints; "bypass the
frontend" is literally what these scripts do, since they call the API directly
with minted cookies and no browser:

| Scenario class | Covered by |
| --- | --- |
| Authorized actor succeeds | one positive row per resource kind |
| Wrong role denied | student hitting every faculty/admin write; faculty hitting every admin write; admin hitting faculty-only writes (task create, grade encode, attendance POST) |
| Faculty overreach | faculty X submitting/encoding/auditing CS102 (C1, H1, M1 regressions); faculty Y taking attendance for X's section (H2) |
| Student overreach | student A reading student B's profile, inbox, finances, tasks, export |
| Cross-branch | second-branch admin writing this branch's records; every branch-mismatch row |
| Unauthenticated / revoked | no cookie -> 401; `tv`-bumped cookie -> 401 |
| Grade state machine | encode -> submit -> release ordering; submit on submitted; update on released (post FIX-H1a) |
| Released-only visibility | student sees `Pending` for draft/submitted periods, values for released |
| Spoof | `performedBy`/`username` body fields that disagree with the session -> 403 |
| Cron path | Bearer-secret cleanup call admitted (post FIX-M3), wrong secret denied |

Not applicable, stated to avoid inventing requirements: there is no email
verification feature anywhere in the product (emails are profile data, not
verified identities), so the "authenticated but unverified" test class has no
corresponding surface. If one is added later it slots into the matrix as a
context attribute.

### 11.3 Characterization goldens

Stage 0 output checked into the dev branch: the expected status for every
scenario above against TODAY's code, including the "currently permits" rows.
Every stage 2 group reruns the runbook and must match exactly; every stage 3 fix
flips precisely its own rows, and the commit shows the diff of the golden file.
This is how "no silent behavior change" becomes checkable instead of asserted.

### 11.4 CI

Existing CI (lint + typecheck) covers the module on both branches for free.
Adding the unit tests and the runbook to CI is a Phase 3 decision: the runbook
needs a seeded Mongo URI, so the likely shape is unit tests in CI on
`main-full-dev` pushes plus the runbook as a pre-merge manual gate, matching how
`verify-admin-portal.sh` was run at build time. Workflow edits need the
owner's workflow-scoped token (CLAUDE.md 6a), so they are an owner action.

## 12. Risks and compatibility

| Risk | Mitigation |
| --- | --- |
| Swap subtly changes a decision | Stage 0 goldens, per-group reruns, shadow mode during stage 1 |
| Scope fragment over-hides data (correct status, wrong rows) | Runbook asserts response bodies on positive rows, not just statuses |
| 207 partial semantics lost on `grades/update` | Guard covers the route, not per-row outcomes; per-row reasons stay in the body mapped to deny codes (rule 3 in section 5) |
| Extra DB round-trips | One actor `findOne` replaces the fetches most routes already do; relation memoization caps per-request lookups; only four routes gain a query (M2 sites) |
| `professorUsername` backfill mismatches | Report-first, dry-run default, owner-run, reversible (section 8) |
| Test tooling leaks toward `main` | Test files are dev artifacts under the whitelist rules; package.json port discipline is a standing Phase 3 warning |
| Big-bang temptation | The plan is explicitly staged; each group is independently revertible |

## 13. Phase 3 preview

The implementation plan will contain: the file inventory (new `src/lib/authz/`
files, all ~38 route files grouped by swap stage, `nav-config.ts`, `RoleGate`
retirement, CLAUDE.md/README refresh, new ADRs 0007/0008), the commit slicing
matching section 9, the golden-file format for `verify-authz.sh`, the runner
decision from 11.1, the CI decision from 11.4, and the sign-off checklist: the
section 10 registry (one yes/no per row), the D1-D6 confirmations, and whether
the section 8 migration is in or out of the first implementation pass.

References: `docs/authz/enforcement-map.md` (Phase 1 findings by ID),
`CLAUDE.md` (guardrails, branch topology, testing decree), `CONTEXT.md`
(glossary), ADR-0001/0002/0005/0006, `docs/rate-limiting.md`, and the review
brief's eight sections, each addressed: current architecture (map), single
source of truth (section 4), service-layer enforcement (sections 3 and 5),
query alignment (section 6), preserved boundaries (section 7), maintainable
static permissions (sections 1 and 4.4), testing (section 11), five-phase
workflow (this document plus the Phase 3/4/5 successors).
