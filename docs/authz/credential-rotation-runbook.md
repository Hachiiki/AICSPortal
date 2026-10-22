# Demo-credential rotation runbook: production (Atlas, aics_portal)

Status: **PROPOSED — nothing has been executed against production.**
Prepared 2026-10-22 on `dev/credential-rotation-prep` (off `main-full-dev`)
as the separate security follow-up the owner requested alongside the
issue #72 phase-3 review. Rotation has NOT been run: no password value on
any production account has changed, and the phases below still execute
only after owner approval, in order.
Hardened 2026-10-23 after the read-only toolkit review: F1 (`--apply`
backup pre-flight decrypt/validate before any write), F2
(parsed-hostname remote-seed classification — the old substring guard
was bypassable), F3 (`--rollback` requires the same owner sanction as
`--apply`), plus the operational notes in §6 and the full
disposable-database rehearsal (§6.4, 48/48 checks).
Integration status (2026-10-23): the toolkit (script + seed guard + this
runbook) is merged into `main-full-dev` (`45cc38a`, synced at `31a4256`),
and the `CONTRIBUTING.md` password-table removal is live on `main` via
PR #87 (`f5a63c5`) — R3 items 1 and 2 are therefore complete. What
remains open is the owner's D1-D5 decision set (§2) and, if approved,
the R2 window.

## 1. Exposure being remediated

