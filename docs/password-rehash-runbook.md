# Password rehash runbook — production (Atlas, aics_portal)

The one-time migration that converts every legacy plaintext password in
the `students` collection to the app's scrypt format (`scrypt$salt$hash`).

**Status (2026-10-15):**

- Local dev DB: **done.** `scripts/run-rehash-local.sh` rehearsed the
  full procedure against the seeded dev database — dry-run, encrypted
  backup, apply with `--expect`, self-verify, login checks — 13/13
  passing, zero plaintext remaining, backup + key retained under
  `db/backups/` (gitignored).
- Fresh seeds: **safe by construction.** `scripts/seed-mongodb.ts` now
  hashes at seed time, so new environments are born without plaintext.
- Production (Atlas): **STILL GATED on owner approval.** Everything
  below is ready to execute; nothing has touched Atlas. Login-time
  hash upgrades continue to convert accounts organically in the
  meantime (single-doc, concurrency-safe).

## Why approval is required

`--apply --bump-tv` logs out every affected user (their tokenVersion
bumps, killing live sessions). With `--bump-all` every account is
logged out, including already-hashed ones. Coordinate the window, and
announce the forced re-login, before running.

## Preconditions (all must be true)

1. Owner has approved the window and the logout impact.
2. You have the Atlas production `MONGODB_URI` (from Vercel env or the
   operator's vault — it is not in the repo).
3. A quiet window: no registrar posting payments, no faculty encoding
   grades (the run takes minutes, but avoid mid-write races).
4. `node` ≥ 24 on your machine (type stripping for the script).

## Procedure

```bash
# 0. Generate and guard the backup key (KEEP IT — rollback depends on it).
#    Store it outside the repo, e.g. a vault or an encrypted drive.
openssl rand -hex 32 > /secure/vault/aics-rehash-$(date +%Y%m%d).key
chmod 600 /secure/vault/aics-rehash-*.key
export BACKUP_KEY="$(cat /secure/vault/aics-rehash-*.key)"

# 1. Point the tooling at PRODUCTION explicitly. MONGODB_DB is mandatory —
#    the script refuses to run without it; the printed "db:" line is the
#    last human check before --apply.
export MONGODB_URI="mongodb+srv://<prod-cluster>/"
export MONGODB_DB=aics_portal

# 2. Dry-run: counts only, zero writes. Read the line carefully:
#    db: aics_portal   total=… hashed=… to-rehash=N per-role={…}
node scripts/rehash-passwords.ts

# 3. Encrypted backup of every password + tokenVersion (AES-256-GCM,
#    decrypt-verified before the file is trusted, contents never printed).
node scripts/rehash-passwords.ts --backup-to /secure/vault/students-$(date +%Y%m%d).json.enc

# 4. Apply. --expect MUST be re-derived from the dry-run you just ran —
#    never trust a count from yesterday. Bumps tokenVersion on rehashed
#    docs (their sessions die; they simply re-login).
node scripts/rehash-passwords.ts --apply --expect <N> --bump-tv \
  --backup /secure/vault/students-$(date +%Y%m%d).json.enc

# 5. (Optional, recommended once) Kill ALL sessions including
#    already-hashed accounts — belt-and-braces after a credential migration:
node scripts/rehash-passwords.ts --apply --expect 0 --bump-all \
  --backup /secure/vault/students-$(date +%Y%m%d).json.enc
```

## What the script guarantees

- `--apply` aborts unless the live to-rehash count equals `--expect N`
  (state changed under you → investigate, don't proceed).
- Every doc is rehashed with a per-doc round-trip check through the
  app's own `verifyPassword` — a mismatch aborts the run.
- The write filter matches the read-time plaintext (concurrency guard),
  so a simultaneous hash-on-login upgrade can never be clobbered.
- Post-apply self-verify re-reads every updated doc and verifies it
  again; the run fails loudly if any plaintext remains.
- The whole run is idempotent and resumable: already-hashed docs are
  skipped, so an aborted run can simply be re-run after investigation.

## Verification after the run

1. Script output ends with `verified N/N` and `remaining-plaintext=0`.
2. Log in through the real app as one known account per role
   (student / faculty / admin) — expect success.
3. A wrong-password attempt returns 401.
4. Spot-check the collection: every `password` starts with `scrypt$`.

## Rollback (last resort, owner-approved only)

```bash
export BACKUP_KEY="$(cat /secure/vault/aics-rehash-*.key)"
export MONGODB_URI="mongodb+srv://<prod-cluster>/"
export MONGODB_DB=aics_portal
node scripts/rehash-passwords.ts --rollback --backup /secure/vault/students-<date>.json.enc
```

Restores password + tokenVersion per `_id` from the encrypted backup.
Ask before using; never improvise. Note that rollback returns the DB to
plaintext passwords — it exists for a failed-run investigation, not for
routine use.

## Local rehearsal

`scripts/run-rehash-local.sh` runs the identical procedure against the
local dev database (boot mongod → dry-run → backup → apply → login
checks) and is safe to re-run any time.
