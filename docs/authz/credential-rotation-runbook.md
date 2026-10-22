# Demo-credential rotation runbook: production (Atlas, aics_portal)

Status: **PROPOSED — nothing has been executed against production.**
Prepared 2026-10-22 on `dev/credential-rotation-prep` (off `main-full-dev`)
as the separate security follow-up the owner requested alongside the
issue #72 phase-3 review. No rotation, no seed change, no doc change is
live until the owner approves and the phases below run in order.

## 1. Exposure being remediated

`CONTRIBUTING.md` on `main` publishes three demo passwords
(`student123` / `faculty123` / `admin123`). In production they sit behind
Vercel Authentication (verified 2026-10-22: edge 302/SSO interception,
app-level session gate 401s, forged-cookie bypass fails), so the public
values alone do not grant access. The residual risks:

1. **Value sharing.** The seed assigns `student123` to ~77 student
   accounts, `faculty123` to BOTH faculty accounts (`m.reyes`,
   `l.bautista`), `admin123` to BOTH admins (`admin`, `admin2`).
   Rotating only the three documented usernames would leave the same
   public values valid on every other account — and those usernames are
   visible in-app (rosters, directories). Remediation must be
   **value-wide**, which is what `scripts/rotate-demo-credentials.ts`
   does: it rotates every account whose stored password verifies against
   one of the three documented defaults.
2. **Reseed regression.** Any future production reseed would silently
   restore the documented defaults. Guard (proposed, same branch):
   `scripts/seed-mongodb.ts` refuses to seed a REMOTE database unless
   `DEMO_PW_STUDENT` / `DEMO_PW_FACULTY` / `DEMO_PW_ADMIN` are injected
   via env, so a reseed either aborts or carries the rotated values
   forward explicitly. Seed log lines no longer print password values.
3. **Docs republishing.** `CONTRIBUTING.md` (dev branch copy, proposed)
   drops the password column. Git history still contains the old values —
   the rotation phase is the actual fix; the doc change only stops
   re-publishing them.

## 2. Owner decision points (approve before R2)

| # | Decision | Options | Recommendation |
| - | -------- | ------- | -------------- |
| D1 | Rotate at all, or accept Vercel Auth as the permanent control | (a) rotate value-wide; (b) keep SSO gate only | (a) if any chance the Vercel Auth edge is ever relaxed; else (b) is defensible |
| D2 | Source of the new values | owner-chosen secrets in env at apply time | owner-chosen, distinct per role, min 8 chars |
| D3 | Rotation scope | (a) value-wide (all ~81 carriers); (b) only the 3 documented accounts | (a) — see exposure item 1 |
| D4 | Session kill | bump `tokenVersion` (all demo sessions die, forced re-login) | bump (default ON in the script) |
| D5 | Docs strip timing | with R2, or after a soak period | with R2 |

## 3. Phases

### R1 — prepare (no production writes)

1. Owner reviews this runbook + the proposed script
   `scripts/rotate-demo-credentials.ts` (pattern:
   `rehash-passwords.ts` + `prod-reseed.ts` guards:
   `DEMO_ROTATE_SANCTIONED=1`, explicit `MONGODB_DB`, encrypted
   AES-256-GCM backup, `--expect` count re-derivation, per-doc
   concurrency guard, post-write self-verification with the app's own
   `verifyPassword`; counts-only logging; new values via env only).
2. QA rehearsal on a throwaway local mongod (mirrors
   `verify-rehash-rehearsal.sh`): dry plan -> `--backup-to` ->
   `--apply --expect <N> --backup <path>` -> login smoke with new
   values -> confirm old defaults fail -> `--rollback` restores the
   exact pre-state. **Not yet written or run** — the rehearsal script is
   the first task if the owner approves the approach.
3. Move the encrypted backup OUT of the sandbox immediately after it
   is written (sandbox resets destroyed `db/` twice — recorded hazard).

### R2 — apply (owner-sactioned window, production)

```bash
# 1. plan (read-only)
MONGODB_URI=<prod-uri> MONGODB_DB=aics_portal \
  node --experimental-strip-types scripts/rotate-demo-credentials.ts
#    -> note the printed MATCHED TOTAL, use it as --expect

# 2. encrypted pre-image
MONGODB_DB=aics_portal BACKUP_KEY=<64-hex> \
  node --experimental-strip-types scripts/rotate-demo-credentials.ts \
  --backup-to /backups/demo-creds-<date>.json.enc

# 3. rotate (new values via env; kills every demo session)
DEMO_ROTATE_SANCTIONED=1 MONGODB_DB=aics_portal BACKUP_KEY=<64-hex> \
  DEMO_PW_STUDENT=<new> DEMO_PW_FACULTY=<new> DEMO_PW_ADMIN=<new> \
  node --experimental-strip-types scripts/rotate-demo-credentials.ts \
  --apply --expect <N> --backup /backups/demo-creds-<date>.json.enc
```

Post-checks (owner, manual): smoke-login the three documented accounts
with the new values (through the Vercel Auth-protected URL); confirm the
documented defaults now fail; confirm `l.bautista` / `admin2` /
`maria.cruz` also reject the old values; watch error logs for a burst of
failed logins (expected as stale sessions die).

### R3 — prevent regression

1. Merge the seed guard (`seed-mongodb.ts` remote-seed refusal +
   env-injected values) so a reseed can never silently revert rotation.
2. Merge the `CONTRIBUTING.md` password-column removal (main-branch PR
   from the dev-branch source, runtime-whitelist-clean).
3. Re-run the dry plan monthly-ish: matched count must stay 0.

## 4. Rollback

`--rollback --backup <path>` restores password + `tokenVersion` per
`_id` from the encrypted pre-image (ask the owner before using; never
improvise). Rollback re-exposes the published values — treat it as a
last resort; re-running R2 with fresh values is the preferred
"undo".

## 5. Alternative: keep the demo credentials, rely on Vercel Auth

If the owner decides Vercel Authentication is the permanent control
(D1 = b), skip R2/R3-rotation; still consider the seed guard + docs
strip (they cost nothing and reduce blast radius if the edge gate is
ever relaxed). Record the decision in `TODO.md`.
