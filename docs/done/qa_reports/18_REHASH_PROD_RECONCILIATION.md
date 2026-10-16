[Back to Index](./00_INDEX.md)

# Report 18 - Production Password Rehash: Evidence Reconciliation + Fresh-Environment Toolchain Proof

Date: 2026-10-16 (local). Working tree: `main` @ 2c8490d (post PR #47); dev artifacts committed to `main-full-dev`. PROD UNTOUCHED this session - zero Atlas writes, zero logins against the live app, no credential handling.

## Trigger

Owner directive 2026-10-16: "do the rehashing password" - pointing at the Infrastructure "Remaining" item ("Production password rehash - owner-gated window; runbook ready"). Reconciling that item against the tracked QA evidence changed the outcome: no production run is needed, because production was already rehashed before go-live.

## Part A - Finding: production was already rehashed (2026-09-10, before go-live)

The 2026-10-15 TODO/runbook claim "Production (Atlas): STILL GATED ... nothing has touched Atlas" is stale. The evidence on this same branch, all dated 2026-09-10:

| Evidence | Where | What it proves |
|---|---|---|
| Window report 14 | 14_PHASE7_WINDOW_REPORT.md | Window 2026-09-10 00:00-00:30 PHT, run on the owner's machine against the production DB: encrypted backup (77 docs, owner-held key, C:\Projects\aics-backup\prod-2026-09-10.json.enc) -> apply --expect 77 --bump-tv --bump-all -> verified 77/77, remaining-plaintext=0, bumped=77; owner-run logins juan.santos and m.reyes -> 200 |
| Closeout 15, Task 7 Part A | 15_CAMPAIGN_CLOSEOUT.md | Direct DB-level count: db: aics_portal, 77 docs, 0 non-scrypt, min tv 2 / 0 below, test-account hashes PASS (juan.santos, maria.cruz, m.reyes) |
| Registry BUG-003 | 15 section 7 | "Fixed-Verified (77/77 scrypt, window report 14)" |
| Go-live report 16 | 16_GOLIVE_RUNBOOK.md | Vercel deploy pointed at the same credential/database ("set MONGODB_URI = current credential"); smoke table all PASS against https://aics-portal.vercel.app the same day |

No later document shows production being re-seeded with plaintext: seeds hash at birth since commit 6eee07d, and the 2026-10-15 "76 legacy accounts" rehash was the freshly re-seeded DEV database in a new sandbox - not Atlas.

Root cause of the stale claim: the 2026-10-15 session (commit 6eee07d) rehashed the re-seeded dev DB, authored the runbook and the TODO line without the campaign context (reports 14-16) - a between-sessions context loss. Corrections applied today: TODO.md (item flipped to done with the true history), the runbook status section (evidence: this report), and the index entry below.

## Part B - Fresh-environment toolchain proof (33/33)

The last live drill of scripts/rehash-passwords.ts predated PRs #44-#47 and ran in an older sandbox, so before closing the topic the toolchain was re-proven end-to-end in THIS environment against the current working tree (src/lib/password.ts unchanged on main since the campaign - the tool imports and exercises it on every run).

scripts/verify-rehash-rehearsal.sh (committed with this report) rebuilds a production-shaped state from git history alone: it provisions mongod 8.0.12 into the gitignored db/, seeds the LAST plaintext-era seed (6eee07d~1) - 77 identities, all plaintext - then executes the runbook verbatim. One invocation on purpose: background processes do not survive between shell sessions here.

Results (2026-10-16, node v24.21.0, 33/33):

| Step | Expected | Got |
|---|---|---|
| dry-run | counts only, zero writes | total=77 hashed=0 to-rehash=77 per-role={"student":75,"faculty":1,"admin":1} |
| encrypted backup | decrypt-verified ciphertext, docs=77 | backup ok: bytes=15716 docs=77 |
| apply --expect 77 --bump-tv | verified 77/77, remaining-plaintext=0 | verified 77/77, remaining-plaintext=0 |
| --expect guard (deliberately wrong count) | ABORT before any write | fired: live count 0 != --expect 76; post-apply state intact |
| rollback drill | restored 77/77, plaintext state back | restored=77/77; dry-run to-rehash=77 |
| re-apply | verified 77/77 | verified 77/77, remaining-plaintext=0 |
| --bump-all (runbook step 5) | bumped=77, min tv >= 1 | bumped=77; spot-check minTv=2 |
| spot-check | 100% scrypt$ prefixes | scrypt=77/77, plain=0 |
| real-app logins (next dev, route code identical to prod) | 200 x3 + session cookie | student (juan.santos), faculty (m.reyes), admin -> 200 + ok:true + set-cookie |
| wrong password | 401 {ok:false} | 401 {ok:false} |

Committed-script note: the version in the repo derives its artifact stamp from the run date; today's execution used 20261016 (artifacts listed under Hygiene). The node MODULE_TYPELESS_PACKAGE_JSON warning during .ts execution is cosmetic (ESM reparse) and appeared in earlier sessions' runs too.

## Part C - Remaining owner actions (optional, for completeness)

1. Optional live proof against Atlas (read-only, seconds): with the production MONGODB_URI exported and MONGODB_DB=aics_portal, run `node scripts/rehash-passwords.ts` - expect `to-rehash=0` and hashed equal to the account count (every account created since go-live hashes at birth or on first change).
2. The deferred Mongo credential rotation (report 16 section 9, "PENDING - before real student data exists"; the credential reached the 2026-09-08 test brief in plaintext). If it never happened, rotate now: new Atlas credential, update the Vercel env var, redeploy, re-verify one login per role.

## Hygiene

- No Atlas writes, no production logins, no secrets printed or committed. The rehearsal BACKUP_KEY was generated locally under gitignored db/backups/ and never printed; the backup ciphertext is sandbox-local.
- Rehearsal artifacts (gitignored): db/backups/students-20261016.json.enc + aics-rehash-20261016.key, db/*.log, throwaway db/data mongod files.
- The verify script is self-contained (materializes its own tooling from git history) and never leaves localhost.
