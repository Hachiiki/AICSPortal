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
| Last verified checkpoint | `3a16e13` — Rev 2-final plan push (CI: success) |
| This notes commit | immediately after `3a16e13` (see `git log -1`) |
| Protected baseline | `origin/main` = `b7f6fca` (NEVER touch without authorization) |

## Completed (through this checkpoint)

- Dark theme Phase 1 plan finalized and pushed: Rev 1 (`f085e20`) then
  Rev 2-final (`3a16e13`), owner-approved after two review rounds. Key
  content: §1 audit (1,634 slate utilities / 237 bg-white / 119
  text-blue links / 163 hex literals / 5 `dark:` variants); §2 OKLCH
  light/dark tokens + palette-var bridge; §2.5 light-preservation
  mapping table (228 bg-white→bg-surface, 122 links→text-link, 11
  scrim→bg-scrim; whitelisted exceptions: StudentIdCard `/80`,
  FacultyGradeEncodingPage `/20`); §3 next-themes (`storageKey`
  `aics_theme`, light/dark/system, attribute class); §4 Tier A/B/C
  rollout; §5 WCAG 2.1 AA contrast gates; §5.1 mandatory gates G1–G4
  (pinned baselines, exact `bun scripts/theme/*.mjs` commands,
  stop-on-failure, evidence under
  `docs/done/qa_evidence/ui-ux/dark-theme/<phase>/<gate>/`); §6
  normative phase table (Phase 1 = engine + all four controls in one
  push; Phase 2 = non-blocking polish only); §7 verified vs assumed.
- Environment-reset recovery (2026-10-24): dev worktree and local
  helper files were wiped; verified GitHub already held `3a16e13` with
  a doc-only diff (+231/−88, single file) and green CI; rebuilt the
  dev worktree from `origin/main-full-dev`; established these notes.

## Pending / exact next step

- **WAITING for the owner's separate Phase 0 authorization.** Do NOT
  start Phase 0 (or any phase) without explicit authorization.
- Phase 0 scope per plan §6: tooling commit only — add Playwright as
  the sole new devDependency, create the `scripts/theme/*.mjs` gate
  scripts, and pin gate baselines (`git rev-parse HEAD >
  .../baseline-sha.txt` as the first Phase-0 action).

## Validation results (latest)

- `3a16e13` push: doc-only diff vs `f085e20` (+231/−88, single file
  `docs/dark-theme-phase1-plan.md`); local == `origin/main-full-dev`;
  CI completed with success (2026-10-24T10:37:21Z).
- Code baseline (unchanged since `f085e20`): authz 76 pass;
  scripts/lib 6 pass; lint 0 errors; typecheck clean.
- Doc-only commits: code checks not applicable (skipped and reported
  honestly per workflow rule 2).

## Known issues / constraints

- `docs/` is gitignored (`.gitignore:53`) — always `git add -f`.
- `.git/info/exclude` hides `.worktree-mfd/`, `scripts/`, `download/`,
  `tool-results/` from status — check dirty state carefully.
- Playwright is NOT yet in `package.json` (planned for Phase 0).
- Demo auth exists: `src/app/api/auth/demo/route.ts` (dev-only, seed
  student juan.santos).
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
- Runtime: bun (bun install / bun run / bun test)
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
5. Recreate local helpers (`scripts/board.py`, `worklog.md`) as needed.
6. Resume the exact next step listed above; obtain fresh owner
   authorization for anything beyond it.
