[⬅️ Back to Index](./00_INDEX.md)

# Phase 7 Pre-flight + Dress Rehearsal (QA only)

Date: 2026-09-09 (local). Branch `fix/bug-fixes-findings`. PROD LOCKED throughout — every write below hit `aics_portal_qa` only. The 4 window questions remain pending; this rehearsal needed none of them.

## Commits

- `cb1544b` — Phase 7 pre-flight: rehash tool aborts on unset MONGODB_DB (standalone, pushed pre-authorized).
- (this report + hardened tool, pushed after — hash in index on push.)

## Scope audit (read-only, counts only)

- Identity collections queried by the login route: exactly one — `students` (all 13 `getCollection` identity lookups across login, change-password, session-auth, grades, attendance, faculty, notifications hit `students`; faculty/admin are role-docs inside it). Password fields exist nowhere else in `src` (grep-verified).
- QA counts at rehearsal start: 77 docs (75 student, 1 faculty, 1 admin); 3 scrypt, 74 plaintext (73 student + 1 admin). Faculty account already hashed.
- Conclusion: rehash scope = `students` collection in full — faculty + admin included, no extension needed.
- `/api/auth/demo`: env-gated (`NODE_ENV !== 'development'` → 404) in code; live-probed 200 in dev. No extra guard commit needed. Rotate the demo password question is moot post-Phase-6 (no credentials in bundle).

## Tool hardening (code only)

`scripts/rehash-passwords.ts` now: dry-run plan (db, collections, per-role counts, zero writes); `--apply` requires `--expect <N>` re-derived live at run time; concurrency guard (update filter matches the read-time password, 0 matches = abort); `--bump-tv` (default ON) / `--no-bump-tv` explicit flag, mode printed every run; post-apply self-verify with the app's own `verifyPassword` printing `verified X/X`; backup export `--backup-to` (AES-256-GCM, key via `BACKUP_KEY` env only, decrypt-verified before reporting, path + bytes only); `--rollback` restore (password + tokenVersion per `_id`); `MONGODB_DB` unset = abort. Prod will run in **bump mode**.

## Dress rehearsal (exact prod sequence, QA)

1. **Backup**: pre-image of 77 docs → encrypted → decrypt-verified. 16670 bytes, stored outside the repo (temp, deleted after). Contents never printed.
2. **Dry-run plan**: `total=77 hashed=3 to-rehash=74 per-role={"student":73,"admin":1}`.
3. **Apply** `--expect 74 --bump-tv`: `verified 74/74`, `remaining-plaintext=0`.
4. **Session kill**: pre-run cookie for a touched account → replay returns 401 after apply (mechanism: tv bump; re-proven by hand-edit +1 → 401 / restore → 200 on this build).
5. **Seed logins post-apply**: `juan.santos`, `maria.cruz`, `m.reyes` → all 200.
6. **Rollback drill**: `--rollback` restored all 77 docs byte-identical to the pre-image (verified by full diff: 77/77 identical; the `restored=75/77` line is `modifiedCount` semantics — 2 docs were already identical). Logins still worked. `--apply` re-run to final hashed state.
7. **Final QA state**: 77/77 hashed, 0 plaintext, grade `INC`/empty, 0 audits, 0 attendance probe docs, all three seed logins 200. No residue beyond intended password/tv changes.

### Two honest findings (both tooling/ops, app behaved correctly)

- **The `--expect` guard fired for real**: between dry-run and apply, a rehearsal login triggered hash-on-login on one account, so live count was 73 ≠ 74 and the tool aborted instead of proceeding. Re-derived `--expect 73`, applied clean. Lesson for the window: **freeze logins during the window** (hash-on-login upgrades bypass the tv bump for accounts it touches between backup and apply); the guard is the safety net, and it works.
- **Rollback counts**: `restored=75/77` is `modifiedCount`, not matched count — full diff proved 77/77 identical. No action needed, but the prod checklist says "diff, don't trust the counter."

## EXACT prod-window command list (top to bottom)

```bash
# 0. Pre-flight (before window): confirm the db line. Must show the prod DB name — else STOP.
MONGODB_DB=<PROD_DB_FROM_USER> node --experimental-strip-types scripts/rehash-passwords.ts
# 1. Backup (reads only). BACKUP_KEY via env, 64 hex chars, never CLI.
BACKUP_KEY=<hex> MONGODB_DB=<PROD_DB> node --experimental-strip-types scripts/rehash-passwords.ts --backup-to <BACKUP_PATH>.enc
#    -> expect: "backup ok: path=... bytes=... docs=<N>"
# 2. Dry run, record the to-rehash count as N.
BACKUP_KEY=<hex> MONGODB_DB=<PROD_DB> node --experimental-strip-types scripts/rehash-passwords.ts
# 3. Apply (inside window only). Freeze logins first.
BACKUP_KEY=<hex> MONGODB_DB=<PROD_DB> node --experimental-strip-types scripts/rehash-passwords.ts --apply --expect <N> --bump-tv --backup <BACKUP_PATH>.enc
#    -> expect: "verified N/N", "remaining-plaintext=0"
# 4. Verify: dry-run again (to-rehash=0), 3 API logins, replay one pre-window cookie -> 401.
# 5. Report + update 06 (BUG-003 Fixed-Verified) + tell user to rotate the credential.
```

## EXACT rollback command list (only on user order)

```bash
BACKUP_KEY=<hex> MONGODB_DB=<PROD_DB> node --experimental-strip-types scripts/rehash-passwords.ts --rollback --backup <BACKUP_PATH>.enc
# Then diff current state vs backup pre-image (77/77 identical expected) and re-verify logins.
# Do not improvise; ask the user first.
```

## Post-window checks

- Dry-run shows `to-rehash=0`; count query: 0 docs with non-`scrypt$` passwords.
- 3 API logins (named accounts) → 200; one pre-window cookie replay → 401.
- 06 registry BUG-003 → Fixed-Verified with counts + timings.
- User rotates the Mongo credential; agent updates env docs and verifies a fresh connect (no values in files/logs/reports).

## Hygiene

- No server running (port 3100 closed). All probe/backup/key temp files deleted (repo `scripts/tmp-*.mjs` removed; temp-dir jars/bodies/logs/enc/key removed). Backup ciphertext deleted after rehearsal (prod backup will live at the user's path, encrypted).
- No secrets in this report, the tool output selections, or any commit (passwords, key, and backup contents never printed).
