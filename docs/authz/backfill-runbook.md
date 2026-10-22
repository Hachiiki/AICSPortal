# professorUsername backfill runbook: production (Atlas, aics_portal)

The one-time A1 phase-2 migration (issue #72): stamps
`subjects.professorUsername` on every unstamped row whose display name
resolves to exactly one faculty account, so teaching ownership stops
depending on mutable display names. Ambiguous (duplicate-name) and
unresolved rows are **never auto-assigned** — they are reported for manual
resolution. Tool: `scripts/backfill-professor-username.ts` (pattern:
`scripts/rehash-passwords.ts`). Full local proof:
`scripts/verify-backfill-rehearsal.sh` (88/88 on a throwaway mongod,
2026-10-22).

**Status (2026-10-22, after the independent verification pass):**

- Backfill tooling: **landed on `main-full-dev`** (report / strictness /
  backup / apply / rollback + production firewall). Hardened the same
  day from an independent review: corrupt-typed `professorUsername`
  values (non-string, non-null — e.g. a number from an out-of-band
  write) now classify as `invalid-stamps` instead of leaking into the
  eligible count (the old classifier was fail-safe — the apply guard
  aborted — but the report over-promised and strictness gate-A
  over-counted). Report label renamed `invalid-empty` -> `invalid-stamps`
  to match the widened meaning.
- Local dev DB: **verified.** The rehearsal (88/88 assertions) seeded
  the dev database, injected duplicate-name, cross-branch, dead-value,
  corrupt-typed, and orphaned-stamp conditions, then ran report ->
  strictness FAIL -> backup -> apply -> idempotency -> guard abort ->
  rollback (exact pre-state) -> re-apply -> corrupt-typed differential.
  Fragment equivalence confirmed: the runtime ownership filter matches
  the same rows before and after stamping.
- Production (Atlas): **read-only assessment RUN and verified
  2026-10-22** (committed tool, zero writes, counts only): `aics_portal`
  has 92 subjects — 81 eligible, 11 unresolved (6 distinct display
  names, no faculty accounts match), 0 ambiguous, 0 orphaned, 0
  invalid, 0 eligible-cross-branch. Strictness: gates B and C PASS,
  gate-A FAIL 81 (exactly the pending backfill). Cross-checked three
  independent ways: the tool report, the strictness report, and a raw
  aggregation (81 rows carry the sole faculty account's display name;
  the field is missing on all 92 rows; all rows sit in one branch).
  **Expected mutation when the owner applies: exactly 81 rows.** The
  mutation itself remains owner-gated via this runbook; the tool's
  firewall refuses non-local mutations without `--prod`.
- Phase 1 port: **PR #84** (`feature/authz-a1-username-ownership` ->
  `main`, 14 runtime files) **merged 2026-10-22** (merge commit `606d92f`;
  main CI green on lint+typecheck, whitelist guard, authz-unit; Vercel
  production deployment completed and live). Phase 1 reads and dual-writes
  in production, so the stamps are meaningful; the backfill below may
  proceed at the owner's discretion.
- **SUPERSEDED 2026-10-22 (later the same day): production state reset.**
  At the owner's explicit direction ("those data are mock data as well"),
  `scripts/prod-reseed.ts` staged: read-only precheck (16 collections,
  791 docs — mock-scale, sanity ceiling enforced) -> local backup
  (`db/prod-backup-2026-10-22T07-45-14/`, gitignored, never printed) ->
  scoped drop of every non-system collection in `aics_portal` ONLY ->
  fresh seed via the A1-aware seed script. Post-reset verified: 96
  subjects (85 stamped: 81 m.reyes + 4 l.bautista; 11 legacy rows for
  professor names without accounts), the `{branch, professorUsername}`
  index now present in production, and the dual-key fragment/strict arms
  agree for both faculty. **The 81-row apply below is therefore MOOT for
  this dataset** — the read-only report now reads eligible=0 and
  `--strictness` passes gates A, B, and C. This runbook stays as the
  standing procedure should unstamped rows ever appear in production
  again (new rows written by pre-phase-1 code, manual edits, imports).

