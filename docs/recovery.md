# Durable Recovery Notes — AICSPortal

Single source of truth for resuming after an environment or session
reset. Mandated by the owner checkpoint workflow (2026-10-24). Update at
every verified checkpoint and push together with that checkpoint's work.

**On reset, before resuming:** recover from GitHub first, then inspect
the worktree, branch, latest commit, and this file. Do not assume
uncommitted files or session history survived.

## Checkpoint status

| Field | Value |
|---|---|
| Updated | 2026-10-30 (UTC+8) |
| Branch | main-full-dev |
| Last verified checkpoint | Onboarding Phase 1 complete and remote-verified: 7a01482 (authz onboarding.state policy), aa99733 (registry + onboarding_states + seed index), 314c23f (GET/PATCH /api/onboarding/state + wiring suite), tip == origin/main-full-dev; the five registry dimension identities approved as the baseline (onboarding plan section 2.6); see the Onboarding section below. Dark-theme history: Phase 2 Stage 2D remains its last verified checkpoint (2026-10-26) |
| Latest push | 2026-10-30 onboarding approval record + this checkpoint (the recovered Phase 0 plan and the Phase 2 gate plan become tracked docs), on top of the 42208e5 CLAUDE.md push-rule update and the three Phase 1 commits (tip 314c23f) |
| Onboarding plan baseline | `46c33a5` (read-only baseline the onboarding plans were verified against, 2026-10-29, remote-verified) |
| Onboarding Phase 1 tip | `314c23f` == `origin/main-full-dev` (verified 2026-10-30) |
| Phase 0 baseline SHA | `822a5cfdd0871cf6ae98452e0d8c42a15910e2ce` (pinned before the first edit, per owner directive; NEVER rewrite) |
| Phase 1 baseline SHA | `acbe71a33e851bdda7116f8dd88cd77d0e8612f8` (Phase-0 exit, pinned per plan §5.1; file at `docs/done/qa_evidence/ui-ux/dark-theme/phase1/baseline-sha.txt`) |
| Protected baseline | `origin/main` = `b7f6fca` (NEVER touch without authorization) |

## Attribution correction (2026-10-26)

Owner-approved identity-only history rewrite, executed and pushed on
2026-10-26. The 10 dark-theme commits on `main-full-dev` (Phase 1a
`474b9bc` through the Stage 2C checkpoint `c9cc6b5`) had been created
under a sandbox identity, `Z User <z@container>`. They were rewritten
to the verified owner identity `Willard James Paluga
<ninonakano408@gmail.com>` (both author and committer) via
`git filter-branch --env-filter` on `acbe71a..main-full-dev`, then
pushed once with `--force-with-lease`.

Verified before pushing (all checks passed): the file trees are
identical (root tree hash unchanged and every per-commit tree hash
unchanged, so `git diff` old..new is empty); commit messages, author
timestamps, committer timestamps, order, and the parent chain are
identical (the first rewritten commit still parents to `acbe71a`);
`git range-diff` old..new shows exactly one changed line per commit
(the Author identity); the anchors `822a5cf` and `acbe71a` and
`origin/main` = `b7f6fca` are untouched. CI on the rewrite push: success
(run #40295811713). No other branch, tag, or PR was affected (the 10
commits existed only on `main-full-dev`; no tags contain them and the
only PR ever opened from this branch, #38, was closed-unmerged in
2026-09 against other commits).

New canonical hashes (old pre-rewrite hash -> new hash; the trees are
byte-identical):

| Old (pre-rewrite, now unreachable) | New canonical | Subject |
|---|---|---|
| `474b9bc27ecdc4f64232e548d4d6b1b8a20b3cc1` | `8704af8de4dfd3abcb8a6367170ed298d18fc728` | feat(theme): Phase 1a theme engine |
| `7a2f16e7086cc10435ee9b74de4bf4bb93268e1e` | `030655e13c4df9f64da1d75fd860468f18ffa68a` | feat(theme): Phase 1b theme controls |
| `bc0a3333b83d2c9288f9c1f1ec83b9661682484f` | `5db3038553b16256ecc3449f027202b9463c51a7` | docs(theme): Phase 1 complete evidence |
| `8d4ba5761fa8d77168550ba0c3ddcb3e4b50374b` | `3d6a861f51014a1eae2f175ff2d80fbe3453bc9e` | docs(theme): issues #90/#91/#92 follow-up |
| `9bbcdda569970a26f9bddd90b7f1c088e8481d8b` | `14ad462487eb0ee7ee2092e8c543bc552d6ef999` | test(theme): Stage 2A G4 skeleton gate |
| `5eaa382c64ab5fb44b29e36022bf915c2398c864` | `54b6297bbf266745decc9ea0c4716b20add571d0` | docs(theme): Stage 2A evidence |
| `85e81c04ab2a7a92cd49154805a2b3095fac5f97` | `7957bda7087e955976a1786c67fcc698c318cd9c` | refactor(theme): Stage 2B inline-hex cleanup |
| `462c413f07a304bee9f7e90ffb5bb60436bf9894` | `3f99f41674e88414ac24fa6a571ff32b80fab0d3` | docs(theme): Stage 2B evidence |
| `8e2c690c54479d485c2d3915fc7c208bc9ce753b` | `2bba462d62c41879e9017ff4596a0454e9968bd8` | fix(theme): Stage 2C regressions + COE print |
| `c9cc6b52356f4dcf880f9010ebf8aefcc81eaf80` | `10d8cde815629322c1239f050e67ecefd07fa860` | docs(theme): Stage 2C evidence + checkpoint |

