[⬅️ Back to Index](./00_INDEX.md)

# Phase 7 Window Report — Production Rehash

Window: 2026-09-10 00:00–00:30 Asia/Manila. Branch `fix/bug-fixes-findings` @ `84ef928` (verified before GO; tree clean). Logins frozen at GO, unfrozen after step 7 passed. No guard trips, no aborts, no rollbacks, no improvisation.

## Commands and numbers (in order)

1. **Pre-flight**: `MONGODB_DB=aics_portal node --experimental-strip-types scripts/rehash-passwords.ts` → `db: aics_portal` ✓ (anything else would have stopped the window).
2. **Backup**: `--backup-to C:\Projects\aics-backup\prod-2026-09-10.json.enc` → `backup ok: bytes=15716 docs=77`, decrypt-verified by the tool. Key via user-held `BACKUP_KEY` (shape-verified only, never printed); `.env.local` confirmed gitignored.
3. **Dry run**: `total=77 hashed=0 to-rehash=77 per-role={"student":75,"faculty":1,"admin":1}` → **N2 = 77**, announced before applying.
4. **Apply**: `--apply --expect 77 --bump-tv --bump-all --backup ...` → `backup verified: docs=77`, **`verified 77/77`**, **`remaining-plaintext=0`**, **`bumped=77`**.
5. **Verify (read-only)**: dry-run → `to-rehash=0`; count query → **0 non-scrypt passwords**; tv aggregate → **min=2, none missing, n=77** (rehashed docs got +1 from the loop and +1 from `--bump-all`; every pre-window token is dead by the revocation check proven twice on QA).
6. **Replay check**: no pre-window prod cookie existed to replay; kill-by-bump relies on the identical code path proven 401 on QA (logout replay, change-password replay, hand-edit +1). Fresh sessions unaffected.
7. **User test logins** (user ran, app pointed at prod DB): `juan.santos` → 200, `m.reyes` → 200, no errors. **Unfrozen.**

Timings: the whole sequence ran in minutes inside the window (per-command durations were not instrumented — honest gap, not a risk: every step prints its own counts).

## State change summary

- `aics_portal.students`: 77/77 passwords now `scrypt$`, 0 plaintext, `tokenVersion` ≥ 1 on all docs (min 2). Faculty + admin included.
- Nothing else written. No other collection touched. No schema change (additive `tokenVersion` only).

## Rollback (NOT used — recorded only)

On user order only: `BACKUP_KEY` in env, `MONGODB_DB=aics_portal ... --rollback --backup C:\Projects\aics-backup\prod-2026-09-10.json.enc`, then diff vs pre-image (expect all identical), re-verify logins. Do not improvise.

## Next

- **User rotates the Mongo credential in Atlas now**, says "rotated"; agent updates env docs and verifies a fresh connect (never handles the value).
- BUG-003 status: Fixed-Verified (this report is the evidence).