## Phase 3: strict username-only reads (2026-10-22, implemented)

Owner-authorized the same day ("Authorize Phase 3 with Safeguards").
`professorOwnership()` in `src/lib/authz/scopes.ts` dropped the legacy
name arm — the fragment is now flat `{ professorUsername: username }`
— and the `grade.period` per-row check in `policies.ts` is a byte-exact
username equality. Unstamped rows and malformed stamps (`''`,
whitespace/case drift) match **no** account: fail-closed. The 11
unresolved production rows stay unassigned and faculty-inaccessible by
design (nothing invents owners for them).

- Dev branch: `dev/authz-strict-ownership` (off `main-full-dev`);
  production PR: `feature/authz-strict-username-ownership` (off `main`,
  runtime half only — the A1 port convention). **Not merged or deployed
  without owner approval.**
- Evidence: unit tests 62/62 (9 new/rewritten strict tests: unstamped
  deny, malformed-stamp deny, stale-name deny, username-owns allow,
  falsy-fullName owns); golden matrix 100 checks / 95 rows / 0 failed —
  `FAC-ROSTER-FALLBACK` flipped to `FAC-ROSTER-UNSTAMPED` (200,
  `!contains:Systems Administration` — the fallback allowance is gone),
  new rows `GRD-SUBMIT-UNSTAMPED` (403 teaching load),
  `GRD-PERIOD-UNSTAMPED` (400 Not your section),
  `FAC-ROSTER-MALFORMED` (200, `''` stamp matches nothing); fixture 2
  (reassignment) unchanged; typecheck clean; lint 0 errors; fresh
  `next build`.
- Rollback: revert the PR — the data model is unchanged (stamps already
  present; phase-1 dual-write reads would return unchanged behavior for
  the current stamped dataset). The backfill tooling above is unaffected
  and remains the standing procedure for future unstamped rows.

## Why approval is required

`--apply` writes `professorUsername` on subject rows. It is idempotent,
backed up, and reversible (`--rollback` restores the exact pre-state),
but it is still a production data mutation: the owner reviews the
read-only report and approves the expected count first. Deploy phase 1
(dual-write code) to production BEFORE the backfill so the stamps are
meaningful; a backfill before the deploy is inert-but-harmless (the
legacy code ignores the field).

## Alternatives considered: reseed vs targeted backfill (2026-10-22)

Evaluated at the owner's request after PR #84 merged:
update the seed script and reseed a fresh database instead of running
the targeted backfill. Verdict: **rejected — the backfill stays.** The
seed already models the post-backfill end state (85 stamped of 96 rows
on a fresh seed; evidence: `scripts/eval-seed-vs-backfill.sh`, 13/13 on
a newly created disposable DB), and reseeding cannot migrate the 92
existing Atlas subject rows — that is what the backfill does. A fresh
reseed also adds no test coverage the harness lacks: the live
name-fallback arm is characterized by `verify-authz.sh` Fixture 1, and
the migration lifecycle (report, apply, idempotency, rollback,
strictness gates) by `verify-backfill-rehearsal.sh`. Reseeding any
existing database remains forbidden; the seed is for fresh installs
only.

## Categories the report prints (counts only, no PII)

| Category | Meaning | Phase-3 gate |
| --- | --- | --- |
| `stamped` | `professorUsername` set and non-empty | — |
| `orphaned-stamps` | stamped but no faculty account has that username | gate C: must be 0 |
| `invalid-stamps` | `professorUsername` is a dead (`''`) or corrupt-typed (non-string) value — matches neither fragment arm | manual fix, reported |
| `eligible` | unstamped + exactly ONE faculty `fullName` match | gate A: must be 0 |
| `ambiguous` | unstamped + 2+ accounts share that `fullName` | gate B: must be 0 |
| `unresolved` | unstamped + no account matches | informational (unowned today and after strict mode) |
| `eligible-cross-branch` | eligible rows whose account sits in another branch | informational |