Three demo password values were published in `CONTRIBUTING.md` until
PR #87 (`f5a63c5`, merged 2026-10-22) removed the table from `main`.
Removing the table did NOT unpublish them: the values remain readable
in Git history, and the dev-branch seed script and agent guide still
carry them as local-testing defaults — treat all three as public. The
production login page is intentionally public (the owner's stated
access model: no Vercel SSO / Deployment Protection; checked read-only
2026-10-23 — `aics-portal.vercel.app` serves the login page directly,
HTTP 200, zero redirects, and `vercel.json` carries no protection
config). An earlier draft of this runbook credited a Vercel
Authentication edge gate (edge 302/SSO interception, "verified
2026-10-22") with keeping the values out of reach; that does not match
the current public behavior and MUST NOT be relied on. The app-level
session gate (401 without a valid session cookie) stops account
access, but it is the only layer in front of the demo accounts, and the
public values are exactly what it cannot help with — anyone holding a
value can attempt it against every username visible in-app. The risks:

1. **Value sharing.** The seed assigns `student123` to ~79 student
   accounts (74-roster + named extras + the `rogue.role` fixture; see
   the 2026-10-23 rehearsal census), `faculty123` to BOTH faculty
   accounts (`m.reyes`, `l.bautista`), `admin123` to BOTH admins
   (`admin`, `admin2`). Rotating only the three documented usernames
   would leave the same public values valid on every other account —
   and those usernames are visible in-app (rosters, directories).
   Remediation must be **value-wide**, which is what
   `scripts/rotate-demo-credentials.ts` does: it rotates every account
   whose stored password verifies against one of the three documented
   defaults. The authoritative count always comes from a live dry plan
   (§R2 step 0) — never from this paragraph.
2. **Reseed regression.** Any future production reseed would silently
   restore the documented defaults. Guard (landed on `main-full-dev`
   with the toolkit, `45cc38a`):
   `scripts/seed-mongodb.ts` refuses to seed a REMOTE database unless
   `DEMO_PW_STUDENT` / `DEMO_PW_FACULTY` / `DEMO_PW_ADMIN` are injected
   via env, so a reseed either aborts or carries the rotated values
   forward explicitly. Seed log lines no longer print password values.
3. **Docs republishing.** DONE: PR #87 (merged 2026-10-22, `f5a63c5`)
   removed the password table from `CONTRIBUTING.md` on `main`. Git
   history still contains the old values — the rotation phase is the
   actual fix; the doc change only stops re-publishing them.

## 2. Owner decision points (approve before R2)

| # | Decision | Options | Recommendation |
| - | -------- | ------- | -------------- |
| D1 | Rotate at all, or keep the demo values as a documented property of the demo dataset | (a) rotate value-wide; (b) keep the values (public login page + app-level session auth + rate limits are the only controls) | (a) — the login page is public by design and the values live in Git history, so there is no edge gate to fall back on; (b) is defensible only while every account is a demo account |
| D2 | Source of the new values | owner-chosen secrets in env at apply time | owner-chosen, distinct per role, min 8 chars |
| D3 | Rotation scope | (a) value-wide (every carrier of the three values); (b) only the 3 documented accounts | (a) — see exposure item 1 |
| D4 | Session kill | bump `tokenVersion` (all demo sessions die, forced re-login) | bump (default ON in the script; see §6.3 for the `--no-bump-tv` override) |
| D5 | Docs strip timing | DONE — PR #87 merged the strip to `main` on 2026-10-22, before R2 (the values stay in Git history regardless; see §1 item 3) | executed; nothing further to decide |

## 3. Phases

### R1 — prepare (no production writes)

1. Owner reviews this runbook + the proposed script
   `scripts/rotate-demo-credentials.ts` (pattern:
   `rehash-passwords.ts` + `prod-reseed.ts` guards:
   `DEMO_ROTATE_SANCTIONED=1` for BOTH `--apply` and `--rollback`,
   explicit `MONGODB_DB`, encrypted AES-256-GCM backup,
   `--expect` count re-derivation, `--apply` backup pre-flight
   (decrypt + shape + count + id coverage, all BEFORE the first write),
   per-doc concurrency guard, post-write self-verification with the app's
   own `verifyPassword`; counts-only logging; new values via env only).
2. QA rehearsal on a throwaway local mongod:
   **`scripts/verify-rotate-rehearsal.sh`** — written and first executed
   2026-10-23, 48/48 checks pass (see §6.4). Re-run it after any change
   to the rotation toolchain.
3. Move the encrypted backup AND its key OUT of any sandbox/temporary
   workspace immediately after they are written (sandbox resets destroyed
   `db/` twice — recorded hazard; see §6.5).

### R2 — apply (owner-sanctioned window, production)

**Step 0 — re-derive the census.** NEVER reuse a previous account count
(not the ~81 estimate, not the 83 from the 2026-10-23 rehearsal):
accounts are created and reset between sessions. The live dry plan in
step 1 prints the authoritative `MATCHED TOTAL`; that number — and only
that number — is the `--expect` for step 3.

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

The `--apply` step requires `BACKUP_KEY` in the environment because it
**pre-flight-decrypts the backup before touching the database** (F1):
GCM integrity + entry shape + count === live plan + every live `_id`
present in the backup. A backup that cannot be proven usable aborts the
run with zero writes — discovering a dead backup at rollback time is the
worst possible moment.

If the plan prints `ANOMALY: role/value mismatch ...` (expected on the
production-shape census — see §6.1), resolve the anomaly investigation
FIRST; only an explicit owner decision records `--allow-mismatch`.

Post-checks (owner, manual): smoke-login the three documented accounts
with the new values; confirm the documented defaults now fail; confirm
`l.bautista` / `admin2` / `maria.cruz` also reject the old values; watch
error logs for a burst of failed logins (expected as stale sessions die).

### R3 — prevent regression

1. DONE 2026-10-23 — seed guard landed on `main-full-dev` with the
   toolkit (`45cc38a`, synced at `31a4256`): `seed-mongodb.ts` remote-seed
   refusal with parsed-hostname classification + env-injected values, so
   a reseed can never silently revert rotation. Scripts are dev-only
   files under the branch topology; there is no `main` half to port.
2. DONE 2026-10-22 — the `CONTRIBUTING.md` password-table removal is
   live on `main` via PR #87 (`f5a63c5`, docs-only, whitelist-clean).
3. OPEN, meaningful only after R2 runs: re-check the dry plan
   periodically — the matched count must stay 0 (before R2 it prints
   the full census, because rotation has not been executed).

## 4. Rollback

`--rollback --backup <path>` restores password + `tokenVersion` per
`_id` from the encrypted pre-image. **Requires
`DEMO_ROTATE_SANCTIONED=1`** — the rollback re-publishes the documented
demo defaults, so it is gated exactly like the rotation itself; it can
never be run casually (F3). Ask the owner before using; never improvise.

Rollback re-exposes the published values — treat it as a last resort;
re-running R2 with fresh values is the preferred "undo". Restore
semantics: the BACKED-UP state wins — any password/tokenVersion change
made on a covered account AFTER the backup was taken is overwritten
(acceptable for demo-account emergency recovery, but say it out loud
when you run it).

## 5. Alternative: keep the demo credentials as a documented demo-dataset property

If the owner decides D1 = b — keep the values — the exposure is accepted
knowingly: the login page is public by design, the values remain in Git
history and dev-branch files, and the app-level controls (session auth,
RBAC, rate limits) are the protection. There is no edge gate to lean on
(an earlier draft of this section assumed one; see §1). The seed guard
and docs strip in R3 are already landed either way, and nothing short of
R2 changes the values on the accounts. Record the decision in `TODO.md`
and re-derive the census before any later rotation.

## 6. Operational notes (added 2026-10-23, hardening review)

### 6.1 Expected anomaly: the seeded `rogue.role` fixture

The seed deliberately inserts a login-characterization fixture
(`username: rogue.role`, `role: 'teacherr'` — a corrupt role string —
carrying the student demo value; see `scripts/seed-mongodb.ts`,
authorization cast). On any production-shape census the dry plan will
print:

```
ANOMALY: role/value mismatch: account with role 'teacherr' carries the student demo value
```

and `--apply` will **abort without `--allow-mismatch`**. This is the
fail-closed behavior working as intended — do NOT reflexively add the
flag. Required investigation before ANY mismatch override:

1. Confirm the anomalous account IS the seeded fixture: inspect the doc
   (username `rogue.role`, studentNumber 251903, role `teacherr`, branch
   commonwealth) and confirm it exists because the production reseed
   used this seed script.
2. Confirm no OTHER anomalies appeared: the dry plan lists every
   mismatch; a single expected fixture line is fine, anything else
   (unknown usernames, unexpected roles, real faculty carrying student
   values) stops the run until explained.
3. Only then does the owner record the decision to run with
   `--allow-mismatch` (the flag is an owner decision, not an operator
   convenience). The fixture is rotated with the student value like any
   other carrier; its corrupt role already fails login (L3
   characterization), so rotating its password changes nothing about
   its (non-)access.

### 6.2 Partial-rotation failure and recovery

`--apply` updates one doc at a time. Two abort modes leave a partial
rotation:

- **Concurrency-guard abort**: a doc changed between the scan and its
  update (`matchedCount === 0`) — the run aborts immediately; docs
  already updated stay rotated.
- **Process death** (crash, kill, network loss mid-run): same shape,
  no clean message.

A partial rotation is not inherently inconsistent: every half is
individually valid; some accounts take the new value, the rest keep the
published one. Recovery procedure (verified end-to-end in the
rehearsal, §6.4):

1. Run the dry plan — it reports the number of accounts still on the
   OLD values (the un-rotated tail).
2. Decide with the owner: EITHER finish the rotation by re-running R2
   steps 1-3 with a FRESH backup and `--expect` = the remaining count
   (preferred — ends in the rotated state), OR restore the pre-state
   with the sanctioned `--rollback --backup <the original backup>`
   (last resort — re-publishes the defaults).
3. `--rollback` restores ALL docs in the backup (rotated tail AND
   untouched head — restoring an untouched doc is a no-op write), so it
   heals a partial state in one pass. Note the §4 caveat: post-backup
   changes to restored fields are overwritten.
4. Re-verify with the dry plan: matched count is either 0 (finished
   rotation) or the full census (rolled back) — nothing in between.

### 6.3 `--no-bump-tv` (D4 override)

Default behavior bumps `tokenVersion` on every rotated doc, which
invalidates every existing session for those accounts at the next API
call (the app's `getAuthedSession` compares the token's `tv` claim
against the live DB value — same mechanism as logout/password-change
revocation). `--no-bump-tv` skips the bump, so pre-rotation sessions
SURVIVE the rotation. Purpose: rehearsals or an explicit owner decision
(D4 = keep sessions). Implications: anyone holding a valid demo session
at rotation time retains access until that session expires naturally —
for public-value demo accounts that is exactly the audience you are
trying to lock out. Do not use it for the production rotation unless the
owner has consciously chosen D4 = no-kill.

### 6.4 Disposable-database rehearsal (`scripts/verify-rotate-rehearsal.sh`)

One invocation, everything throwaway, never leaves localhost (the
remote-guard tests use a reserved `.invalid` hostname that cannot
resolve). Requires the local mongod binary under `db/` and
`node_modules` (see `verify-rehash-rehearsal.sh` for provisioning).

```bash
bash scripts/verify-rotate-rehearsal.sh
```

What it proves, and how to read the result:

- Unit tests (`bun test scripts/lib/`) run first — the hostname
  classification regression suite (deceptive URIs, malformed URIs).
- Seeds a throwaway DB and asserts 83 value carriers + the `rogue.role`
  anomaly line (the census baseline).
- F2 guard behavior: a remote URI aborts BEFORE any network I/O; a
  deceptive URI (credentials containing `localhost`) is classified
  REMOTE; env-injected values pass the guard and reach the connect.
- Encrypted backup: written, decrypt-verified, ciphertext-only (no
  scrypt strings, no usernames, no password values in the file).
- Eight negative preflight drills (missing/invalid sanction for apply
  AND rollback, wrong `BACKUP_KEY`, byte-corrupted backup,
  count-mismatched backup, id-uncovered backup, wrong `--expect`) —
  after EVERY drill a write-canary re-probes the database state and
  must see it unchanged: the aborts demonstrably happen before any
  write.
- Positive cycle: sanctioned apply 83/83 updated + self-verified, dry
  plan matched 0, `tokenVersion` bumped on all 83 (session kill),
  sanctioned rollback 83/83, dry plan matched 83 again, pre-state
  restored.
- Partial-failure drill: constructs a half-rotated state (41 old / 42
  new), then proves rollback heals it in one pass.

Exit code 0 and `passed=N failed=0` is the pass condition; any FAIL
line names the broken invariant. First full run: 2026-10-23,
48/48 PASS.

### 6.5 BACKUP_KEY and backup handling

- **Generation**: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
  (or `openssl rand -hex 32`). 64 hex chars, 32 bytes — AES-256-GCM key.
- **Transport**: environment variable or a `chmod 600` env file read by
  the operator — never a CLI argument (process listings capture argv),
  never committed, never pasted in chat/logs.
- **Storage**: the `.enc` backup and the key are SEPARATE artifacts —
  store them apart (backup in backup storage, key in the owner's secret
  manager). Possession of BOTH restores the published demo passwords;
  treat the pair as sensitive.
- **Durability**: move both OUT of any sandbox or temporary workspace
  immediately after creation — sandbox resets destroyed `db/` twice in
  this project's history; a backup that only ever existed in the
  sandbox does not exist.
- **Loss**: if the key is lost, the backup is permanently
  undecryptable (GCM). That is survivable BY DESIGN: the fallback is
  re-running R2 with fresh values (rotation, not restoration), so the
  key is an emergency convenience, not a lifeline. Plan accordingly —
  do not let key-loss anxiety drive weak key handling (e.g. emailing it).
- **After a successful rotation**, the pre-image backup of the OLD
  values is still sensitive (it restores published passwords) — keep it
  encrypted + access-controlled until the owner decides to destroy it.
