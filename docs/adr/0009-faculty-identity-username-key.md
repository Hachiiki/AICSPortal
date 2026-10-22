# ADR-0009: Faculty teaching identity keyed by account username

Date: 2026-10-22
Status: Accepted — phase 1 (dual-write) and phase 2 (backfill tooling +
rehearsal) landed on `main-full-dev`; the production backfill run and
strict enforcement (phase 3) are pending owner-gated steps
(`docs/authz/backfill-runbook.md`). Supersedes the display-name join
flagged as hazard A1 (issue #72; Phase 1 finding registry `docs/authz/`).

## Context

Every teaching-ownership decision keyed on a display-name string:
`subjects.professor === students.fullName` (faculty role docs live in the
same `students` collection). The join appeared at 14 enforcement sites in
12 files — the authz relations/scopes (`teachesSubject`, `teachesSection`,
`gradeRowState`→`grade.period`, `teachingLoad`, `subjectRows`) plus eight
routes with hand-built `professor: <fullName>` filters (faculty roster,
task board, history, grade audits, materials ×2, notification send,
task-create fan-out, data export).

Failure modes (issue #72):
- a **duplicate** fullName silently transfers the whole teaching power set
  to a second account (roster, grade submit/withdraw, attendance write,
  materials, task create/grade, notification send);
- a **rename** silently empties the load and locks the professor out of
  grade rows they hold of record;
- the string is free-form and duplicated by hand across 14 sites, so the
  surfaces can drift.

No self-service exploit existed at review time (no runtime route writes
`fullName`: self-update whitelists phone/email/address/emergency/photo;
`admin/people` is GET-only; directory renames deliberately do not cascade),
which is why A1 was deferred rather than fixed in the review's stage 3.

## Decision

Teaching assignment is keyed on the faculty account's **username** — the
immutable identifier every other ownership relation in the app already
uses (`studentUsername`, `sentBy`, photo folders). `MongoSubject` gains
`professorUsername?: string`.

One shared filter fragment (src/lib/authz/scopes.ts, `professorOwnership`)
replaces the name key at every site:

    { $and: [ { $or: [
        { professorUsername: username },
        { professorUsername: null, professor: fullName },
    ] } ] }

Semantics, per row:

- **Stamped row** (field present, non-empty): matches by username ONLY.
  Its stale display name never grants ownership — the name arm requires
  `professorUsername: null`, and Mongo `{ field: null }` matches absent
  AND null but never a non-empty string. A reassignment is exclusive from
  the moment of stamping.
- **Unstamped row** (field absent/null): falls back to the display-name
  match — byte-identical to the pre-migration behavior, so a zero-stamp
  database is unaffected.
- `''` is never written and matches neither arm (dead value, fail-closed).

The `$or` is wrapped in a single-element `$and` for **spread-safety**:
`grades/submit` composes `{ ...subjectRows(...), $or: [status clauses] }`,
and a bare top-level `$or` in the scope would be clobbered by that
spread — silently deleting the ownership key and reopening FIX-C1
(issue #57). The wrap makes the fragment immune to that collision class
(pinned by a unit test).

Gate/scope equivalence (owner requirement 5): the policy relations
(`relations.ts` loader, `gradeRowState`) and the scope fragments read the
SAME `professorOwnership()` function, and the eight route-kept queries
spread it too, so gate and read/write scope enforce identical rules by
construction. The `grade.period` professor-of-record check mirrors the
precedence: stamped → username-only comparison; unstamped → name
comparison where FIX-H1b's fail-closed on falsy `fullName` is preserved.

FIX-H1b nuance: an actor with a falsy `fullName` and a valid username now
matches stamped rows they own (the username is the real key). This
narrows the check to the actual owner — intended, and unreachable by
seeded data.

## Index decision (owner requirement 4)

Existing `subjects` indexes at decision time: `{branch, studentUsername}`,
`{branch, code, academicYear, semester}`,
`{branch, professor, academicYear, semester}` (serves the legacy name
match), plus `_id`.

- **Query patterns after phase 1**: teaching queries are
  `{branch, $and:[{$or:[username arm, name arm]}]}` (± code/term keys).
  Each `$or` arm is index-served: the name arm by the existing professor
  index, the username arm by the new one. Phase 3 strict collapses the
  fragment to `{branch, professorUsername}` — served exactly.
- **Added**: `{branch: 1, professorUsername: 1}` via `createIndexSafe`
  (idempotent, per-index progress/timeout per BUG-018), created at seed
  time on a fresh collection — label `4b/7 subjects-professorUsername`.
- **Kept**: the legacy professor-name index — it serves the fallback arm
  through the dual-write window; revisit only at phase 3.
- **Production**: index creation is an owner step in the phase 2/3
  runbook (online build on a small collection; Atlas-side).

## Phasing, rollback, and gates

Per the approved plan (issue #72) and owner requirements 2–3:

1. **Phase 1 (this change)** — dual-write code only; zero behavior change
   on unstamped data; seed stamps resolvable rows so dev exercises both
   arms. Rollback: `git revert`; data is untouched.
2. **Phase 2** — backfill script (rehash-passwords pattern: read-only
   report by default, `--apply --expect N`, idempotent, encrypted backup,
   verified `--rollback`) + rehearsal on a throwaway mongod. Owner runs
   the report on production FIRST; ambiguous or unresolved names are
   never auto-assigned (left unstamped, reported). Rollback: `$unset`
   restores the exact pre-state.
   LANDED 2026-10-22: `scripts/backfill-professor-username.ts` +
   `scripts/verify-backfill-rehearsal.sh` (74/74, throwaway mongod —
   duplicate names, cross-branch resolutions, dead values, orphaned
   stamps, idempotency, guard abort, exact-pre-state rollback, fragment
   equivalence, production firewall). Production run pending owner
   review: `docs/authz/backfill-runbook.md`.
3. **Phase 3** — strict username-only reads, gated on a clean strictness
   report: zero unstamped-but-uniquely-resolvable rows, zero ambiguous
   names, zero orphaned stamps. NOT enabled after the dev backfill;
   production data must be assessed, backed up, mutated, and verified
   separately before the strict code ships. Rollback: `git revert`
   restores the fallback (stamps are harmless to fallback readers).

## Consequences

- Display-name behavior is fully preserved: `professor`/
  `professorEmail` rendering, the professors directory join + rename
  warning, history's "Now taught by" comparison, author/fromName fields.
  The ownership key is never serialized into any response.
- Co-teaching semantics unchanged (per-row professor-of-record).
- A future account whose display name collides with an unstamped legacy
  row still acquires it via the fallback — that residual risk is exactly
  what phases 2–3 remove; the strictness report tracks it.
- Unit tests 55 → 60; runbook goldens gain five A1 rows
  (FAC-ROSTER-FALLBACK, FAC-REASSIGN-OLD/NEW, GRD-PERIOD-USERNAME/
  -OLD) exercising fallback, precedence, and grade-period ownership.