Unresolved rows are safe to leave: nobody owns them via the name
fallback today either. Ambiguous rows need a manual decision (merge the
duplicate accounts, or pick the right account and stamp by hand).

## Preconditions (all must be true)

1. Phase 1 (dual-write code) is deployed to production.
2. Owner has reviewed the read-only report and approved the expected
   mutation count.
3. The Atlas production `MONGODB_URI` (from Vercel env or the operator's
   vault — it is not in the repo).
4. A quiet window: no faculty encoding grades mid-run.
5. `node` ≥ 24 on your machine (type stripping for the script).
6. Optional same-window owner action: create the production index
   `{branch: 1, professorUsername: 1}` (the dev seed already has it).

## Procedure

```bash
# 0. Generate and guard the backup key (KEEP IT — rollback depends on it).
openssl rand -hex 32 > /secure/vault/aics-backfill-$(date +%Y%m%d).key
chmod 600 /secure/vault/aics-backfill-*.key
export BACKUP_KEY="$(cat /secure/vault/aics-backfill-*.key)"

# 1. Point the tooling at PRODUCTION explicitly. MONGODB_DB is mandatory;
#    the printed "db:" line is the last human check before --apply.
export MONGODB_URI="mongodb+srv://<prod-cluster>/"
export MONGODB_DB=aics_portal

# 2. READ-ONLY assessment (zero writes — allowed against any host):
#    read the counts; N = the "eligible" number.
node scripts/backfill-professor-username.ts

# 3. Optional, the owner's own resolution session: list the DISTINCT
#    display names in the ambiguous / unresolved buckets (no student data).
node scripts/backfill-professor-username.ts --list-names

# 4. Strictness pre-check — expect gate-A FAIL (that is the pending work).
#    Exit 0 = clean; exit 3 = a gate is failing.
node scripts/backfill-professor-username.ts --strictness

# 5. Resolve ambiguous names first (merge/rename accounts or stamp by
#    hand), re-run step 2, and repeat until "ambiguous=0" and the eligible
#    count N is stable. Ambiguous rows are never auto-assigned.

# 6. Encrypted backup (reads only; ciphertext-only file on disk).
node scripts/backfill-professor-username.ts --backup-to /secure/vault/subjects-backfill-$(date +%Y%m%d).json.enc

# 7. Apply — --prod is REQUIRED because Atlas is non-local (the firewall
#    refuses the write otherwise; this is the accident guard). N must
#    equal the live eligible count or the run aborts before writing.
node scripts/backfill-professor-username.ts --apply --expect N --backup /secure/vault/subjects-backfill-<date>.json.enc --prod

# 8. Verify: report shows eligible=0; strictness shows gate-A PASS
#    (gates B/C should already be 0 after step 5; unresolved stays
#    informational). The apply output itself prints "verified N/N".
node scripts/backfill-professor-username.ts
node scripts/backfill-professor-username.ts --strictness
```

## Rollback (only with the owner's approval)

```bash
# Restores the exact pre-state per doc: $unset for absent fields, null
# for nulls, values for values. Idempotent; safe to re-run.
node scripts/backfill-professor-username.ts --rollback --backup /secure/vault/subjects-backfill-<date>.json.enc --prod

# Re-check: the report should show the pre-apply counts again.
node scripts/backfill-professor-username.ts
```

## Optional same-window index (owner decision)

```javascript
// mongosh against the same Atlas database:
db.subjects.createIndex({ branch: 1, professorUsername: 1 })
```

The dev seed creates this index (`scripts/seed-mongodb.ts`); production
does not have it yet. It is not required for correctness — the
ownership `$or` resolves via the existing `{branch, studentUsername}`
scans — but it sharpens the faculty load queries once stamped rows
dominate. Analysis in ADR-0009.
