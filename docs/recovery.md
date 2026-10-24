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
| Updated | 2026-10-24 (UTC+8) |
| Branch | main-full-dev |
| Last verified checkpoint | Phase 0 complete — all four gates green (this commit) |
| Phase 0 baseline SHA | `822a5cfdd0871cf6ae98452e0d8c42a15910e2ce` (pinned before the first edit, per owner directive) |
| Protected baseline | `origin/main` = `b7f6fca` (NEVER touch without authorization) |

## Completed (through this checkpoint)

- **Phase 0 of the dark-theme plan (Rev 2-final `3a16e13`), fully gated:**
  - §2.5 migrations: 361 class occurrences across 57 files — 228
    `bg-white`→`bg-surface` (all variant prefixes + /alpha preserved; the
    two allowlisted literals stay: StudentIdCard `bg-white/80`,
    FacultyGradeEncodingPage `bg-white/20`), 122 link occurrences
    (`text-blue-600`→`text-link` ×36, `text-blue-700`→`text-link-strong`
    ×85 incl. 10 hover + 1 focus, `hover:text-blue-800`→
    `hover:text-link-deep` ×1), 11 scrim sites
    (`bg-slate-900/{40,50}`→`bg-scrim/{40,50}` ×10 + LegalShell skip-link
    `focus:bg-slate-900`→`focus:bg-scrim`).
  - globals.css: five var-chain tokens added with LIGHT values only
    (`--surface` `#FFFFFF`; `--link/--link-strong/--link-deep` =
    v4-exact blue-600/700/800 oklch; `--scrim` = v4-exact slate-900);
    dead "Profile page design tokens" block deleted (resolves the
    `--color-muted` last-wins duplicate — zero `*-muted` call sites — and
    the literal `--color-surface` collision). Vestigial
    `tailwind.config.ts` deleted.
  - Gate harness at `scripts/theme/` (+ Playwright, the only new
    devDependency): `lib.mjs`, `specimen.html` (canonical 16-form §2.5
    inventory), `equiv-check.mjs` (G1), `g2-computed.mjs` (G2),
    `g3-specimen-diff.mjs` (G3), `g4-route-diff.mjs` (G4),
    `db-clone.mjs` (EJSON DB snapshot/restore for deterministic gate
    data).

## Gate results (Phase 0, evidence under docs/done/qa_evidence/ui-ux/dark-theme/phase0/)

- **G1 token-resolution equivalence: PASS** — 16/16 mapping forms resolve
  identically in light mode (old vocabulary compiled at the pinned
  baseline, new at HEAD, project's own Tailwind 4.3.3; winner branch =
  `@supports` color-mix). Evidence: `g1/` (report.json, resolved-pairs.tsv,
  pre/post inventories: 363 old occurrences − 2 allowlisted = 361).
- **G2 computed-style equality: PASS** — 16/16 pairs × 11 properties
  identical in headless Chromium under real :hover/:focus states,
  `::file-selector-button` pseudo, and the supports-[backdrop-filter]
  variant. Evidence: `g2/` (computed.json, mismatches.txt empty).
- **G3 specimen screenshot diff: PASS** — 0 differing pixels for the rest
  capture and the focused-state captures of every focus-kind pair.
  Evidence: `g3/`.
- **G4 route-level + coverage: PASS** — 24/24 route/state pairs at 0
  differing pixels (login, 4 legal, 8 student, 3 faculty, 4 admin routes +
  admin-events modal, student COE modal, topbar dropdown, skeleton
  loading); all coverage greps pass (exactly the two allowlisted
  bg-white literals remain; zero text-blue-600/700/800 and bg-slate-900
  stragglers); class-diff multiset == §2.5 mapping table exactly.
  Emitted CSS: 97505 B → 97561 B (+56 B, +0.06%). Evidence: `g4/`.
- **Other validation:** authz 76/76 pass; scripts/lib 6/6 pass; lint 0
  errors (23 pre-existing warnings); typecheck clean; `bun run build`
  succeeded for both trees (as part of G4).
