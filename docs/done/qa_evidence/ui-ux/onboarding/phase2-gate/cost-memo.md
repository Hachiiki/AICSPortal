# Phase 2 cost memo — structured cost signals S1–S5

All facts measured at gate HEAD vs pinned baseline (`baseline-sha.txt`,
`46c33a53c5a502c4a6e5937bdeb7b81e2a82622f`). Facts and estimates are marked
separately; nothing estimated is presented as measured.

## S2 — zero new runtime dependencies (MANDATORY)

**FACT. `package.json` has zero commits between the pinned baseline and gate
HEAD** (`git log 46c33a5..HEAD -- package.json` = empty). `dependencies` and
`devDependencies` are byte-identical to baseline:

- dependencies (unchanged, runtime): @radix-ui/react-dialog, @radix-ui/react-dropdown-menu,
  @radix-ui/react-slot, @radix-ui/react-toast, @vercel/analytics,
  @vercel/speed-insights, class-variance-authority, clsx, framer-motion, jose,
  jspdf, jspdf-autotable, lucide-react, mongodb, next, next-themes, obscenity,
  react, react-dom, sonner, tailwind-merge, zod.
- devDependencies (unchanged, also compared): @tailwindcss/postcss,
  @types/react, @types/react-dom, bun-types, dotenv, eslint,
  eslint-config-next, playwright, tailwindcss, tw-animate-css, typescript.
- `playwright` was already a devDependency **at the pinned baseline** (it backs
  the gate harness itself, `scripts/onboarding/lib.mjs`); the gate work only
  installed/used it, never added it. Production never sees it regardless: A1
  proves zero onboarding/`playwright` bytes in `.next/static/chunks`.

## S1 — engine core size vs the largest existing interactive component (WARNING SIGNAL, justified)

**FACTS (raw on-disk source at gate HEAD):**

| Onboarding file | bytes | lines |
|---|---|---|
| TourOverlay.tsx (engine + overlay + positioning) | 14,897 | 384 |
| OnboardingDev.tsx (dev synthetic host + board) | 10,017 | 265 |
| OnboardingDevMount.tsx (dev-only mount switch) | 1,137 | 33 |
| registry.ts (+ its spec) | 5,656 | 145 |
| tour/geometry.ts | 4,289 | 132 |
| tour/steps.ts | 2,457 | 64 |
| api/onboarding/state/route.ts (persistence) | — | 146 |
| **Runtime total (no tests)** | **38,453 B** | **1,169** |

Largest existing interactive components: SettingsPage.tsx 44,396 B,
TasksTab.tsx 32,893 B, EnrollmentPage.tsx 25,157 B.

**Reading (JUDGMENT on the measured numbers):** the whole onboarding runtime
(engine + overlay + persistence route, 38.5 KB source) is SMALLER than the
single largest existing component (SettingsPage 44.4 KB). S1 is satisfied
without invoking the warning-signal escape hatch. Byte/line counts = FACT;
the comparison verdict = judgment on those facts.

## S3 — one representative future nav/theme change costs at most one touch point (+ target-resolution contract)

**FACTS (diff structure vs baseline):** everything the tour needs from the app
echoes existing structure:

