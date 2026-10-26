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
| Updated | 2026-10-26 (UTC+8) |
| Branch | main-full-dev |
| Last verified checkpoint | Phase 1 complete — all four controls functional, all gates green (this commit) |
| Phase 0 baseline SHA | `822a5cfdd0871cf6ae98452e0d8c42a15910e2ce` (pinned before the first edit, per owner directive; NEVER rewrite) |
| Phase 1 baseline SHA | `acbe71a33e851bdda7116f8dd88cd77d0e8612f8` (Phase-0 exit, pinned per plan §5.1; file at `docs/done/qa_evidence/ui-ux/dark-theme/phase1/baseline-sha.txt`) |
| Protected baseline | `origin/main` = `b7f6fca` (NEVER touch without authorization) |

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

## Pending / exact next step

- **WAITING for the owner's separate Phase 2 authorization.** Do NOT
  start Phase 2 (or any phase) without explicit authorization.
- Phase 2 scope per plan §6: non-blocking polish & QA only (inline-hex
  cleanups in shared components, blurred-surfaces review, full route
  matrix x3 roles x2 themes, COE/ID-card light-on-dark checks,
  evidence archive under `docs/done/qa_evidence/ui-ux/dark-theme/phase2/`).
- Known Phase-2 polish candidates found during Phase 1: hover on solid
  destructive chips in dark (white bold text on `--color-red-700` at
  2.90:1 during the transient hover; rest state passes 3:1; see
  `contrast/report.json`); Sidebar/Topbar/EmptyState inline hex literals
  are Phase-2 scope by the plan's own Tier list.

## Known issues / constraints

- `docs/` and `/scripts/` are gitignored in-repo (`.gitignore:53`) —
  `git add -f` for everything under them, tracked or new.
- Playwright is a devDependency; Chromium headless shell 156.0.8078.4
  (build 1248) at `~/.cache/ms-playwright` (`bunx playwright install
  chromium` re-provisions).
- Local gate environment: mongod 8.2.6 (from mongodb-memory-server's
  downloader, binary at
  `/home/z/my-project/scripts/mmserver/node_modules/.cache/mongodb-memory-server/mongod-x64-debian-8.2.6`)
  on 127.0.0.1:27017, dbpath `/home/z/my-project/scripts/mongo-data`;
  re-seed with `node scripts/seed-mongodb.ts` (needs `.env.local`).
- **Environment layout (CHANGED 2026-10-26):** the repo clone lives at
  `/home/z/my-project/AICSPortal` (branch `main-full-dev` checked out
  directly; no separate `.worktree-mfd` dev worktree). Gate runs pass
  `GATE_MAIN_WT=/home/z/my-project/AICSPortal` (baseline scratch
  worktree still at `/home/z/my-project/.baseline-check`, outside the
  repo). `GATE_WT` defaults to the clone. The sandbox's own scaffolding
  repo sits at `/home/z/my-project` root — never touch it.
- The worktree needs `.env.local`
  (MONGODB_URI=mongodb://127.0.0.1:27017, MONGODB_DB=aics_portal,
  APP_ENV=development) for `next start` demo auth.
- G4 runs as two stages (`--stage setup`, `--stage capture`); a full run
  rebuilds both trees (~10 min). Phase-1 G4 uses `--mode parity|final`
  (see the harness header for exact commands).
- Conventions: English `type: description` commits; every push to
  `main-full-dev` requires explicit owner authorization; never
  force-push, never rewrite shared history, never push to or merge
  into `main` without explicit authorization; do not bypass failing
  checks to create a checkpoint.
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

1. `git clone -b main-full-dev <remote> /home/z/my-project/AICSPortal`
   (or `git -C /home/z/my-project/AICSPortal fetch origin` if present).
2. Compare `git rev-parse main-full-dev` with
   `git ls-remote origin main-full-dev`; if local is behind with no
   local-only commits, fast-forward local to the remote tip.
3. Read this file's Checkpoint status and Pending sections.
4. `bun install`, then `bunx playwright install chromium` if the
   browser cache is missing.
5. Provision the gate environment: start mongod (binary path above)
   with `--dbpath /home/z/my-project/scripts/mongo-data --fork
   --logpath /home/z/my-project/scripts/mongod.log --bind_ip
   127.0.0.1`, write `.env.local`, seed with
   `node scripts/seed-mongodb.ts`.
6. Resume the exact next step listed above; obtain fresh owner
   authorization for anything beyond it.
