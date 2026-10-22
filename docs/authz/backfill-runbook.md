# professorUsername backfill runbook: production (Atlas, aics_portal)

The one-time A1 phase-2 migration (issue #72): stamps
`subjects.professorUsername` on every unstamped row whose display name
resolves to exactly one faculty account, so teaching ownership stops
depending on mutable display names. Ambiguous (duplicate-name) and
unresolved rows are **never auto-assigned** — they are reported for manual
resolution. Tool: `scripts/backfill-professor-username.ts` (pattern:
`scripts/rehash-passwords.ts`). Full local proof:
`scripts/verify-backfill-rehearsal.sh` (74/74 on a throwaway mongod,
2026-10-22).

**Status (2026-10-22):**

- Backfill tooling: **landed on `main-full-dev`** (report / strictness /
  backup / apply / rollback + production firewall).
- Local dev DB: **verified.** The rehearsal seeded the dev database,
  injected duplicate-name, cross-branch, dead-value, and orphaned-stamp
  conditions, then ran report -> strictness FAIL -> backup -> apply ->
  idempotency -> guard abort -> rollback (exact pre-state) -> re-apply.
  Fragment equivalence confirmed: the runtime ownership filter matches
  the same rows before and after stamping.
- Production (Atlas): **not yet run.** This runbook is the owner's
  procedure. Nothing in the sandbox holds the production URI, and the
  tool's firewall refuses non-local mutations without `--prod`.

## Why approval is required

`--apply` writes `professorUsername` on subject rows. It is idempotent,
backed up, and reversible (`--rollback` restores the exact pre-state),
but it is still a production data mutation: the owner reviews the
read-only report and approves the expected count first. Deploy phase 1
(dual-write code) to production BEFORE the backfill so the stamps are
meaningful; a backfill before the deploy is inert-but-harmless (the
legacy code ignores the field).

## Categories the report prints (counts only, no PII)

| Category | Meaning | Phase-3 gate |
| --- | --- | --- |
| `stamped` | `professorUsername` set and non-empty | — |
| `orphaned-stamps` | stamped but no faculty account has that username | gate C: must be 0 |
| `invalid-empty` | `professorUsername === ''` (dead value) | manual fix, reported |
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
