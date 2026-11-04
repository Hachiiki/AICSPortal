# AICS Portal onboarding — Phase 2 gate evidence package

## Current verification index, 2026-11-04

The latest report gives all 26 dispositions. Attempt 3's native browser/server cleanup passed, but its overall runner failed. The final focused attempt 4 failed ownership inspection and cleanup, and no complete target matrix or strengthened focus assertions executed. Late native exit observations do not turn that attempt into PASS. H1 focus loss, incomplete target/toast evidence, performance decisions/attribution and A2/cost review keep the gate NOT READY. The pending `08-stability.mjs` edit remains uncommitted and is retained with the final evidence package.

Phase 2 remains NOT READY. The completion report and gate-plan amendments supersede the historical instructions and criterion mappings below. Do not run the old PID-file/port-kill helpers or the original `09-persistence.mjs`, which stops MongoDB and performs a positive-control write. Current local-only interaction verification uses `node scripts/onboarding/isolated-interactions.mjs` with a fresh `GATE_EVID`, the safe `09-persistence-safe.mjs` transport fixture and owned-process supervision. Selected assertion sources and the adapted helper are archived per run. No real completion writes are permitted.

- Owner manual categories: `docs/onboarding-phase2-manual-checklist.md`. They are reported observations, without invented scenario details or execution metadata.
- Current A1: `.phase2-local/final-a1-attempt2/prod-smoke/`, tested application HEAD `62d1354fe374cf12a7641878c24c87d8750ed99c`. Replay with `node scripts/onboarding/student-a1-observer.mjs` using a fresh `GATE_EVID` and free local ports. The runner executes lint, typecheck and a real webpack production build. It permits real student tours and forbids synthetic/testing controls under the explicit owner amendment. Never relabel the tested HEAD after documentation commits; use the strict `verifyA1V3Gate` byte-equivalence check.
- Reader checks: `node scripts/onboarding/a1-v3-evidence-check.mjs`; the actual successful invocation and negative-case results are retained in `.phase2-local/final-a1-reader-check.json`.
- Rule 4b: corrected independent `.phase2-local/final-cal1-attempt2/` and `final-cal2-attempt2/`; exact executed producer bytes are archived in each `producer/`. Measurements are valid, cleanup is confirmed, both draft comparisons FAIL, and the owner keeps memory unresolved. Initial contaminated and failed lifecycle runs remain separate. No additional calibration is required to acknowledge that decision.
- Timing/resize observations: current A1 `student-performance.json`; draft timing comparison FAIL and handler attribution INCONCLUSIVE. These are not a clean performance PASS.
- Source and bundle cost: updated `cost-memo.md`, `.phase2-local/final-verification-1/cost-facts.json`, `final-bundle-baseline-1/result.json` and `final-bundle-comparison.json`. Targeted marker scans never prove exhaustive absence of bytes/modules.
- Reproducibility/retention: `docs/onboarding-phase2-delivery-inventory.md`. Use the current report for exact commands, source and producer identities, PASS/FAIL/INCONCLUSIVE/NOT EXECUTED distinctions and remote-verified commits.

## Historical package and instructions

The remainder records the earlier synthetic-only gate. Its old source identity, zero-engine production wording, status claims and cleanup commands are not the current procedure.

Gate HEAD: the pinned baseline for all diffs is `baseline-sha.txt`
(`46c33a53c5a502c4a6e5937bdeb7b81e2a82622f`); the exact gate HEAD that
produced the final artifacts is recorded in every artifact's `manifest.txt`
(and verified against `git rev-parse HEAD` in the final suite run). The
final suite was run at the pushed commit `0c9f881…`; see §5 for the
freshness rule.

## 1. What is in this root

| artifact dir | script | criterion |
|---|---|---|
| `targets/` | 01-targets.mjs | B1–B4 target handling |
| `positioning/` | 02-positioning.mjs | C1–C2 positioning |
| `keyboard/` | 03-keyboard.mjs | C3 keyboard path |
| `sr/` | 04-sr.mjs | C4/C5 screen reader + view mounts |
| `motion/` | 05-motion.mjs | E1 reduced motion |
| `mobile/` | 06-mobile.mjs | F1 mobile/coexistence |
| `theme/` | 07-themes.mjs | G1 theme matrix + contrast |
| `stability/` | 08-stability.mjs | H1 mid-tour navigation |
| `persistence/` | 09-persistence.mjs | H2 persistence failures |
| `performance/` | 10-perf.mjs | I2 rules 2/3/4 |
| `prod-smoke/` | 11-prod-smoke.mjs | A1 + rule 1 (zero onboarding bytes) |
| `regression/` | 12-regression.mjs | J2 rego surfaces + F1 |
| `quality-gates/` | 13-quality-gates.mjs | J1/J2/J3 + A2 (also S2) |
| `cost-memo.md` | — | S1–S5 structured cost signals |
| `quality-gates.log` | — | untrimmed lint/typecheck/build/bun output |
| `j2-windows-path-issue.md` | — | J2 suite-failure dossier |

