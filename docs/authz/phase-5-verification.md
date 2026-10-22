# Phase 5 verification report (authorization review, close-out)

Status: phase 5 of 5, verification and close-out. Branch: `main-full-dev`.
Date: 2026-10-22. Verified tree: `6e0fe70` (stage 4 head, nothing after it).
Reviewer: repo owner with agent assistance. Every result below is a
machine-verified run or a walked git diff, not an assertion.

## 1. Entry gate: fresh-eyes runbook rerun

`scripts/verify-authz.sh` against the final tree, full run: fresh
`next build`, fresh mongod boot, database drop and reseed, session minting,
and the complete scenario matrix asserted against `docs/authz/goldens.tsv`.
Result: 93 assertions passed, 0 failed, 87 golden rows, exit 0. Same
numbers as the stage 3 close, on a rebuilt server, which is what
equivalence through the cleanup commits looks like.

Baseline gates on the same tree: `bun test src/lib/authz/` 55/55,
`npm run lint` exit 0 with the pre-existing warnings unchanged, and
`npm run typecheck` clean.

## 2. Untouched-list walk

The design section 7 inventory, walked as a git diff from `b897b56^` (the
commit before the first authz commit) to `6e0fe70`. Files absent from the
diff are untouched by construction. Every file present in the diff maps
onto an authorized commit, checked one by one:

- Session machinery: `session.ts`, `session-auth.ts`, `rate-limit.ts` are
  absent from the diff. `proxy.ts` changed only by the FIX-M3 Bearer
  admission, read line by line: `PUBLIC_API` unchanged, the rate tier still
  runs before the session gate, the exception fires after the tier and only
  for the cleanup path with the secret set.
- Auth flows: logout and session routes absent. The login route changed
  only by the L3 role-union validation, with claims shape, cookie
  attributes, and lifetimes unchanged. The demo route changed only by the
  L5 env-classification gate. Change-password is a pure gate swap; the
  old-password check and the `tv` bump stay in the route.
- Role set and schemas: `mongodb/types.ts`, `queries.ts`, and
  `connection.ts` are absent. No collection schema changed; the
  `professorUsername` migration did not happen (A1 stays deferred).
- D1 and D2 reads: goldens exact-match. Admin cross-branch reads stay 200
  and writes stay 403, staff student-profile reads stay 200, exactly as
  recorded at baseline.
- Moderation: the engine under `src/lib/moderation/` is absent from the
  diff. The guard, then moderate, then write order was verified in all four
  moderation surfaces (announcements POST and PATCH, student update,
  materials POST, notifications POST): the `can()` or `requireCan` gate
  precedes `moderateContent` in each.
- `grade_audits`: schema untouched. Write points changed only by the H1a
  withdrawal and unrelease rows, both asserted by the runbook. Task scores
  still write no audit rows (D6 stands).
- Response envelopes: the 207 partial-success convention on
  `grades/update` and every success shape are pinned by the runbook body
  checks, exact match.
- Client architecture: the only client-side changes are `nav-config.ts`
  (permission mirror, C4.2) and the `RoleGate.tsx` deletion (C4.2).
  Everything else under `src/components/` and `src/app/` pages is absent
  from the diff.

## 3. Credential re-verification

`MONGODB_URI`, `AUTH_SECRET`, and `CLOUDINARY_API_SECRET` are referenced in
exactly three files, `src/lib/env.ts`, `src/lib/mongodb/connection.ts`, and
`src/app/api/materials/cloudinary.ts`, all server-side. The codebase
declares zero `NEXT_PUBLIC_` variables, so nothing is inlined into a client
bundle by construction. The built client output from the entry build
(`.next/static/`) was grepped for the variable names and for the actual
secret values used during verification: no hits. Nothing reaches the
client.

## 4. Browser pass on the nav wiring

Real UI logins against the running stack, seeded scrypt passwords, the same
throwaway mongod and `next start` the runbook uses, one headless browser
session per role, plus an unauthenticated control that opens
`/portal/dashboard` directly.

| Session | Expected primary nav | Result |
| --- | --- | --- |
| student (`juan.santos`) | Dashboard, Academics, Events, Professors, Enrollment | pass, no faculty or admin items |
| faculty (`m.reyes`) | Dashboard, My Students, Grade Encoding, Previous Records, Announcements, Schedule, Tasks | pass, no admin items |
| admin (`admin`) | Dashboard, Release Queue, Events, Announcements, Professors, Students & Faculty, Enrollment | pass, no student or faculty items |
| unauthenticated | login surface, no nav | pass |

34 snapshot assertions passed, 0 missed or leaked, including the
cross-role absence checks. Screenshots for all four sessions were kept
with the verification artifacts outside the repo tree.

## 5. Finding disposition

Every phase 1 finding, final state. The tracking issues were rewritten in
the owner's voice on 2026-10-22 and their state flipped to match this
table.

| Finding | Issue | Disposition |
| --- | --- | --- |
| C1 grade submit lacks teaching load | #57 | fixed, C3.1 |
| H1a released grades editable | #58 | fixed, C3.3, state machine |
| H1b empty fullName skips ownership | #59 | fixed, C3.2, fails closed |
| H2 attendance ownership | #60 | fixed, C3.4 |
| M1 branch-wide audit reads | #61 | fixed, C3.5 |
| M2 JWT role claim trusted | #62 | fixed, riders on C2.1/C2.2/C2.4 |
| M3 cron path dead behind proxy | #63 | fixed, C3.6 |
| M4 material URL prefix-only | #64 | fixed, C3.7 |
| L1 username oracle | #65 | fixed, C3.8 |
| L2 attendance 400 vs 403 | #66 | fixed, C3.9 |
| L3 unvalidated role at login | #67 | fixed, C3.10 |
| L4 unbounded ids array | #68 | fixed, C3.11 |
| L5 demo gate on NODE_ENV | #69 | fixed, C3.12 |
| A5 legacy gradeStatus leak | #70 | fixed, C3.13 |
| A2 shared guard in route file | #73 | resolved by the module, C4.1 |
| A3 no deny taxonomy | #74 | resolved by the module |
| A4 thirty check variants | #75 | resolved by the module |
| A6 no task-score audit trail | #76 | declined, kept by choice |
| D1 admin reads school-wide | #78 | declined, intended oversight |
| D3 delete by teaching load | #80 | declined, intended for now |
| L6 throttle first-hop keying | #71 | still open, backlog |
| A7 in-memory rate limiter | #77 | still open, backlog |
| A1 display-name keying | #72 | still open, migration deferred |
| D2 staff read breadth | #79 | still open, policy call pending |

Sum: 17 closed as completed, 3 closed as not planned with the rationale
recorded in the issue bodies, 4 open (two backlog items in the BUG-013
family, one deferred migration with its plan already written in
phase-2-design section 8, one open product-policy question).

## 6. Phase status and what is deliberately not done

Phases 0 through 5 are complete on `main-full-dev`. Nothing is pushed and
`main` sits at `b9fba80`. Porting to `main` is the separate post-review
step defined in CLAUDE.md 6a and phase-3-plan section 11, and it needs its
own explicit go before anything moves. The `authz-unit` CI job application
through the GitHub web UI remains the recorded owner action from C4.4
(TODO.md).
