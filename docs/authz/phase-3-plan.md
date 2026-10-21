# Phase 3: implementation plan

Status: implementation plan of the 5-phase authorization review. No code changed in
this phase, same as phases 1 and 2. Precedes: `docs/authz/enforcement-map.md`
(Phase 1 audit, findings C1/H1/M1/A1/D1 and so on) and `docs/authz/phase-2-design.md`
(target architecture, FIX registry in its section 10). Follows: Phase 4 implementation,
which starts only when the owner answers the sign-off checklist in section 9 of this
document. That answer is the gate; nothing below it produces a diff until then.

This plan turns the design into a sequence of small, reviewable commits. It lists
every file that will be created, swapped, or deleted; slices the work into stages
that match the design's section 9; fixes the two open tooling decisions (test
runner, CI); defines the golden-file format the runbook asserts against; and
closes with the checklist the owner signs.

## 1. Decisions locked by this plan

All five stay inside the option space the design left open:

| # | Decision | Choice | Why |
| --- | --- | --- | --- |
| P1 | Unit test runner | `bun test` | CI already runs on bun (`ci.yml` Setup Bun step), `bun-types` ^1.3.4 is already a devDependency, bun 1.3.14 is installed locally. Zero new dependencies. `node --experimental-strip-types --test` stays the documented fallback (the seed script already uses that flag) if bun is ever unavailable. |
| P2 | `npm test` script | Not added, on any branch | package.json is a whitelisted root file and would port to main. Killing the script at the source is stronger than remembering to exclude it from port commands. Tests run as `bun test src/lib/authz/` directly. |
| P3 | Unit vs integration split | Pure modules unit-tested; DB-touching modules runbook-tested | `policies.ts`, `scopes.ts`, `types.ts`, `permissions.ts`, and the decision-to-HttpError mapping in `guards.ts` are pure functions over fakes. `context.ts`, `relations.ts`, and the request path of `guards.ts` wrap `getAuthedSession` and the Mongo driver; forcing them into unit tests means mocking next/jose/mongodb for no decision coverage. The runbook already exercises them end to end. |
| P4 | Shadow mode | Skipped | The design listed it as optional. It costs a temporary diff on every swapped route, and the stage 0 goldens plus the exact-match rerun after every swap commit produce the same equivalence evidence with less churn. Revisitable if the owner wants belt and braces on G5. |
| P5 | Stage 2 equivalence rule | Current behavior preserved exactly, including current bugs, via marked LEGACY policy branches; the single exception is FIX-M2 | Rule from design section 5: a swap changes who writes the decision, not the decision. Preserving L1's 404 ordering or C1's permissive scope is a two-line LEGACY branch that its stage 3 commit deletes. Preserving M2 would mean writing new code that trusts the stale JWT claim, so FIX-M2 instead rides with the three swap commits that own its sites, cited in each message. |

## 2. File inventory

### 2.1 New module: `src/lib/authz/` (8 files)

All whitelisted `src/` paths, so they are port-eligible post Phase 5.

| File | Responsibility | Approx size | Unit tests |
| --- | --- | --- | --- |
| `types.ts` | resource tagged unions, actions, deny codes, decisions | ~120 lines | yes, exhaustiveness |
| `context.ts` | `resolveContext`: session -> DB actor doc -> `AuthzContext` | ~70 lines | no, runbook |
| `relations.ts` | attribute resolvers over Mongo (teaches, enrolled, grade row state), request-scoped memoization | ~140 lines | no, runbook |
| `policies.ts` | the `can()` decision table, one case per resource kind, LEGACY branches marked | ~380 lines | yes, the big table |
| `guards.ts` | `requireCan` / `requireRole`, spoof check, decision -> `HttpError` mapping | ~110 lines | mapping only |
| `scopes.ts` | filter-fragment builders sharing relation definitions | ~90 lines | yes |
| `permissions.ts` | client-safe permission IDs, no server imports | ~40 lines | yes |
| `index.ts` | public surface re-exports | ~15 lines | no |

### 2.2 New dev-only files (never port: outside the production whitelist)