Every script writes `manifest.txt` (command + environment) plus a
pass-by-pass report into its own directory.

## 2. Environment (Windows; deviations from docs/recovery.md documented)

These are Windows deviations from the Linux-preferring repo conventions; all
are mechanical platform differences, recorded here once and referenced by the
per-script manifests.

- Runner: **node** (not bun) — under bun on this box, Playwright's
  chromium launches wedge in every channel; CDP transport is used instead
  (`chromium.connectOverCDP` to a detached chromium).
- Chrome serializes computed colors as `lab()/oklch()/color(srgb)`; script 07
  rasterizes colors onto a canvas instead of parsing color strings.
- `npm` is invoked through `cmd /d /s /c` (node >= 24 refuses `.cmd` shims).
- A stale `.next/dev/types` (dev tooling artifact) is removed before
  typecheck; disclosed in quality-gates.log.

## 3. Reproducing a single script

Prerequisites, one-time:

```
# mongod binary + data dir live OUTSIDE the repo
C:\Users\Hp\.aics-gate\
```

Per-invocation environment (PowerShell; never edits the owner's `.env.local`):

```powershell
$env:GATE_WT        = 'C:\Projects\loginAICSPortal'
$env:GATE_MONGO_BIN = 'C:\Users\Hp\.aics-gate\tools\node_modules\.cache\mongodb-memory-server\mongod-x64-win32-8.2.6.exe'
$env:GATE_MONGO_DATA= 'C:\Users\Hp\.aics-gate\mongo-data'
$env:GATE_MONGO_LOG = 'C:\Users\Hp\.aics-gate\mongod.log'
$env:MONGODB_URI    = 'mongodb://127.0.0.1:27017'
$env:MONGODB_DB     = 'aics_portal'
$env:APP_ENV        = 'development'
$env:AUTH_SECRET    = 'dev-only-insecure-secret-change-in-production'
node --experimental-strip-types scripts/onboarding/<NN-script>.mjs
```

The lib fingerprints these four vars and refuses to REUSE a dev server whose
bootstrap env differs (a leak that once wrote a PATCH to a remote cluster;
see §4). Scripts 01–10/12/13 use the gate dev server + gate mongod; 11 builds
and and starts its own production server on port 4320 with a disclosed,
repo-contained smoke `AUTH_SECRET` (in 11-prod-smoke.mjs) and performs a REAL
seeded demo login (the seeded demo student — see `scripts/seed-mongodb.ts`) against it.

## 4. Known incidents disclosed in evidence

- **Atlas write incident (pre-gate env leak):** a stale dev server started
  from `.env.local` held the gate port; one seeded-demo-student `{tour:true}`
  onboarding PATCH landed on the owner's real Atlas cluster
  (`updatedAt 2026-10-30T13:31:31Z`, DB `aics_portal`). NOT deleted - owner
  decision pending. Root cause fixed permanently in `lib.mjs`
  (`.dev-server.env` fingerprint + netstat port-kill + demo-route validation).
- **I2 Rule 4 MISSED:** dev-mode heap with forced GC still climbs
  monotonically (~300–400 KB over 5 tour cycles of a ~13.3 MB dev heap).
  Flagged unsuitable for dev-mode interpretation; recommendation in
  `performance/performance-notes.md` (owner decides replacement).
- **H2 real-topology note:** with the LOCAL mongod fully down, auth fails
  first (sessions are DB-backed via `students`), so the route answers 401
  safely; surfaces hide, nav degrades to login, full recovery on restore.
  The source comment's `200/persisted:false` path is unreachable at this
  topology; scenarios A/B cover the transport failures the client acts on.
- **J2 pre-existing Windows test defect:** the permissions-mirror import-lint
  test cannot read its own source on Windows (`file://` URL pathname bug,
  baseline-identical); dossier in `j2-windows-path-issue.md`, exact suite
  result (156 pass / 1 fail) in `quality-gates.log`. The invariant is
  re-proven at source level with documented equivalence.

## 5. Evidence freshness rule

Every script re-run for the final package writes a fresh manifest at the
exact HEAD tested. If any directory's manifest predates the final HEAD
(because the last commits are the scripts/evidence themselves), the script
that GENERATED it was re-run once more and that run's manifest supersedes
older content — check the newest `manifest.txt` timestamp per directory
against `git log -1 --format=%H`.

## 6. Reading order for review

1. `quality-gates/coverage-and-boundary.md` (J1/J2/J3/A2 + S2 verdicts)
2. `performance/performance-notes.md` (I2 rules 2/3/4 with methodology)
3. `persistence/persistence-failure-report.md` (H2 incl. real-topology note)
4. `prod-smoke/prod-smoke-report.md` (A1 + rule 1)
5. each remaining report; `cost-memo.md` last (S1–S5).
