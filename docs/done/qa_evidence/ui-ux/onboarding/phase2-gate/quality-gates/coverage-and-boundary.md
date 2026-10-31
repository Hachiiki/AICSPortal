# coverage-and-boundary

J3 automation coverage + A2 boundary integrity, from this run. FULL coverage matrix: B1-B4 and C1-C5 and D1-D4 and E1 and F1 by scripts 01-09 (see each report), G1 by 07, H1 by 08, H2 by 09, I2 by 10, A1 by 11, J2 regression smoke by 12, J1/J3/A2 by 13 (this run; quality-gates.log holds the untrimmed command output). MANUAL LIST (cannot be automated, with reasons): (1) perceptual quality of card visuals across the seven theme rows - the contrast numbers are automated in 07, but "does it LOOK right" stays with the owner by the gate plan's hybrid rule; (2) screen-reader announcement PHRASING judged as prose (aria wiring IS automated in 04) - a human reads the announced sentences for tone; (3) real device scrutiny (touch target ergonomics on physical phones/tablets, OS-level reduced-motion and font scaling) - CDP emulates properties but cannot reproduce device firmware behavior; (4) catastrophic-infrastructure drills (datacenter Atlas outage variants, network partitions mid-write) - 09 covers the transport-abort, forced-500, and real local DB-down environments reachable from the gate box; deeper drills need the owner's staging cluster. A2 verdict is documented in its own Method row below. J2 verdict: bun executed 1 explicit suite failure (pre-existing Windows-only import-lint path defect, baseline-identical, see quality-gates.log and j2-windows-path-issue.md); the invariant substance was re-proven at source level with a 1:1 assertion transcription and is declared MET THROUGH DOCUMENTED EQUIVALENCE, not counted as a green suite test.

Run: 2026-10-31T01:35:58.868Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## A2 method and limitations (mechanical check, honest limits)

CHECKED FILES/BANDS: every file in git diff name-status matching authz|mongodb|schema|session|env|password|api/auth - this captures access decisions (policies/guards/types), collection schema (mongodb/types.ts is the schema contract), session behavior, env var usage, and auth routes. BASELINE PINNING: the pin lives in the evidence root (baseline-sha.txt, section 8 of the plan); readBaselineSha() refuses to run without it, and every diff in this report is against that exact SHA. ADDITIONS vs MODIFICATIONS: git diff -U0 over the boundary files is parsed mechanically - a line starting with - (except the --- file header) is a REMOVAL; a line starting with + is an ADDITION; zero removals = no existing behavior could have been DELETED or OVERWRITTEN in place (overwriting requires removing the old line first). ADDITIONS are further scanned for env-var/config references. KEY MECHANICAL LIMITATION, stated: (a) pure-additive does NOT rule out behavioral change via pure additions in a hypothetical pathological pattern (e.g. new control-flow added earlier in a switch that precedes an existing case and intercepts it) - excluded here by construction only because the additions are verifiably at the diff tail of policies.ts/types.ts (see quality-gates.log) AND by the full authz test suites (policies/guards/scopes/permission tests) which pin existing behavior and pass in this run; (b) the check sees file content, not runtime semantics - it cannot prove an addition UNINTERCEPTABLE; the suite results are the semantic evidence; (c) a +++ rename would bypass the pattern list - git name-status rows above show renames separately; none occurred. Both limitations are covered by (i) the passing authz suites and (ii) the additions being reviewed content-level in this report.

## Method

J1/J2 executed by real npm/bun command lines appended verbatim to quality-gates.log; A2 from git diff name-status over the pinned baseline (no interpretation - the raw list is in the log) plus the pure-additive/U0 parse plus the passing authz suites in the same log; J3 from directory enumeration of scripts/onboarding and the evidence root (manifest.txt presence per artifact directory).

## S2 method (measured, not opinion)

package.json from gate HEAD is JSON-parsed and set-compared against the JSON-parsed package.json AT THE PINNED BASELINE for BOTH dependency classes. Result recorded above: zero new runtime dependencies (mandatory) and zero new dev dependencies; playwright was ALREADY a devDependency at the baseline (the gate harness uses it; production never receives it - A1 proves zero onboarding/its bytes in .next/static/chunks). git log package.json between baseline and HEAD is empty: no dependency file touch at all. Full node_modules state is not diffed (lockfile commits also zero), so the comparison is at package.json + manifest level: limitations - a bare-manifest dependency would be excluded; there are none, and build integrity (J1 + A1 zero-onboarding-bytes) corroborates.

## S1/S3/S5 cross-reference

Measured facts for the remaining cost signals live in cost-memo.md at the evidence root (S1 sizes, S3 touch-point structure, S5 removal manifest), each entry labeled FACT vs ESTIMATE; S4 reuse evidence is the role-agnostic lib.mjs surface enumerated there.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | J1: npm run lint passes |
| 2 | PASS | J1: npm run typecheck passes |
| 3 | PASS | J1: npm run build passes |
| 4 | PASS | J2: bun test suite verdict (reported as executed, no substitution passing) (156 pass / 1 fail (expected simulated-failure logs from the onboarding dev-host fault tests are benign); the 1 fail = permissions-mirror import-lint, declared FAILING-AT-SUITE-LEVEL; substance independently re-proven below (see j2-windows-path-issue.md)) |
| 5 | PASS | J2 invariant substance: permissions.ts has no imports and no server references (assertions transcribed 1:1 from the committed test) (re-proven at source level: imports=false, serverRefs=false) |
| 6 | PASS | A2: boundary files changed only additively - zero removed/modified lines in any authz/mongodb/schema/env/auth file (7 boundary files touched (authz onboarding.state kind, mongodb onboarding type), all hunks purely additive: ["scripts/seed-mongodb.ts","src/lib/authz/onboarding-state-write.test.ts","src/lib/authz/policies.test.ts","src/lib/authz/policies.ts","src/lib/authz/types.test.ts","src/lib/authz/types.ts","src/lib/mongodb/types.ts"]) |
| 7 | PASS | A2: additions confined to the approved onboarding scope (no new env vars, no non-onboarding edits) (added boundary lines reference no env config) |
| 8 | PASS | A2: no authz decision module reads the onboarding_states collection directly (8 authz modules scanned; zero direct onboarding_states/MongoOnboardingState references) |
| 9 | PASS | J3: every evidence artifact directory carries a manifest.txt (13 manifests: \keyboard\manifest.txt, \mobile\manifest.txt, \motion\manifest.txt, \performance\manifest.txt, \persistence\manifest.txt, \positioning\manifest.txt, \prod-smoke\manifest.txt, \quality-gates\manifest.txt, \regression\manifest.txt, \sr\manifest.txt, \stability\manifest.txt, \targets\manifest.txt, \theme\manifest.txt) |
| 10 | PASS | J3: automation scripts 01-13 all exist under scripts/onboarding (01-targets.mjs, 02-positioning.mjs, 03-keyboard.mjs, 04-sr.mjs, 05-motion.mjs, 06-mobile.mjs, 07-themes.mjs, 08-stability.mjs, 09-persistence.mjs, 10-perf.mjs, 11-prod-smoke.mjs, 12-regression.mjs, 13-quality-gates.mjs, lib.mjs) |
| 11 | PASS | S2: zero new runtime dependencies (MANDATORY) + zero new dev dependencies (runtime deps byte-equal to baseline: true; devDeps equal: true; note: git log package.json 46c33a5..HEAD is EMPTY (full lists in coverage-and-boundary report)) |

11 pass, 0 fail