- **Honest deviations/findings (documented in gate manifests):** student
  COE modal captured on /profile (the UI lives there); faculty/admin
  sessions minted with the dev fallback secret (DB-validated); student
  demo auth via native fetch (Playwright context.request throws on
  Set-Cookie under Bun); DB seeded once + snapshot/restored (the seed
  randomizes part of the roster); hover variants render at rest in G3
  (active states proven by G2/G4).

## Pending / exact next step

- **WAITING for the owner's separate Phase 1 authorization.** Do NOT
  start Phase 1 (or any phase) without explicit authorization.
- Phase 1 scope per plan §6: the single 1a+1b push — theme engine
  (ThemeProvider with `attribute="class"`, `defaultTheme="system"`,
  `enableSystem`, `storageKey="aics_theme"`, `disableTransitionOnChange`;
  recalibrated `.dark` tokens + Layer-2 palette overrides; login `T.*`
  dark values; dark skeleton; `color-scheme`) + ALL FOUR controls
  (Settings appearance selector, Topbar toggle, login toggle). Phase 1
  re-runs G1/G2/G4 in light vs the Phase-0 exit commit before its push.

## Known issues / constraints

- `docs/` and `/scripts/` are gitignored in-repo (`.gitignore:53`) —
  always `git add -f` (tracked files are unaffected by ignore rules).
- `.git/info/exclude` hides `.worktree-mfd/`, `scripts/`, `download/`,
  `tool-results/`, `.baseline-check/` locally — check dirty state carefully.
- Playwright is a devDependency (Phase 0); Chromium installed at
  `~/.cache/ms-playwright` (headless shell 156.0.8078.4).
- Local gate environment: mongod 7.0.14 daemon (`--fork`) on
  127.0.0.1:27017 with dbpath `/home/z/my-project/scripts/mongo-data`;
  re-provision via mongodb-memory-server downloader if lost. Both
  worktrees need `.env.local` (MONGODB_URI, MONGODB_DB=aics_portal,
  APP_ENV=development — required for the dev-only demo auth under
  `next start`). The mongodb driver must run under Node, not Bun.
- G4 runs as two stages (`--stage setup`, `--stage capture`) to fit
  execution timeouts; a full run rebuilds both trees (~10 min).
- Conventions: English `type: description` commits; every push to
  `main-full-dev` requires explicit owner authorization; never
  force-push, never rewrite shared history, never push to or merge
  into `main` without explicit authorization; do not bypass failing
  checks to create a checkpoint.
- Status-board credentials live only in the local untracked helper
  script; they must never be committed, logged, or reported.

## Environment layout (post-recovery reference)

- Repository: `Hachiiki/AICSPortal` (GitHub, token-embedded remote URL)
- Main worktree: `/home/z/my-project` (branch `main` — do not develop here)
- Dev worktree: `/home/z/my-project/.worktree-mfd` (`main-full-dev`)
- Runtime: bun (bun install / bun run / bun test); node for mongodb
  driver scripts
- Detailed task history: local worklog at `/home/z/my-project/worklog.md`
  (untracked; may not survive resets — these notes are the durable copy)

## Recovery procedure (after a reset)

1. `git -C /home/z/my-project fetch origin`
2. Compare `git rev-parse main-full-dev` with
   `git ls-remote origin main-full-dev`; if local is behind with no
   local-only commits, fast-forward/reset local to the remote tip.
3. Rebuild the dev worktree if missing:
   `git worktree prune && git worktree add .worktree-mfd main-full-dev`
   (run from `/home/z/my-project`).
4. Read this file's Checkpoint status and Pending sections.
5. Recreate local helpers (`scripts/board.py`, worklog) and the gate
   environment (mongod, `.env.local`, `bunx playwright install chromium`)
   as needed — see Known issues above.
6. Resume the exact next step listed above; obtain fresh owner
   authorization for anything beyond it.