Provenance notes:

- Old hashes quoted anywhere in this file, in the committed evidence
  manifests, or in GitHub issue/PR history identify the PRE-rewrite
  commits. They are no longer reachable from any branch. Use the table
  above to translate them to the current canonical hashes.
- The evidence bundles remain valid for the rewritten history: every
  manifest pinned an old HEAD whose tree is byte-identical to its
  mapped new commit, and CI re-ran green on the rewritten tip. The
  standing "re-run the gate after a history restructure" rule recorded
  under Historical evidence provenance (#90) was consciously not
  applied here: the owner authorized an identity-only rewrite with no
  tree change, and gate re-runs were outside that authorization's
  scope. No evidence files were edited.
- Backup references (local to the recovery clone only, NOT pushed):
  branch `backup/main-full-dev-pre-attribution-fix` at the pre-rewrite
  tip `c9cc6b52356f4dcf880f9010ebf8aefcc81eaf80`, plus
  `refs/original/refs/heads/main-full-dev` created by filter-branch.
  Delete them only after the owner confirms the rewrite is good.
- The repository-local git identity is now set to the owner identity
  (`git config user.name/user.email` in the clone), so future commits
  no longer fall back to the sandbox identity.

## Onboarding (2026-10-30)

The onboarding campaign: plan at `docs/onboarding-phase0-plan.md`,
gate plan of record at `docs/onboarding-phase2-gate-plan.md`. Both are
tracked docs as of this checkpoint; before it they sat untracked in
the worktree, and the ORIGINAL planning documents were already lost
once to an environment reset and had to be consolidated from the
owner's confirmed decision update. Authorized scope: Phase 1 and
Phase 2 on `main-full-dev` only; the Phase 2 gate outcome stays the
owner's decision alone; Phase 3+, `main`, PRs, merges, and
deployments are not authorized.

- **Phase 1 shipped and remote-verified** in three incremental
  commits, each pushed immediately and remote-verified per the
  standing rule (`CLAUDE.md` section 6, updated 2026-10-30 in
  `42208e5`):
  - `7a01482` feat(authz): the onboarding.state policy joins the
    decision table (self-only by construction, read/update for every
    role, corrupt roles fail closed).
  - `aa99733` feat(onboarding): the state registry (five dimensions
    per role, per-role versions, carry-forward) plus
    MongoOnboardingState keyed {branch, username} and the unique
    index added to the seed tooling.
  - `314c23f` feat(onboarding): GET/PATCH /api/onboarding/state
    (identity from the authenticated session only, Zod plus registry
    key validation, non-blocking persistence with the skip-write
    rule) plus the seam-mocked route-wiring suite in
    `src/lib/authz/onboarding-state-write.test.ts`.
- **Owner approval (2026-10-30):** the five registry dimension
  identities exactly as implemented in
  `src/lib/onboarding/registry.ts` are the approved baseline
  (onboarding plan section 2.6); renaming or restructuring them needs
  separate approval. The registry's RECOVERY NOTE checkpoint is
  closed.
- **Environment reset facts (2026-10-30):** the pre-reset clone
  layout (`/home/z/my-project/AICSPortal`) is gone; the clone now
  lives at `/home/z/my-project/aics-mfd`; the local-only attribution
  backup refs, the mmserver mongod binary, `mongo-data`, the untracked
  worklog, and `.env.local` did not survive the reset and need
  re-provisioning before the next browser-gate run (see Known issues).

## Completed (through this checkpoint)

- **Phase 0 of the dark-theme plan (Rev 2-final `3a16e13`), fully gated:**
  §2.5 migrations (228 `bg-white`→`bg-surface`, 122 link occurrences,
  11 scrim sites), light-value tokens, G1–G4 harness, evidence under
  `docs/done/qa_evidence/ui-ux/dark-theme/phase0/`. See the previous
  revision of this file (git history) for the full Phase-0 record.
- **Phase 1 of the dark-theme plan — the single 1a+1b push:**
  - Commit 1a (engine): next-themes ThemeProvider in `layout.tsx`
    (`attribute="class"`, `defaultTheme="system"`, `enableSystem`,
    `storageKey="aics_theme"`, `disableTransitionOnChange`); body
    hardcoded utilities removed (the `@layer base` rule takes over:
    `bg-background text-ink`, light `--ink` is exactly slate-900);
    recalibrated `.dark` core tokens + full Layer-1 set + Layer-2
    palette bridge (slate/blue/status scales + stray grays) +
    `--login-*` tokens (navy pair brand-constant) in `globals.css`;
    login `T.*` became `var(--login-*, fallback)` references with
    composed `accentSoft`/`navyVeil` tokens; CredentialsForm input hex
    literals became var()-driven arbitrary values; RouteTrailVariant
    animated borderColor uses resolved-theme concrete hex; dark
    skeleton shimmer; `color-scheme` hints.
  - Commit 1b (controls): Settings Appearance section (Light/Dark/System
    radios, native sr-only inputs, `has-[:checked]` styling, appended
    last); Topbar quick toggle (first in the right cluster; the old
    Theme-soon dropdown placeholder became a Settings link); login-page
    toggle (form-panel corner); `src/lib/aics/use-mounted.ts`
    (useSyncExternalStore hydration gate, no setState-in-effect).
  - Harness: `GATE_EVID`/`GATE_MAIN_WT`/`GATE_BASELINE_WT` env
    overrides; G4 `--mode parity|final` (final requires an explicit
    `--allow-diff` list; every allowed diff gets a bounding box in
    route-report.json and a retained diff.png); real-command manifests;
    skeleton interaction now hangs data APIs only (issue #92). New
    Phase-1 tooling: `phase1-contrast.mjs`, `phase1-controls-check.mjs`,
    `phase1-dark-smoke.mjs`.
- **Documentation follow-up for issues #90/#91/#92 (commit `8d4ba57`):**
  `docs/dark-theme-phase1-plan.md` amended to Rev 2.1 so the written
  Phase-1 G4 criteria match the committed two-stage harness (the §5.1
  Phase-1 re-run paragraph was rewritten; the §6 phase-table exit-gate
  cell and the Phase-1 acceptance criteria now reference it). This file
  gained the Phase-0 evidence-provenance caveat (#90, new subsection
  under Gate results) and the Phase-2 skeleton-presence follow-up (#92,
  under Pending). Zero application code and zero harness code changed.
  The owner closed all three issues on GitHub afterwards.
- **Phase 2 Stage 2A (owner-authorized 2026-10-26; this push):** the G4
  skeleton gate hardening from the issue #92 follow-up, and nothing else.
  `scripts/theme/lib.mjs` exports `skeletonPresence()` (probes
  `.aics-skeleton` count plus first-block visibility);
  `scripts/theme/g4-route-diff.mjs` asserts it on BOTH sides right before
  the interaction-skeleton-loading screenshot, so a vacuous capture
  fails the gate, and now hard-rejects interaction-skeleton-loading from
  `--allow-diff` in final mode (exit 2): while the data APIs hang the
  page renders the skeleton shell, never the real Topbar, so no theme
  control can appear there and the capture is a strict 0-px negative
  control like the four /legal routes (it measured 0 px in the Phase-1
  final run even while allow-listed). New
  `scripts/theme/g4-skeleton-negative.mjs` applies the same imported
  predicate to three controlled conditions on an isolated throwaway
  server: A vacuous (all /api hung including session, the Phase-0
  defect), B real (the G4 capture condition), C hidden (B plus an
  in-page display:none injection); expected and observed A FAIL / B PASS
  / C FAIL. Evidence under
  `docs/done/qa_evidence/ui-ux/dark-theme/phase2/` (baseline-sha.txt
  pins the Phase-1 baseline `acbe71a` so the re-run compares the same
  trees as the Phase-1 artifacts): g4/ (final re-run PASS),
  g4-skeleton-negative/ (negative control PASS), plus
  g4/phase1-consistency.txt (field-by-field artifact comparison).
  Validation: lint 0 errors (23 pre-existing warnings), typecheck clean,
  authz 76/76, scripts/lib 6/6. Zero src/ changes in the diff.
- **Phase 2 Stage 2B (owner-authorized 2026-10-26; this push):** the
  approved inline-hex cleanup in shared components, and nothing else.
  Migrated: Sidebar disabled/"Soon" state (the `#64748b`/`#f1f5f9` style
  props became `bg-slate-100 text-[#64748b] dark:text-slate-500`
  classes; slate-100 is probe-verified pixel-exact in light, and both
  halves re-theme via the Layer-2 bridge); Topbar avatar initials
  circle (the `#1e293b` style prop became `bg-[var(--avatar-bg)]`, a
  new theme-aware token: light keeps the exact literal, dark is the
  raised-dark `oklch(0.32 0.014 255)` tone shared with dark
  `--line`/`--login-border`, per the owner's Stage-2A ruling);
  AcademicHeader Stat (`#1d4ed8`/`#0f172a` became
  `text-[#1d4ed8] dark:text-link-strong` / `text-[#0f172a]
  dark:text-slate-900`); TasksTab OverviewStat (the conditional
  big-number hex hack and the literal `{color}` junk class became
  declarative tone props with the same exact light hexes and dark:
  token counterparts). The decisive implementation fact, verified by a
  pre-edit Chromium probe: v4 oklch palette shades do NOT render as
  these v3 hex literals (e.g. slate-500 renders rgb(98,116,142) vs
  #64748b rgb(100,116,139)), so plain class substitution would break
  light parity; the LoginView footer precedent (`text-[#64748B]
  dark:text-slate-500`) is the established idiom and was followed. The
  Topbar `#153357` branch chip STAYS a documented brand constant
  (repo-wide navy family: `palette.ts` navy + 40+ sites; plan §2.5
  navy-chip ruling; a single-site token would fragment the vocabulary
  — recorded per the do-not-force-substitution instruction). New
  harness: `phase2-2b-computed.mjs` (9-pair light-pixel + dark-token
  check) and `phase2-2b-visuals.mjs` (affected components, both
  themes, isolated server on port 4303). Validation: 2B pair check
  9/9 light-exact + 9/9 dark-theme-aware; G1 16/16 and G2 16/16
  re-runs PASS; G4 final re-run PASS at the 19-name allow-list with
  the hardened skeleton gate (24/24 captures, totalDiff 74347,
  0 unexpected, 0 failed; field-by-field identical to the Stage-2A
  route-report — the 2B edits add zero light-mode pixels; emitted CSS
  107897 -> 108614 B, +717 B); visuals captured and inspected in both
  themes (recorded trade-off: the dark avatar circle edge is subtle
  against the topbar at ~1.5:1 — initials keep ~9:1 and 0.32 is the
  established raised-dark rung; flagged as optional polish). Evidence
  under `phase2/2b/` (computed, g1, g2, g4 incl.
  stage2a-consistency.txt, visuals incl. inspection-notes.txt).

## Gate results (Phase 1, evidence under docs/done/qa_evidence/ui-ux/dark-theme/phase1/)

- **G1 light re-run vs Phase-0 exit: PASS** — 16/16 mapping forms resolve
  identically at HEAD. Evidence: `g1/`.
- **G2 light re-run: PASS** — 16/16 pairs x 11 computed properties
  identical. Evidence: `g2/`.
- **G4 parity re-run at commit 1a (`474b9bc`): PASS — 24/24 route/state
  captures at 0 differing pixels** (the literal plan §5.1 "still zero
  diffs" criterion holds at the engine-only state; the engine ships no
  control). Coverage greps + phase1 class-diff rule (zero old-vocabulary
  tokens in the diff) pass. Emitted CSS 97561 B -> 106187 B. Evidence:
  `g4-parity/`. An intermediate parity run caught the login footer
  v3/v4 slate-500 mismatch (897 px) before the commit was finalized;
  the fix keeps the exact `#64748B` literal with a `dark:` variant.
- **G4 final re-run at HEAD (`7a2f16e`): PASS** — legal routes (4) and
  the skeleton interaction at 0 px (negative controls); the 20
  allow-listed routes diff ONLY where the new controls render: login
  toggle bbox [1224,58..1259,93], topbar toggle + centered-search shift
  within the y 52..87 strip, settings Appearance tab row (y up to 265).
  Every bbox + diff.png retained. Emitted CSS 97561 B -> 107897 B
  (+10.6%). Evidence: `g4/`.
- **Dark contrast matrix: PASS** — 73/73 gated pairs (text >= 4.5:1 vs
  surface AND canvas incl. the muted-fg 4.6 target and the amber-700 on
  amber-50 hardest pair; pills per family; rings/icons >= 3:1; white on
  blue-600/700/800 re-asserted 5.26/6.82/8.84). 10 informational
  records (WCAG 1.4.11-exempt decorative lines/borders). Evidence:
  `contrast/`.
- **Controls functional check: PASS — 32/32 steps.** Per control:
  ThemeProvider (no-FOUC under 250 ms-throttled first paint for stored
  AND system dark; color-scheme hint; light default), Settings selector
  (3 modes, reachability in 2 interactions, persistence, live OS flip
  both ways without reload), Topbar toggle (all 3 roles, cycle both
  ways), login toggle (pre-auth, cycle, refresh persistence); cross-tab
  storage-event sync both ways. Evidence: `controls/`.
- **Dark smoke: PASS — 8/8.** Login + one route per role in resolved
  dark; dropdown with empty state; admin dialog + form controls; a real
  sonner error toast (failed sign-in); 108 skeleton blocks. Evidence:
  `dark-smoke/`.
- **Other validation:** authz 76/76; scripts/lib 6/6; lint 0 errors
  (23 pre-existing warnings, none new); typecheck clean;
  `bun run build` clean at 1a and at HEAD.
- **Filed issue #92:** the Phase-0 G4 skeleton interaction hung
  `/api/auth/session` too, so both sides captured an empty page (24 KB
  PNG vs 127 KB real page) — the check was vacuous. Fixed in the
  Phase-1 harness; Phase-1 runs capture real skeletons.

### Historical evidence provenance (issue #90, caveat recorded 2026-10-26)

The original Phase-0 G1/G2/G4 manifests record HEAD `cfc6e67…`, an
intermediate commit from before the pre-push history was restructured
into the pushed series (`3215c55` → `dc57da0` → `d72817b` → `acbe71a`).
Only G3 was re-run afterwards and pins the reachable `d72817b`.
`cfc6e67` is not reachable from `main-full-dev`, and the historical
evidence cannot be retroactively pinned to a reachable commit without
rewriting shared history, which is forbidden. Two kinds of support
exist for that bundle; keep them distinct:

- Directly verified: the committed Phase-1 evidence re-validates the
  pushed trees themselves. Every phase1 manifest (g1, g2, g4-parity,
  g4, contrast, controls, dark-smoke) pins baseline `acbe71a`, the real
  pushed Phase-0 exit, with reachable HEAD SHAs (`474b9bc`, `7a2f16e`),
  worktree, and exact commands. G1 16/16, G2 16/16, G4 parity 24/24
  at 0 px, G4 final with control-confined diffs.
- Indirect reconstruction only: the claim that the `cfc6e67` tree's
  src/ equaled the pushed `acbe71a` src/ rests on the committed
  phase0 `class-diff.txt` matching the §2.5 mapping table exactly, on
  an independent regeneration of that multiset from
  `git diff 822a5cf..acbe71a -- src/` reproducing it 361/361, and on
  the scratch G1/G2 re-runs at `acbe71a` reported in issue #90
  (16/16 and 16/16; not re-executed since). The phase0 G1/G2/G4
  manifests therefore remain historical records of an unverifiable
  intermediate tree, superseded by the Phase-1 chain, not corrected.

Standing rule: a gate manifest pins the commit that will carry the
evidence; after any history restructure, re-run the gate (as happened
for G3) before pushing. Applied again during Stage 2A: the harness
commit was amended after the first G4 run, so both evidence generators
were re-run at the final commit `9bbcdda` before pushing (the amended
`0fda1df` would have been unreachable, exactly the #90 failure mode).

## Gate results (Phase 2 Stage 2A, evidence under docs/done/qa_evidence/ui-ux/dark-theme/phase2/)

- **G4 final re-run with the hardened harness: PASS**: 24/24 route/state
  captures, 0 failed, 0 unexpected diffs, greps and class-diff pass,
  totalDiff 74347 px. The 19-route allow-list (Phase-1's 20 minus
  interaction-skeleton-loading) diffed only where the Phase-1 controls
  render: every per-capture diffPixels, PNG size, and bounding box is
  identical to the Phase-1 `g4/route-report.json` (field-by-field record
  in `g4/phase1-consistency.txt`; baseline `acbe71a` vs harness commit
  `9bbcdda`). interaction-skeleton-loading passed STRICTLY at 0 px off
  the allow-list with the new presence probe green on both sides (108
  blocks each, first block visible, counts recorded in
  route-report.json). Emitted CSS 97561 B -> 107897 B (same as Phase 1).
- **Skeleton-presence negative control: PASS (A FAIL / B PASS / C
  FAIL)**: the imported predicate fails on the vacuous page (all /api
  hung including session, the Phase-0 defect; count 0), passes on the
  real G4 condition (count 108, first block visible, byte-size-matching
  the gate's own skeleton captures), and fails when the blocks are
  present but hidden (count 108, firstVisible false). Ran on an isolated
  throwaway server (port 4302); the application, harness, worktree, and
  database were never modified.

## Gate results (Phase 2 Stage 2B, evidence under docs/done/qa_evidence/ui-ux/dark-theme/phase2/2b/)

- **Stage 2B computed/pixel pair check: PASS (9/9 both themes)**: every
  migrated pair resolves to the IDENTICAL quantized sRGB as its exact
  pre-2B inline literal in light (fill-paint pixel comparison, threshold
  0, through the real HEAD globals.css compile) and to the intended
  theme-aware token in dark (`<html class="dark">`, the production
  next-themes mechanism). See `computed/`.
- **G1 re-run at the 2B commit: PASS — 16/16** mapping pairs identical
  (`g1/`). **G2 re-run: PASS — 16/16 pairs x 11 computed properties**
  (`g2/`). The existing §2.5 vocabulary is undisturbed.
- **G4 final re-run with the hardened Stage 2A harness: PASS**: 24/24
  captures, 0 failed, 0 unexpected diffs, greps and class-diff pass,
  totalDiff 74347 px — and every per-capture diffPixels, PNG size,
  bounding box, and skeleton-presence count is field-by-field IDENTICAL
  to the Stage-2A run (`g4/stage2a-consistency.txt`): the Stage-2B
  edits add zero light-mode pixels on top of the Phase-1 control
  diffs. Emitted CSS 97561 -> 108614 B (baseline unchanged; +717 B
  over Stage 2A from the new utilities).
- **Affected-component visuals: PASS** — student dashboard (Stat values,
  Topbar avatar) and Academics Tasks tab (OverviewStat tones) captured
  and inspected in both themes; computed colors recorded in
  `visuals/report.json`; observations and the dark-avatar-edge
  trade-off recorded in `visuals/inspection-notes.txt`.

## Gate results (Phase 2 Stage 2C, evidence under docs/done/qa_evidence/ui-ux/dark-theme/phase2/2c/)

- **Full route matrix gate (new harness `phase2-2c-matrix.mjs`): PASS —
  81/81 entries, 0 failures, 0 blocked, 0 dark regressions.** Survey at
  the Stage-2B checkpoint `462c413` found 31 unique dark-regression
  contrast signatures plus a pre-existing BLANK COE print (both themes);
  the fix commit `8e2c690` (8 files) cleared everything. Matrix: 33
  routes (login, 4 legal, 404, student x9, faculty x9, admin x9 — the
  nav-config inventory) x 2 themes + 5 interactions x 2 + skeleton x 2
  (hardened Stage-2A predicate, 108 blocks) + COE print x 2 + ID card
  x 2. Per capture: rendered-page assertion, resolved theme state, zero
  console/page errors (401/403 resource-status lines recorded
  informationally), DOM text-contrast audit (computed color vs
  composited effective background, WCAG 4.5:1 / 3:1 bars, structural
  exemptions + the documented dual-use red-600 chip ruling; light-parity
  pairs classified INFO — the same marginal pair fails in light too and
  light is pixel-frozen). COE print: print-media layout assertions (only
  .coe-print-area visible, absolute 0,0; title stays the literal navy in
  BOTH themes) + real page.pdf output rasterized with pdftoppm and
  pixel-verified (white paper, navy text). ID card: overlay colors are
  exactly the id-card-config literals in both themes; card INTERIOR
  pixel-identical between themes (0 px; 56 edge-AA px = corner blend vs
  the page background, expected); the View Digital ID dialog audits
  clean. See `findings-and-limitations.txt` for the full record
  (remaining light-parity pairs, enrollment literal chips left as
  optional polish, environment constraints).
- **Fixes (commit `8e2c690`):** COE preview paper (`.dark
  .coe-print-area { background: #ffffff }`); COE modal chrome
  literal-classes with dark counterparts; COE BLANK PRINT fixed by
  removing `no-print` from the modal backdrop (display:none on an
  ancestor suppresses the print area the CSS re-enables via visibility
  — pre-existing defect, both themes, found by the 2C print
  validation); cookie-consent + legal-shell #1769AA links got
  dark:text-link; DevBanner dark:bg-amber-500; grade-encoding pill
  bg-[#fffbeb] dark:bg-amber-50; admin-people count text-blue-200
  dark:text-[#bfdbfe] (constant accent on the constant navy chip);
  enrollment labelClass + status-date classes. Two first-draft edits
  (bg-amber-50 / text-[#bfdbfe] substitutions) moved +123 light pixels
  (v4 oklch values differ from the v3 hexes!) and were corrected by
  amending the unpushed commit — the light-exact forms above are what
  shipped.
- **G1 re-run: PASS 16/16; G2 re-run: PASS 16/16** (`g1/`, `g2/`).
- **G4 final re-run (hardened Stage-2A harness, baseline `acbe71a`):
  PASS** — 24/24 captures, totalDiff 74347, 0 unexpected, greps +
  class-diff pass, and every per-capture value field-by-field IDENTICAL
  to the Stage-2B run (`g4/stage2b-consistency.txt`): the Stage-2C
  fixes add ZERO light-mode pixels. Emitted CSS 108614 -> 109937 B
  (+1323 B, the new dark: utilities). The coverage-grep allowlist's
  exact-line-number pin was relaxed to file+alpha-form (2C comments
  shifted FacultyGradeEncodingPage.tsx:530 -> 534 and failed the gate
  spuriously; assertion intent unchanged).
- **Other validation:** lint 0 errors (23 pre-existing warnings);
  typecheck clean; tests 82/82; `bun run build` clean.

## Gate results (Phase 2 Stage 2D, evidence under docs/done/qa_evidence/ui-ux/dark-theme/phase2/2d/)

- **Scope (owner-authorized 2026-10-26):** exactly the three reviewed
  plan items. (1) Red-chip hover contrast: `dark:hover:bg-red-500`
  added alongside the existing `hover:bg-red-700` on the seven
  solid-red hover sites (commit `7aed783`; 4 admin delete-confirm
  chips + 3 error/retry buttons); light behavior and resting states
  untouched. (2) Avatar edge option B3: `dark:ring-1 dark:ring-inset
  dark:ring-white/15` on the Topbar initials placeholder only (commit
  `8be6e65`; fill token, initials, and the real-photo branch
  untouched). (3) Blurred surfaces: evidence only, no styling
  changes.
- **Browser-measured red-chip contrast (focus/):** light rest
  #e7000b 4.765:1 -> hover #c10007/#c20007 6.36-6.42:1 (idiom
  preserved); dark rest #ec5b57 3.382:1 (equals Phase-1 entry 80)
  -> hover #da534f 3.931-3.951:1 (was 2.909:1; clears the 3:1
  bold-chip bar, matches the planning 3.951 estimate on the real UI
  chips). Four admin chips driven through their real confirm-state
  UI; the three error-button class strings measured via injected
  class-identical elements (no deterministic way to trigger the
  error routes in the built demo app; same emitted stylesheet).
- **Avatar (focus/):** light preserved — computed box-shadow none,
  fill exactly rgb(30, 41, 59), and G4 field-by-field identity with
  Stage 2C proves zero new light pixels. Dark ring computed at
  oklab(white / 0.15) inset 1px; measured edge profile: fill #2e333a
  (1.346:1 vs topbar) -> ring band #4a4e54 (2.045:1 vs topbar,
  1.52:1 vs fill; theoretical 15% white over fill ~#4c4e54).
  IMPORTANT: the planning report's B3 estimate (rim #dcdddf, 12.6:1)
  had an alpha-direction error in its blend model (85% white instead
  of 15%); the authorized classes were implemented verbatim and the
  discrepancy is documented in findings-and-limitations.txt. VLM
  review of the close-ups: subtle, crisp, deliberate contour; not
  excessive; initials clear. If a stronger rim is wanted, a one-class
  alpha bump (e.g. dark:ring-white/30) awaits owner decision.
- **Blurred surfaces (focus/, evidence only):** the four faculty
  modal states captured in dark (grade-history, previous-records
  section, student-file, attendance-history): scrim blur(8px)
  translucent, panels opaque (dark --surface), readability audits
  10/17/54/6 records with one pre-existing light-parity finding (the
  "Soon" inline-literal chip #64748b on #f1f5f9 at 4.34:1, both
  themes; optional-polish bucket, owner decision). Cookie banner
  compositing recorded in dark (oklab(0.225 / 0.85) + blur(8px))
  with the flat-blend-model caveat and a readable VLM review; no
  change, no regression.
- **G1 re-run: PASS 16/16; G2 re-run: PASS 16/16** (`g1/`, `g2/`).
- **G4 final re-run (hardened Stage-2A harness, baseline `acbe71a`):
  PASS** — 24/24 captures, totalDiff 74347, 0 unexpected, skeleton
  gate intact (108/108), and every per-capture value field-by-field
  IDENTICAL to the Stage-2C run (`g4/stage2c-consistency.txt`): the
  Stage-2D edits add ZERO light-mode pixels. Emitted CSS 109937 ->
  110563 B (+626 B, the new dark: utilities).
- **Full 2C route matrix re-run (gate mode): PASS 81/81 entries, 0
  failures, 0 blocked, 0 dark regressions** (`matrix/`; 9 dark
  light-parity INFO + 13 light INFO, same signatures as 2C).
- **Other validation:** lint 0 errors (23 pre-existing warnings);
  typecheck clean; tests 82/82; `bun run build` clean. New harness:
  `scripts/theme/phase2-2d-focus.mjs` (isolated server on port 4305;
  committed with this evidence bundle).

## Pending / exact next step

- **Onboarding Phase 2 is the exact next step (authorized 2026-10-29):
  the in-house tour engine, the dev-only synthetic tour, and the
  mandatory evidence package per `docs/onboarding-phase2-gate-plan.md`
  (evidence root
  `docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/`, automation
  under `scripts/onboarding/` following the `scripts/theme`
  conventions with a manifest per run). Every completed commit pushes
  immediately to `origin/main-full-dev` and gets remote-verified.
  When Phase 2 implementation and evidence are complete, present the
  full evidence package, all 26 gate criteria with results,
  performance findings against the provisional thresholds, the cost
  assessment (S2 mandatory; S1, S3, S4, S5 satisfactory), blockers,
  and a recommendation, then STOP: the gate outcome and any Phase 3
  start stay the owner's decisions alone.**
- Dark-theme work stays where its own STOP below put it; the
  onboarding authorization neither reopens it nor touches the
  attribution backup references.
- The 2026-10-26 attribution correction is complete and pushed
  (identity only; see the Attribution correction section above). It
  changed zero application code and zero evidence trees.
- **Stage 2D is complete and pushed. STOPPED per the owner's explicit
  instruction: do NOT begin any further phase (no Phase 3, no
  additional polish) and do NOT clean up the attribution backup
  references until the owner reviews the Stage 2D evidence and
  explicitly authorizes the next step.**
- Owner-decision items recorded with Stage 2D (not fixed, by scope):
  the avatar rim magnitude (the authorized white/15 renders subtle at
  2.045:1 vs topbar; a stronger one-class bump such as
  dark:ring-white/30 would need separate authorization); the
  "Soon" inline-literal chip in the faculty student-file footer
  (4.34:1 both themes, same optional-polish bucket as the 2C list).
- Stage 2C additionally recorded (not fixed, by scope/policy):
  light-parity marginal pairs (schedule-grid tints ~4.35:1 both themes,
  COE modal Print button 4.48:1 both themes, COE document internal
  small-print 4.14-4.47:1 both themes — fixing these would alter the
  pixel-frozen light output, owner decision required); enrollment step
  circles/pills keep literal light backgrounds in dark (readable —
  their own text sits on their own bg; optional polish); COE print
  still paginates trailing blank pages when the underlying page is tall
  (pre-existing print-CSS design).
- Owner rulings recorded with the Stage 2A authorization (2026-10-26),
  binding for the later stages: the legal brand colors `#1769AA` and
  `#124D7A` stay as brand constants for now; the Topbar avatar `#1e293b`
  migrates to an appropriate theme-aware token in Stage 2B while
  preserving exact light-mode output (DONE in this push, as
  `--avatar-bg`); the red-700 hover contrast fix belongs to the
  proposed Stage 2D scope; Chromium is the locally testable browser and
  Firefox/Safari remain explicitly unverified unless they are actually
  tested. The Topbar `#153357` chip was inspected per the Stage-2B
  authorization and stays a brand constant (repo-wide navy family;
  documented in-code and in the Stage 2B record above).
- Remaining optional-polish items recorded across 2C/2D (NOT
  authorized): enrollment literal chips, COE trailing blank print
  pages, the light-parity marginal pairs (schedule-grid tints,
  COE Print button 4.48:1, COE small-print 4.14-4.47:1 — fixing
  these would alter the pixel-frozen light output), the "Soon"
  literal chip, and the avatar rim alpha bump. Evidence continues
  under `docs/done/qa_evidence/ui-ux/dark-theme/phase2/`.

## Known issues / constraints

- `docs/` and `/scripts/` are gitignored in-repo (`.gitignore:53`) —
  `git add -f` for everything under them, tracked or new.
- A fresh clone needs `mkdir -p scripts/theme-scratch` before the G4
  capture stage: the db-clone snapshot writes to
  `<repo>/scripts/theme-scratch/g4-db-snapshot.json` and the directory
  is untracked (scripts/ is gitignored), so it does not survive resets
  (discovered during the Stage 2A re-provisioning; the first capture
  attempt failed with ENOENT until the directory was created).
- Playwright is a devDependency; Chromium headless shell 156.0.8078.4
  (build 1248) at `~/.cache/ms-playwright` (`bunx playwright install
  chromium` re-provisions). Post-reset 2026-10-30: the cache holds
  `chromium-1200` and `chromium_headless_shell-1200`; verify the
  installed playwright package accepts the revision on the first run
  and re-provision if it mismatches.
- Local gate environment: mongod 8.2.6 (from mongodb-memory-server's
  downloader; the BINARY sits directly at
  `/home/z/my-project/scripts/mmserver/node_modules/.cache/mongodb-memory-server/mongod-x64-debian-8.2.6`
  — no `/bin` subdirectory; corrected 2026-10-26 during Stage 2C) on
  127.0.0.1:27017, dbpath `/home/z/my-project/scripts/mongo-data`;
  re-seed with `node scripts/seed-mongodb.ts` (needs `.env.local`).
  Post-reset 2026-10-30: the binary, the data dir, and `.env.local`
  are gone; re-provision before the next browser-gate run (install
  mongodb-memory-server in a scratch dir OUTSIDE the repo, start
  mongod on 127.0.0.1:27017 with a dbpath outside the repo, write
  `.env.local` per the recovery procedure, re-seed). The seed now
  also creates the onboarding_states unique index (aa99733).
- **Environment layout (CHANGED 2026-10-30):** the repo clone lives
  at `/home/z/my-project/aics-mfd` (branch `main-full-dev` checked
  out directly). The pre-reset clone `/home/z/my-project/AICSPortal`
  and the G4 baseline scratch worktree
  `/home/z/my-project/.baseline-check` are gone with the reset; any
  future G4 re-run must pass the new
  `GATE_MAIN_WT=/home/z/my-project/aics-mfd` and re-create the
  scratch worktree. `GATE_WT` defaults to the clone. The sandbox's
  own scaffolding repo sits at `/home/z/my-project` root — never
  touch it.
- The worktree needs `.env.local`
  (MONGODB_URI=mongodb://127.0.0.1:27017, MONGODB_DB=aics_portal,
  APP_ENV=development) for `next start` demo auth. Missing after the
  2026-10-30 reset; re-create it per the recovery procedure below.
- G4 runs as two stages (`--stage setup`, `--stage capture`); a full run
  rebuilds both trees (~10 min). Phase-1 G4 uses `--mode parity|final`
  (see the harness header for exact commands).
- Conventions: English `type: description` commits; every completed
  commit pushes immediately to `origin/main-full-dev` per the
  standing user instruction (`CLAUDE.md` section 6, updated
  2026-10-30) — only `main-full-dev`, never `main` or any other
  branch, and verify the remote after each push; never force-push,
  never rewrite shared history; do not bypass failing checks to
  create a checkpoint. One explicitly owner-authorized exception
  exists: the 2026-10-26 attribution correction (identity-only
  rewrite of `main-full-dev`; see that section above).
- Status-board credentials live only in the local untracked helper
  script; they must never be committed, logged, or reported.
- Dual-use red-600 (deliberate, documented): dark `--color-red-600`
  serves 35 text sites at >= 4.5:1 and 9 solid chips whose white bold
  text keeps 3:1 (3.38:1); light-mode chips keep 4.77:1 (v4 red-600
  unchanged). Recorded in `contrast/report.json`.
- Dark `--login-primary` calibrated to L 0.66 (plan proposed 0.68): the
  white check icon drawn on it needs >= 3:1 (2.89 at 0.68, 3.12 at
  0.66) while text uses stay >= 4.5:1. Plan R3 sanctioned adjusting the
  token, not call sites.

## Environment layout (post-recovery reference)

- Repository: `Hachiiki/AICSPortal` (GitHub, token-embedded remote URL)
- Repo clone (dev worktree): `/home/z/my-project/AICSPortal` on
  `main-full-dev`
- Baseline scratch worktree during G4: `/home/z/my-project/.baseline-check`
  (created/removed by the harness)
- Runtime: bun (bun install / bun run / bun test); node for the
  mongodb driver and the seed script
- Detailed task history: local worklog at `/home/z/my-project/worklog.md`
  (untracked; may not survive resets — these notes are the durable copy)

## Recovery procedure (after a reset)

1. `git clone -b main-full-dev <remote> /home/z/my-project/aics-mfd`
   (or `git -C /home/z/my-project/aics-mfd fetch origin` if present).
2. Compare `git rev-parse main-full-dev` with
   `git ls-remote origin main-full-dev`; if local is behind with no
   local-only commits, fast-forward local to the remote tip.
3. Read this file's Checkpoint status and Pending sections.
4. `bun install`, then `bunx playwright install chromium` if the
   browser cache is missing (playwright 1.64.1 needs build 1248), and
   `mkdir -p scripts/theme-scratch` (see Known issues above).
5. Provision the gate environment: start mongod (binary path above)
   with `--dbpath /home/z/my-project/scripts/mongo-data --fork
   --logpath /home/z/my-project/scripts/mongod.log --bind_ip
   127.0.0.1`, write `.env.local`, seed with
   `node scripts/seed-mongodb.ts`.
6. Resume the exact next step listed above; obtain fresh owner
   authorization for anything beyond it.