| File | Stage | Purpose |
| --- | --- | --- |
| `src/lib/authz/policies.test.ts` | 1 | decision table coverage, every kind x action x deny code |
| `src/lib/authz/types.test.ts` | 1 | union exhaustiveness guards |
| `src/lib/authz/scopes.test.ts` | 1 | fragment shapes, LEGACY variants |
| `src/lib/authz/permissions.test.ts` | 1 | ID uniqueness, no server imports (import-lint) |
| `src/lib/authz/guards.test.ts` | 1 | decision -> HttpError status/message mapping |
| `scripts/verify-authz.sh` | 0 | the integration runbook (section 4) |
| `docs/authz/goldens.tsv` | 0 | the recorded expected behavior |
| `docs/adr/0007-centralized-authorization.md` | 4 | records the module decision |
| `docs/adr/0008-grade-write-state-machine.md` | 4 | records FIX-H1a semantics |
| `scripts/backfill-professor-username.ts` | 8, conditional | section 8 migration backfill |
| `scripts/verify-professor-username.sh` | 8, conditional | backfill rehearsal and report |

`scripts/seed-mongodb.ts` is edited in stage 0 (cast extension, additive only:
new documents, existing documents untouched, so `verify-tasks.ts`,
`verify-admin-portal.sh`, and every other runbook's expectations stay valid).

### 2.3 Route files in swap scope: 33 files in five groups

Groups follow design section 9 with two plan-level refinements: G1 also takes
`notifications/cleanup` (an admin-gated surface carrying the M2 and M3 sites) and
`announcements/bulk-delete` (an admin write), and G2 also takes
`auth/change-password` (the `account.password` resource from the design's type
list). One file lands in exactly one swap commit. `notifications/route.ts` and
`tasks/route.ts` each carry methods that span groups; each swaps once, in the
group of its riskiest method, with all methods in that commit.

**G1 admin writes and admin reads (8 files)**

| File | Methods swapped | Findings in play |
| --- | --- | --- |
| `src/app/api/announcements/route.ts` | GET, POST, PATCH, DELETE | clean today, moderation position must survive |
| `src/app/api/announcements/bulk-delete/route.ts` | POST | 200-id cap preserved |
| `src/app/api/events/route.ts` | GET, POST, PATCH, DELETE | clean |
| `src/app/api/professors/route.ts` | GET, POST, PATCH, DELETE | clean |
| `src/app/api/admin/people/route.ts` | GET | D1 preserve |
| `src/app/api/admin/stats/route.ts` | GET | D1 preserve |
| `src/app/api/admin/enrollment/route.ts` | GET, PATCH, POST | D1, branch parity on writes |
| `src/app/api/notifications/cleanup/route.ts` | GET, POST | M2 flip rides here, M3 fixed in stage 3 |

**G2 self-surface (8 files)**

| File | Methods swapped | Findings in play |
| --- | --- | --- |
| `src/app/api/student/route.ts` | GET | M2 flip rides here, L1 preserved via LEGACY until FIX-L1, D2 preserve |
| `src/app/api/student/export/route.ts` | GET | released-only masking untouched (A5 lands later, in stage 3) |
| `src/app/api/student/update/route.ts` | PATCH | moderation on profile fields stays in route |
| `src/app/api/student/photo/route.ts` | POST, DELETE | clean |
| `src/app/api/student/photo/cleanup/route.ts` | POST | folder containment stays in route |
| `src/app/api/enrollment/route.ts` | GET | self-only, staff denied, preserved |
| `src/app/api/announcements/read/route.ts` | POST, DELETE | L4 fixed in stage 3 |
| `src/app/api/auth/change-password/route.ts` | POST | old-password verify and tv bump stay in route; guard does the self check |

**G3 faculty reads (5 files)**

| File | Methods swapped | Findings in play |
| --- | --- | --- |
| `src/app/api/faculty/route.ts` | GET | D2 breadth preserved |
| `src/app/api/faculty/tasks/route.ts` | GET | clean |
| `src/app/api/faculty/tasks/submissions/route.ts` | GET | last `requireTeachingFaculty` importer outside G4 |
| `src/app/api/faculty/history/route.ts` | GET | released-only rows preserved |
| `src/app/api/notifications/sent/route.ts` | GET | clean |

**G4 faculty writes, tasks, materials, notifications (7 files)**

| File | Methods swapped | Findings in play |
| --- | --- | --- |
| `src/app/api/tasks/route.ts` | GET, POST, PATCH | M2 flip on the GET staff path; A2 definition deleted in stage 4 |
| `src/app/api/tasks/[taskId]/submit/route.ts` | PATCH | ownership-in-filter pattern moves into scope fragments |
| `src/app/api/tasks/[taskId]/grade/route.ts` | PATCH | past-term load acceptance preserved (not a finding) |
| `src/app/api/materials/route.ts` | GET, POST | admin-excluded GET preserved, M4 fixed in stage 3 |
| `src/app/api/materials/sign/route.ts` | POST | secret handling untouched |
| `src/app/api/materials/[id]/route.ts` | DELETE | delete-by-load preserved (D3) |
| `src/app/api/notifications/route.ts` | GET, POST, PATCH | M2 flip on the GET staff path; unowned sectionKeys silently dropped, preserved |

**G5 grades and attendance (5 files)**

| File | Methods swapped | Findings in play |
| --- | --- | --- |
| `src/app/api/grades/update/route.ts` | PATCH | H1a, H1b LEGACY until stage 3; 207 envelope preserved |
| `src/app/api/grades/submit/route.ts` | POST | C1 LEGACY scope until FIX-C1 |
| `src/app/api/grades/release/route.ts` | GET, POST | A5 fixed in stage 3 |
| `src/app/api/grades/audits/route.ts` | GET | M1 LEGACY scope until FIX-M1 |
| `src/app/api/attendance/route.ts` | GET, POST | H2 LEGACY until FIX-H2; L2 400 preserved until FIX-L2 |

### 2.4 Route files NOT in swap scope (5) and why

| File | Reason |
| --- | --- |
| `src/app/api/route.ts` | root health check, no gate, nothing to centralize |
| `src/app/api/auth/login/route.ts` | public, throttled; only FIX-L3 touches it (stage 3) |
| `src/app/api/auth/demo/route.ts` | public env gate; only FIX-L5 touches it (stage 3) |
| `src/app/api/auth/session/route.ts` | public passthrough, already revocation-aware, clean |
| `src/app/api/auth/logout/route.ts` | signature-only verify plus tv bump, clean |

### 2.5 Other src files touched

| File | Touching commit | Change |
| --- | --- | --- |
| `src/proxy.ts` | C3.6 only (FIX-M3) | admit the cleanup path with a valid Bearer secret; the single proxy diff in the whole plan |
| `src/lib/aics/nav-config.ts` | C4.2 | optional `permission?: PermissionId` on `NavItem`, display-only filter |
| `src/components/portal/RoleGate.tsx` | C4.2 | deleted; zero importers verified 2026-10-21 (grep found only the file itself), re-verified at deletion time |
| `src/lib/mongodb/types.ts` | C8.1 only, conditional | `professorUsername?: string` on `MongoSubject` |

`src/lib/http.ts` needs no change: `HttpError(status, message)` already exists and
the guard maps every deny decision onto it. Response envelopes stay as they are.

### 2.6 Docs touched

| File | Stage | Change |
| --- | --- | --- |
| `CLAUDE.md` | C4.3 | guardrail 2 and section 7 reference the module; section 2 focus line |
| `README.md` | C4.3 | security notes point at the policy module. README is whitelisted and ports later |
| `docs/adr/0007`, `docs/adr/0008` | C4.3 | new, dev-only |
| `TODO.md` | C4.4 | owner-action lines: apply CI job via web UI, run backfill if approved |

## 3. Commit slicing

29 commits plus 3 conditional ones. Every commit: independently revertible, lint
plus typecheck plus `bun test src/lib/authz/` green before it is made, goldens
rerun exact-match after every stage 2 and stage 3 commit, and a message that
carries either the old-check to policy-case mapping table (stage 2) or the golden
rows flipped (stage 3). No commit mixes a swap with a behavior change except the
three M2 riders, each cited per decision P5.

### Stage 0: characterize (no src/ changes)

- **C0.1** `scripts/verify-authz.sh` plus the seed cast extension in
  `scripts/seed-mongodb.ts`. The runbook boots the throwaway mongod, reseeds,
  builds, starts `next start` on a scratch port, mints the six-actor cast with
  `scripts/mint-session.mjs`, and curls the full scenario matrix. It must run
  green against today's code, including the rows that document current
  vulnerabilities as "currently permits". Review focus: tool correctness.
- **C0.2** `docs/authz/goldens.tsv` checked in, generated by C0.1's `--update`
  flag. Review focus: the recorded behavior, especially the C1/H1/H2/M1
  currently-permits rows that stage 3 will flip.

### Stage 1: scaffold (no route imports the module)

- **C1.1** `types.ts` plus `types.test.ts`.
- **C1.2** `context.ts` (runbook-tested, ships without unit tests by P3).
- **C1.3** `relations.ts` plus `scopes.ts` plus `scopes.test.ts`.
- **C1.4** `policies.ts` plus `policies.test.ts`: the full decision table with
  every LEGACY branch marked `// LEGACY(<finding>): deleted by C3.x`.
- **C1.5** `guards.ts`, `permissions.ts`, `index.ts` plus their tests.

Review focus across stage 1: the table's decisions against the enforcement map's
route matrix, row by row, before any route trusts it.

### Stage 2: guard swaps, equivalence-preserving

Order is easiest to hardest so the pattern settles before the risky surface.
Each commit deletes the inline checks it covers in the same diff that adds the
guard call (design rule 1), preserves every quirk via LEGACY branches (P5), and
reruns the goldens to exact match.

- **C2.1** G1, 8 files. FIX-M2 rider on `notifications/cleanup` (cited in the
  message; its two stale-role golden rows flip here).
- **C2.2** G2, 8 files. FIX-M2 rider on `student` GET. L1 ordering preserved.
- **C2.3** G3, 5 files. After this commit every remaining
  `requireTeachingFaculty` import lives in a G4 file; C2.4 zeroes them.
- **C2.4** G4, 7 files. FIX-M2 riders on `tasks` GET and `notifications` GET.
  After this commit `requireTeachingFaculty` has zero importers; its definition
  stays until stage 4.
- **C2.5** G5, 5 files. LEGACY permissive scopes for C1, H2, M1; H1a/H1b LEGACY
  state rules; L2's 400 preserved; the 207 partial-success envelope on
  `grades/update` preserved with per-row reasons mapped to deny codes in the
  body.

### Stage 3: behavior fixes, one finding per commit

Each commit flips exactly its own golden rows and shows the `goldens.tsv` diff.
Rows the owner declines never get a commit; their LEGACY branches become
permanent policy with a comment citing the declined registry row.

| Commit | Finding | Files | What changes |
| --- | --- | --- | --- |
| C3.1 | FIX-C1 | `grades/submit/route.ts`, `policies.ts`, `scopes.ts` | LEGACY branch deleted; scope carries the professor key; cross-faculty submits 403 |
| C3.2 | FIX-H1b | `policies.ts` | professor-of-record check unconditional, fails closed |
| C3.3 | FIX-H1a | `policies.ts`, `grades/update/route.ts` | forward-only state machine, audited withdrawal, admin-only unrelease |
| C3.4 | FIX-H2 | `policies.ts`, `attendance/route.ts` | `teachesSection` required, records keys roster-validated, GET load-scoped for faculty |
| C3.5 | FIX-M1 | `policies.ts`, `grades/audits/route.ts` | audits scoped to professor-of-record subjects; admin keeps the branch |
| C3.6 | FIX-M3 | `src/proxy.ts`, `notifications/cleanup/route.ts` | Bearer path admitted with timing-safe compare; without CRON_SECRET set, unchanged |
| C3.7 | FIX-M4 | `materials/route.ts` | URL and publicId must sit under the signed materialFolder tree; legacy report |
| C3.8 | FIX-L1 | `policies.ts` | authz precedes existence; oracle golden rows flip |
| C3.9 | FIX-L2 | `policies.ts`, `attendance/route.ts` | branch mismatch 403 |
| C3.10 | FIX-L3 | `auth/login/route.ts` | role validated against the union, fails closed |
| C3.11 | FIX-L4 | `announcements/read/route.ts` | ids capped at 200 |
| C3.12 | FIX-L5 | `auth/demo/route.ts` | env classification from `env.ts` |
| C3.13 | FIX-A5 | `student/route.ts`, `student/export/route.ts` | finalGrade and remarks need all three periods released; legacy field kept |

Order note: C3.2 lands before C3.3 because the state machine assumes the
professor check is unconditional. C3.1 is first because it is the highest
severity.

### Stage 4: cleanup

- **C4.1** Delete `requireTeachingFaculty` from `tasks/route.ts` (hazard A2
  retired), remove any LEGACY scaffolding left empty by declined fixes, remove
  shadow-mode remnants if P4 is ever reversed.
- **C4.2** Client surface: wire `permissions.ts` into `nav-config.ts`, delete
  `RoleGate.tsx` after re-verifying zero importers.
- **C4.3** Docs: ADR-0007, ADR-0008, README security notes, CLAUDE.md guardrail
  refresh.
- **C4.4** CI: add the `authz-unit` job to `docs/ci-workflow.yml` (the parked
  source of truth) and hand the owner the web-UI apply step for
  `.github/workflows/ci.yml`. TODO.md gains the owner-action line.

### Stage 8 (conditional): professorUsername migration

Only if checklist item C says in. Sequenced after C2.5 so the refactor and the
data change never share a diff (design section 8).

- **C8.1** Dual-write: subject writers (seed, admin professors surface) stamp
  `professorUsername` alongside `professor`; `MongoSubject` gains the optional
  field. Additive, no behavior change.
- **C8.2** `scripts/backfill-professor-username.ts` plus its rehearsal runbook:
  dry-run default, report-first, idempotent, undo flag. Owner-run, pattern from
  `rehash-passwords.ts` plus `verify-rehash-rehearsal.sh`.
- **C8.3** Strict read: `relations.ts` and `scopes.ts` prefer
  `professorUsername`, name fallback removed, mismatches surface in a
  verification report instead of silently passing.

## 4. Golden file format

`docs/authz/goldens.tsv` is tab-separated with a fixed column set and is
machine-generated only; hand edits are forbidden, regeneration happens through
`verify-authz.sh --update` from a clean run:

```
id  actor  method  target  precondition  expect_status  expect_code  notes
```

Sample rows (of roughly 100 total; the full matrix is design section 11.2 mapped
onto real endpoints). Rows are space-aligned here for readability; the real
file is machine-written with tabs, one row per line:

```
STU-READ-SELF        studentA  GET   /api/student?username=juan.santos      seeded                200  -              positive control
STU-READ-OTHER       studentB  GET   /api/student?username=juan.santos      seeded                403  notOwner       student vs student
STU-READ-ABSENT      studentA  GET   /api/student?username=ghost            absent                404  notFound       LEGACY L1 oracle; flips 403 notOwner at C3.8
GRD-SUBMIT-OTHER     facultyY  POST  /api/grades/submit {CS101 prelim}      CS101 taught by X     200  -              CURRENTLY PERMITS (C1); flips 403 notAssigned at C3.1
GRD-UPD-RELEASED     facultyX  PATCH /api/grades/update {released prelim}   prelim released       200  -              CURRENTLY PERMITS (H1a); flips 403 state at C3.3
ATT-WRITE-OTHER      facultyY  POST  /api/attendance {X section}            seeded                200  -              CURRENTLY PERMITS (H2); flips 403 notAssigned at C3.4
ATT-BRANCH-MISMATCH  facultyX  POST  /api/attendance {cross-branch key}     seeded                400  -              LEGACY L2; flips 403 branch at C3.9
NOTIF-CRON-NOSECRET  cron      POST  /api/notifications/cleanup             no bearer secret      401  unauthenticated M3 dead path; unchanged until C3.6
SESSION-REVOKED      studentA  GET   /api/student                           tv bumped             401  unauthenticated revocation control, never flips
```

The cast seeded by C0.1: studentA `juan.santos` (exists), studentB `maria.cruz`
(new), facultyX `m.reyes` teaching CS101 (exists), facultyY `l.bautista`
teaching CS102 (new), `admin` (exists), and `admin2` on a second branch (new).
CS101 and CS102 subject docs, enrollment rows for both students with mixed
period statuses (draft, submitted, released), and one attendance section give
every scenario class a concrete precondition. The runbook asserts response
bodies on positive rows, not just statuses, so an over-hiding scope fragment
fails loudly (design section 12 risk 2).

## 5. Runner decision (P1, P2, P3)

`bun test src/lib/authz/` with `bun:test` imports. CI runs bun, `bun-types` is
already a devDependency, and bun 1.3.14 is present locally, so no new dependency
enters `package.json`. The fallback, if bun is unavailable in some future
environment, is `node --experimental-strip-types --test src/lib/authz/`, the same
flag `scripts/seed-mongodb.ts` already relies on; test files use only APIs that
work under both.

No `npm test` script is added on any branch (P2). package.json is whitelisted
and ports to main, and the cleanest way to keep test tooling off main is to
never write it into the one file that would carry it there.

## 6. CI decision

Unit tests join CI as a new job in `docs/ci-workflow.yml`, the parked source of
truth per CLAUDE.md 6a:

```yaml
authz-unit:
  name: Authorization unit tests
  runs-on: ubuntu-latest
  timeout-minutes: 5
  steps:
    - uses: actions/checkout@v4
    - uses: oven-sh/setup-bun@v2
      with: { bun-version: latest }
    - run: bun install --frozen-lockfile || bun install
    - run: bun test src/lib/authz/
```

Applying it to `.github/workflows/ci.yml` needs the owner's workflow-scoped
token or the GitHub web UI (CLAUDE.md 6a), so it is an owner action recorded in
TODO.md at C4.4. Until applied, the pre-commit sequence (lint, typecheck, bun
test) is the gate.

The runbook stays a manual gate, not a CI job: it needs the throwaway mongod, a
reseed, and a built server, the same shape as `verify-admin-portal.sh`, which
was also never a CI job. It runs after C0.1 (baseline), after every stage 2 and
stage 3 commit (exact match), and as the Phase 5 entry report.

## 7. Compatibility risks register

Design section 12 is the base; these are the plan-level specifics, including the
sequencing traps the commit order exists to avoid.

| # | Risk | Surfaces | Mitigation |
| --- | --- | --- | --- |
| R1 | Moderation pipeline reorder (guard -> moderate -> write becomes moderate -> guard -> write) | G1 announcements, G2 student update, G4 materials, G4 notifications POST | Rule 3 in design section 5: business logic does not move. Swap commits touch the gate lines only. `verify-moderation.sh` reruns on G1, G2, G4. |
| R2 | 207 partial-success envelope lost on `grades/update` | C2.5 | Guard covers the route, not per-row outcomes; per-row reasons stay in the body mapped to deny codes. Golden row asserts the 207 shape on a mixed batch. |
| R3 | LEGACY branches linger after a declined fix | any declined stage 3 row | The branch becomes permanent policy with a comment citing the declined registry row; the finding stays open in the enforcement map with the owner's rationale. |
| R4 | FIX-M2 flip spread over three commits | C2.1, C2.2, C2.4 | Each commit message cites FIX-M2 and lists the stale-role golden rows it flips. The checklist gets one M2 answer up front, so the spread is execution detail, not three separate decisions. |
| R5 | Import graph: `requireTeachingFaculty` deleted too early | C2.3, C2.4, C4.1 | Importers die in C2.3 (submissions) and C2.4 (materials trio, task grade, tasks' own calls); the definition is deleted in C4.1 only after grep shows zero references. Sequenced in the commit list. |
| R6 | Extra DB round-trips | four M2 sites gain a `findOne` | Replaces the fetch most routes already do; relations memoized per request cap the rest. Runbook timing unchanged in practice (local runs, seeded DB). |
| R7 | Test tooling leaks toward main | any | Test files sit inside whitelisted `src/`, so the leak vector is a careless port command, not the whitelist guard. Port commands list explicit paths, `*.test.ts` files are never listed, and the port preview (section 11) is the authoritative list. No `npm test` script exists to port (P2). |
| R8 | Proxy change scope creep | C3.6 only | The single `src/proxy.ts` diff admits exactly the cleanup path with a valid Bearer secret; every other path's tier order and PUBLIC_API behavior is golden-covered. Without CRON_SECRET set, behavior is unchanged. |
| R9 | Golden drift (hand edits, stale expectations) | stage 2 and 3 gates | Machine-generated only, `--update` from a clean run, diff shown in every stage 3 commit. |
| R10 | Seed cast extension breaks sibling runbooks | C0.1 | Additive only: new documents, zero edits to existing docs, so `verify-admin-portal.sh`, `verify-tasks.ts`, and moderation runs keep their expectations. |
| R11 | Scope fragment over-hides (right status, wrong rows) | all swap commits | Positive golden rows assert response bodies, not just statuses (design section 12). |
| R12 | Unit tests couple to server-only modules | stage 1 | P3 split: `context.ts`, `relations.ts`, and the request path of `guards.ts` are runbook-tested, never unit-imported. |
| R13 | Big-bang temptation under time pressure | the whole plan | 29 small commits, each revertible; stage 2 groups land independently; the plan is the contract. |

## 8. Sizing and review load

| Stage | Commits | New code (est.) | Deleted (est.) | Review focus |
| --- | --- | --- | --- | --- |
| 0 | 2 | ~420 lines (runbook + seed cast) | 0 | tool correctness, recorded behavior |
| 1 | 5 | ~1,000 lines incl. tests | 0 | decision table vs the enforcement map, row by row |
| 2 | 5 | ~250 lines of guard calls | ~700 lines of inline checks | the mapping table in each message; deletions must be covered |
| 3 | up to 13 | ~350 lines | ~120 LEGACY lines | the golden diff is the review artifact |
| 4 | 4 | ~300 lines docs and wiring | ~80 (RoleGate, guard) | ADRs, README, nav wiring |
| 8 | 3 conditional | ~200 lines | 0 | backfill report output |

Total: 29 commits (32 with stage 8), roughly 2,300 new lines including tests and
scripts, net minus about 500 lines of route code. The heaviest single review is
C1.4 (the decision table) and the stage 2 swaps for G4 and G5; both are
structured for review against existing documents rather than exploratory
reading: policies against the route matrix, swaps against the mapping table and
the golden rerun.

## 9. Sign-off checklist (the Phase 4 gate)

The owner answers once, here. Yes means the stage 3 commit lands; No means the
LEGACY branch becomes permanent policy, the finding stays open, and the
rationale is recorded. Every question is answerable without reading code: each
row restates the current behavior in product terms.

**A. Behavior changes (design section 10 registry)**

| Row | Today | After the fix | Answer |
| --- | --- | --- | --- |
| FIX-C1 | Any same-branch faculty can submit any subject's grades | Only the subject's teaching faculty can | yes / no |
| FIX-H1a | Faculty edits reset submitted or released grades to draft, hiding them from students and the release queue | Forward-only: draft to submitted to released; withdrawal is audited; released rows are corrected only by an admin unrelease action, also audited | yes / no |
| FIX-H1b | The professor-of-record check is skipped when a faculty record lacks a full name | Check is unconditional, fails closed | yes / no |
| FIX-H2 | Any same-branch faculty can read and write any section's attendance, and record keys are not roster-validated | Only the section's teaching faculty; keys validated against the roster; faculty GET scoped to their load | yes / no |
| FIX-M1 | Any same-branch faculty can read the whole branch's grade-change audit history | Faculty see audits for their own subjects only; admin keeps the branch view | yes / no |
| FIX-M2 | Four routes trust the session token's role claim for up to 7 days after a role change | Role always re-read from the DB; demotion takes effect on the next request | yes / no |
| FIX-M3 | The scheduled cleanup job's secret path is dead code; retention silently no-ops | The proxy admits the Bearer-secret path; retention works when the secret is set | yes / no |
| FIX-M4 | Material records can attach any asset under the Cloudinary prefix | Records must sit under the signed subject folder tree; a report lists any legacy outliers first | yes / no |
| FIX-L1 | A 404 leaks which usernames exist before the permission gate | Permission gate first; non-staff see a uniform deny | yes / no |
| FIX-L2 | Attendance branch mismatch returns 400 | 403 like every sibling | yes / no |
| FIX-L3 | Login signs whatever role string the DB holds | Unknown role values fail closed at login | yes / no |
| FIX-L4 | Announcement read-markers accept an unbounded id array | Capped at 200 like bulk delete | yes / no |
| FIX-L5 | Demo login gates on NODE_ENV only | Gates on the env.ts classification, development only | yes / no |
| FIX-A5 | Releasing one period prematurely exposes the final grade and remarks on the legacy field | Final grade and remarks need all three periods released | yes / no |

**B. Current behaviors to confirm as intended (no diff either way)**

| Row | Current behavior | Confirm | Answer |
| --- | --- | --- | --- |
| D1 | Admin reads are school-wide across branches (people, stats, enrollment); admin writes are branch-scoped | intended? | yes / no |
| D2 | Same-branch faculty and admin can read any student's full profile and inbox, including contacts and GPA | intended? | yes / no |
| D3 | Material deletion is by teaching load, not uploader; no admin path; past-term materials are stranded | intended? | yes / no |
| D6 | Task scores write no audit rows (decision #32) | keep? | yes / no |
| A6/A7 | Score tamper trail absent; in-memory rate limiter (documented BUG-013) | accept as backlog? | yes / no |

**C. Faculty identity migration (design section 8, hazard A1)**

In or out of this implementation pass? In means C8.1 through C8.3 after stage 2:
subjects gain a `professorUsername` key, a report-first backfill runs under the
owner's hand, and the name-string match retires. Out means relations keep the
name match and A1 stays an open hazard on the backlog.

**D. Tooling confirmations**

- Runner `bun test`, no `npm test` script on any branch (P1, P2): acknowledged?
- CI unit job applied by the owner through the web UI at C4.4: acknowledged?
- Shadow mode skipped in favor of goldens (P4): acknowledged?

**E. Branch and port discipline**

All Phase 4 work lands as commits on `main-full-dev`, no pushes, no merges.
Porting to `main` is a separate, explicitly authorized step after Phase 5,
following the CLAUDE.md 6a procedure (section 11 below). Acknowledged?

## 10. Phase 4 entry conditions and Phase 5 preview

Phase 4 starts when the checklist comes back answered (any mix of yes and no is
a valid answer; unanswered rows default to No, meaning behavior stays as today
and the finding stays open). Entry conditions:

1. Every A and B row carries an answer, or is explicitly left to default No.
2. C has an in or out.
3. The work plan is this document's commit list, in order, with stage 3 commits
   created only for approved rows.
4. Stages 0 through 2 proceed as equivalence-preserving work on `main-full-dev`.

Phase 5 (verification, separate phase after stage 4): fresh-eyes rerun of the
full runbook against the final tree; the design section 7 untouched-list walk
(session machinery, envelopes, moderation position, 207 convention, client
architecture); credential re-verification that `MONGODB_URI`, `AUTH_SECRET`,
and `CLOUDINARY_API_SECRET` never reach the client; a browser pass for the nav
wiring; and the closing report that flips every open finding to fixed,
declined-with-rationale, or still-open.

## 11. Port preview (post Phase 5, separate authorization)

What would ever reach `main`, per the CLAUDE.md 6a port procedure, listed
explicitly so the port PR carries exactly these paths and nothing else:

- `src/lib/authz/` module files, 8 files, no `*.test.ts` files
- the 33 swapped route files
- `src/proxy.ts` (only if FIX-M3 was approved)
- `src/lib/aics/nav-config.ts`
- `README.md`

Everything else in this plan (tests, runbook, goldens, ADRs, CLAUDE.md,
TODO.md, backfill scripts) is a dev artifact anchored outside the whitelist and
stays on `main-full-dev`. No port happens inside this review; it is a post
Phase 5 owner decision.

References: `docs/authz/enforcement-map.md` (findings by ID, route matrix),
`docs/authz/phase-2-design.md` (target architecture, FIX registry, testing
methodology), `CLAUDE.md` (guardrails, branch topology, testing decree, port
procedure), `scripts/verify-admin-portal.sh` and `scripts/mint-session.mjs`
(runbook patterns), `.github/workflows/ci.yml` plus `docs/ci-workflow.yml`
(CI shape and source of truth), `scripts/rehash-passwords.ts` plus
`scripts/verify-rehash-rehearsal.sh` (backfill pattern for stage 8).