- Navigation targets derive from `nav-config.ts` (display-only permission
  mirror, pre-existing): the tour hooks are mechanical
  (`data-tour={`nav-${item.view}`}` — one line in Sidebar.tsx's shared
  NavButton, so any new nav view names its spotlight from the config row with
  zero extra code; navigation steps declare `view` ids the engine already
  resolves through the app's own pushState nav).
  Adding a nav view: edit `nav-config.ts` (1 touch). A tour step for it is
  optional content, not wiring.
- Theme targets are the app's own tokens: the tour card reads
  `--surface/--ink/--border` etc. from `theme-palette.ts` CSS variables that
  already exist per palette; adding a palette is 1 touch in theme-palette
  tokens and the tour card inherits it (no tour file changes).
- Hooks added to existing files since baseline: Sidebar +1 line, Topbar +3
  attribute lines, EventsPage +1 attribute, page.tsx +9 (mount + comment).
  No logic moved, no prop threading. (FACT, from the measured diff.)

**Target-resolution contract (documented):** a step targets `data-tour="id"`
in the live DOM; `view` is the registry view id resolved through the portal's
pushState route; a missing target waits out its own budget then skips
(engine rule, exercised in scripts 01). Nothing else to update on an app
change that doesn't remove a hooked element.

**JUDGMENT (labeled, on the facts above):** the "at most one documented touch
point" property holds for a representative nav or theme addition BECAUSE the
hooks/tokens derive mechanically (NavButton derives hook from the
nav-config row's view name; the card reads palette CSS variables). This is
not demonstrated by editing the repo — no demo change was applied — it is a
design-property argument grounded in the measured diff structure. The
documented contract backs it; a demonstration change would be a Phase 2
implementation change and was deliberately NOT performed.

## S4 — gate automation reusable for Phase 3/4 role tours

**FACT.** The harness splits into script (scenario) and `lib.mjs` (mechanisms):
`ensureMongod/ensureDevServer` with env fingerprint + port-kills +
`validateDevServer`, `gateContext` (cookie/session/storage seeding),
`openPortal` (with origin/launcher overrides), `startTour/waitForStep/clickNext`
(aria-label driven, content-agnostic), `walkToEnd` patterns, step/report/manifest
writers. Nothing in the lib is synthetic-tour-specific (FACT — every lib
export and its parameters were reviewed; steps/targets are script-side).

**JUDGMENT (labeled):** scripts 07–13 (themes, stability, persistence, perf,
prod smoke, regression, static gates) test the ENGINE rather than the
synthetic content and are therefore directly reusable for role tours without
rewrites; scripts 01 (targets) and parts of 02 (prose-position) are
content-coupled and WILL need Phase 3 content-swapped variants. The former is
a design-property judgment backed by the script/lib split; the complete
resistance can only be confirmed when Phase 3 exists.

## S5 — dev-only scaffolding removable by a diff touching no production path

**FACTS (from the measured diff vs baseline).** The removable set is exactly:

- delete: `src/components/onboarding/*` (3 files: OnboardingDev, Mount,
  TourOverlay — the last one is *the engine itself*; removal decision belongs
  to the owner: the Phase 2 "remove scaffolding" scenarios remove the DEV
  host, not the engine), `src/lib/onboarding/*` (registry + tour lib),
  `scripts/onboarding/*`, `src/app/api/onboarding/state/route.ts`,
  the `onboarding-state-write.test.ts` and registry/engine tests,
  from `mongodb/types.ts` the `MongoOnboardingState` block (+20), from
  `authz/policies.ts|types.ts` the `onboarding.state` case/union member
  (+~24), and the 14 hook lines in page.tsx/Sidebar/Topbar/EventsPage.
- **Zero production-line removals required** (FACT: every app-level edit is
  a self-contained attribute or the 9-line mount block inside an explicit
  dev-only comment; no prop signatures, no state, no CSS lines touched).
- Removal line arithmetic (FACT, from the diff): 14 hook/mount lines in
  shared files + 24 additive authz/type lines (policies.ts 19 + types.ts 5)
  + 20 mongodb/types lines + the 1,169 new-code lines inside dedicated
  files (route.ts 146 is a whole-file delete).

**JUDGMENT (labeled):** the resulting removal diff touches no production
path — it deletes self-contained files and strips self-contained
additions. This is a diff-structure argument, not an executed removal run;
no destructive demo was performed on the working tree.

## Retrofit facts (I1 boundary + A2 diff summary)

**FACT.** Full diff vs pinned baseline: 19 files under `src/` changed,
+1,957/−1 (the −1 is the one-line `main` re-tag in EventsPage).
Non-src changes: gate docs (phase0/phase2 plans, recovery.md, CLAUDE.md) and
the 13 gate scripts + harness (docs/qa evidence, not runtime).

- A2 (boundary): authz/schema/env changes are PURELY ADDITIVE and confined to
  the approved onboarding resource (`onboarding.state` self-only policy kind
  in policies.ts/types.ts, `MongoOnboardingState` in mongodb/types.ts).
  Mechanically enforced in script 13: `git diff -U0` over boundary files
  yields zero removed lines. No existing authz case, env var, collection
  schema field, or session behavior modified. No access decision path reads
  onboarding state: the `onboarding_states` collection is touched only by
  `src/app/api/onboarding/state/route.ts` through
  `requireCan({kind:'onboarding.state'})`.
