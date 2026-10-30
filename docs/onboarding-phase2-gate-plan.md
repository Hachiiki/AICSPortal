# AICS Portal - Onboarding Phase 2 Gate - Plan of Record

**Date:** 2026-10-29

**Branch:** `main-full-dev` @ `46c33a5` (remote-verified)

**Status:** The Phase 1 and Phase 2 build is authorized (my explicit authorization of 2026-10-29, on `main-full-dev` only). This document defines how the mandatory Phase 2 gate gets judged when the build reaches review. It does not approve the gate outcome, and it does not start Phase 3. The gate outcome is decided only by me.

**What this is:** The plan of record for the Phase 2 review gate from `docs/onboarding-phase0-plan.md` section 4, turned into an explicit criterion-by-criterion acceptance and evidence checklist: what gets tested, how, what evidence each test leaves behind, and what pass, conditional pass, and fail mean. It strengthens nothing and weakens nothing in the Phase 0 plan; where the two could be read differently, the Phase 0 plan wins and this document gets fixed.

**Rev 2026-10-29 (first pass):** prepared from the Phase 0 plan as it stands after my review approvals (major/minor rule, Help & Support dot, checklist in v1). The repo baseline in section 3 was verified read-only on 2026-10-29 at `46c33a5`. Zero application code changed; nothing committed, pushed, merged, or deployed.

**Rev 2026-10-29 (second pass, owner decisions applied):** I made the three gate decisions this document reserved for me, and they are now written into section 9 and the pass rules in section 6: hybrid performance evaluation with provisional thresholds to be validated during Phase 2, the structured cost signal rubric with S2 mandatory and S1 a warning signal rather than an automatic failure, and a conditional pass capped at three items resolved by the Phase 3 acceptance review. D5, D7, and D9 are dropped as unresolved historical decisions. The Phase 1 and Phase 2 build is authorized on `main-full-dev`; the gate outcome approval is not, and it stays mine.

**Rev 2026-10-30 (push wording aligned; Phase 1 review checkpoint closed):** the standing-convention reference in section 11 now names the updated rule explicitly (`CLAUDE.md` section 6, updated 2026-10-30): every completed commit pushes immediately to `origin/main-full-dev`, never `main`, and a push still authorizes no PR, merge, or deployment. Separately, I approved the five registry dimension identities on 2026-10-30 exactly as implemented in `src/lib/onboarding/registry.ts` (Phase 0 plan, section 2.6); that closes the Phase 1 review checkpoint and changes nothing in this checklist. Zero application code changed; the gate has not run.

## 1. What this gate is, and what it is not

The Phase 2 gate is the mandatory stop-and-review between the synthetic engine work and any role-specific content. Phase 2 builds the in-house tour engine and exercises it with a dev-only synthetic tour; the gate asks whether that engine is good enough, and cheap enough, to build three role experiences on. It is a stop-and-review gate, not advice, not a suggestion, and not optional guidance (Phase 0 plan, section 4).

This document is the checklist for that review. The engine build and the gate run carry my authorization of 2026-10-29, which covers Phase 1 and Phase 2 only; only I approve continuation to Phase 3, and a clean test report is evidence for my decision, never the decision itself (Phase 0 plan, section 4.2).

## 2. What must exist before the gate can run

Straight from the Phase 0 plan, the gate only runs once Phase 2 has delivered:

- A working synthetic, dev-only tour with no real role content (section 4.1).
- The Phase 1 persistence store and API in place, because the engine must tolerate its failures (sections 5 and 9).
- The evidence package described in section 8 here, reviewable by me without re-running anything (Phase 0 plan, section 9, Phase 2 acceptance).
- The stop holding: Phase 3 has not started in any form.

If any of those is missing, the gate does not run at all; it fails for incompleteness before a single criterion is judged.

## 3. Verified repo baseline (read-only inspection, 2026-10-29, `46c33a5`)

I inspected the tree read-only before writing this checklist, because a gate that tests assumptions the code does not share is theater. Everything the Phase 0 plan leans on checked out:

| Assumption the gate depends on | Verified fact | Source |
|---|---|---|
| Seven theme choices | The Settings grid exposes exactly: Light, Dark, Midnight, Slate, OLED Black, Custom, System | `src/lib/aics/theme-palette.ts`, `THEME_CHOICES` |
| Role navigation lists | Student: Dashboard, Academics, Events, Professors, Enrollment. Faculty: Dashboard, My Students, Grade Encoding, Previous Records, Announcements, Schedule, Tasks. Admin: Dashboard, Release Queue, Events, Announcements, Professors, Students & Faculty, Enrollment. All three carry Settings and Help & Support as shared secondary items | `src/lib/aics/nav-config.ts` |
| Session identity path | `getAuthedSession(request)` returns the authenticated session claims, used by all API routes | `src/lib/session-auth.ts` |
| Authorization conventions | `requireCan` / `requireRole` exported from `src/lib/authz`; policy decided server-side | `src/lib/authz/index.ts`, ADR-0007 |
| Branch scoping | Branch-as-field model on every read and write | `docs/adr/0001-branch-as-field.md` |
| Reduced-motion contract | `MotionConfig reducedMotion="user"` wraps the portal shell and the login view; components also use `useReducedMotion` directly | `src/components/portal/PortalShell.tsx`, `src/components/auth/LoginView.tsx` |
| Live-region precedent | `GlobalSearch` announces results through an `sr-only` `role="status" aria-live="polite"` region; error boundaries use `role="alert"` | `src/components/portal/GlobalSearch.tsx` |
| Focus-contract precedent | `DialogPanel`: Escape closes, focus moves in, Tab is trapped inside, focus returns to the triggering element, `role="dialog"` plus `aria-modal` | `src/components/portal/DialogPanel.tsx` |
| Overlay ladder | Page content under z-20, Topbar z-20 (sticky), Sidebar z-30, drawer backdrops z-40, drawers/modals/dropdowns/toasts z-50 | `src/components/portal/PortalShell.tsx` |
| Skip link | `#main-content` skip link is the first tab stop on every portal page | `src/components/portal/PortalShell.tsx` |
| Browser automation convention | Playwright chromium driven by bun scripts under `scripts/theme/`; every gate run writes a `manifest.txt` (baseline SHA, HEAD SHA, exact command line, environment, exit codes, timestamps, deviations); a run without a pinned baseline is invalid | `scripts/theme/lib.mjs`, `docs/done/qa_evidence/` |
| Quality gates | `npm run lint`, `npm run typecheck`, `npm run build`; unit tests via `bun test src/lib/authz/` (no `npm test` script exists or should be added, plan decision P2); wider verification is build plus lint plus manual browser check | `package.json`, `CLAUDE.md` |

Clarifications the gate accounts for, recorded so the checklist tests reality rather than a paraphrase of the plan:

1. Navigation is client-side History API, not Next.js routing. `usePortalRoute` pushes state, fires a custom `pushstate` event, and a catch-all `/portal/[...slug]` route re-renders the root dispatcher. URL shape: `/portal/{branch}/{role}/{username}/{view-segment}`. A mid-tour navigation is a client view swap, and targets on the incoming view mount asynchronously. Criterion C4 and H1 test that reality.
2. The palettes ride on dark: Midnight, Slate, and OLED Black apply only while the app is dark, including system-resolved dark; Custom applies on explicit Light or Dark and is stripped under System. Criterion G1 resolves the seven choices into those concrete combinations instead of pretending System paints its own colors.
3. Nav items are render-filtered by a display-only permission mirror in `nav-config.ts`. A role's nav can shrink without a code change, so the missing-target scenarios in B2 include permission-filtered entries, not just renamed ones.
4. Today's nav markup carries `aria-current="page"` and nav-level labels but no dedicated stable hook attributes for a spotlight to grab. The targeting strategy, view ids versus added data attributes, is Phase 2 design work; adding attributes touches app markup, which is implementation under the same authorization as everything else. The evidence must document whichever strategy is used and why it survives ordinary refactors.
5. On small screens the sidebar navigation opens as a modal dialog. The tour's mobile sheet has to coexist with that dialog, not fight it for focus. Criterion F1 says so explicitly.
6. Admin Help & Support currently renders the student FAQ set (`faqsFor` branches on faculty only). That is fine for the engine gate, flagged here so the Phase 3 replay-entry work gives admin help content a deliberate look instead of inheriting one silently.
7. No performance baselines or budgets exist anywhere in the repo. The gate therefore records measurements with no invented thresholds; any threshold is mine to set or decline at review.

No contradiction between the Phase 0 plan and the current code turned up. Where the plan's wording was loose ("the browser automation pass the repo already uses"), the concrete convention in the table above is what it refers to.

## 4. Gate summary

The gate is a review of the dev-only synthetic engine against the 26 criteria in section 5. Verification runs through two channels that already exist in this repo: automation, meaning bun-driven playwright scripts under `scripts/onboarding/` writing a manifest per run the way `scripts/theme/` does, and targeted manual passes with recorded steps. All of it lands under `docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/` per the evidence list in section 8, next to a cost memo that keeps measured facts visibly separate from estimates. Every criterion is mandatory for a pass; one short list of explicitly permitted non-blocking issue classes can carry a conditional pass; anything else fails the gate and stops the work. The outcome is mine alone: approve continuation, conditionally approve with follow-ups, or stop with options. A passing report is evidence, never authorization.

## 5. Acceptance criteria and evidence checklist

All 26 criteria are mandatory for a clean pass. Each block lists the requirement, the verification method, the evidence it leaves behind, the pass rule, and what blocks approval. Automation runs record a `manifest.txt` per the established convention; anything manual is manual on purpose and says so in its artifact.

### A. Scope and integrity

**A1 Dev-only scoping.** Requirement: the synthetic tour exists only in dev; a production build ships nothing onboarding. Verify: production build smoke plus a scripted check that no onboarding surface mounts in the production build. Evidence: results in `quality-gates.log`. Pass: zero onboarding render paths in production. Blocker: any onboarding surface reachable in production.

**A2 Boundary integrity.** Requirement: no existing collection schema, environment variable, auth or authz behavior changes; onboarding state is never consulted by any access decision (Phase 0 plan, sections 2.2 and 5). Verify: diff against the pinned baseline plus the authz test suites. Evidence: `baseline-sha.txt`, the diff summary inside `cost-memo.md`, suite results in `quality-gates.log`. Pass: boundary clean. Blocker: any schema/env/auth change, or any access decision reading onboarding state.

**A3 Evidence completeness.** Requirement: every criterion's artifact exists, carries the manifest, and is reviewable by me without re-running anything. Verify: a walkthrough of the package as shipped. Evidence: the package itself plus its `README.md` index. Pass: complete and self-sufficient. Blocker: any missing or non-reproducible artifact.

### B. Target handling

**B1 Present targets.** Requirement: a step whose target exists spots it, and the spotlight flips and clamps near viewport edges instead of going off-screen (Phase 0 plan, section 4.1, positioning). Verify: scripted run across live nav targets at several widths. Evidence: `positioning-report.md` plus screenshots. Pass: every step frames its target with no clipping. Blocker: wrong element framed, or spotlight or card off-screen.

**B2 Missing at start.** Requirement: a target absent when the step opens, hidden nav item, permission-filtered entry, empty-state variant, degrades calmly: the engine's documented fallback (skip the step or center the card) runs with no crash, no blank spotlight, no trapped focus. Verify: scripted missing-target scenarios plus manual confirmation. Evidence: `targets-matrix.md`. Pass: the defined behavior demonstrated in every scenario. Blocker: silent failure, crash, or stranded keyboard.

**B3 Delayed targets.** Requirement: a target mounting late, async data, never flashes a wrong position; the engine waits or degrades per its documented rule. Verify: scripted run against a slow-loading view. Evidence: `targets-matrix.md` plus a recording. Pass: no wrong-position flash and the documented wait-or-degrade behavior holds. Blocker: spotlight pinned to a placeholder or a stale element.

**B4 Removed mid-tour.** Requirement: a target unmounting while its step is open degrades calmly and keeps tour state intact. Verify: scripted unmount scenario. Evidence: `targets-matrix.md`. Pass: calm degrade demonstrated. Blocker: crash, stuck overlay, or lost session progress.

### C. Positioning

**C1 Resize.** Requirement: viewport resizes reposition the spotlight; nothing strands off-screen. Verify: scripted resize series through the breakpoints. Evidence: `positioning-report.md`. Pass: correct repositioning at every tested width. Blocker: spotlight or card outside the viewport after a resize.

**C2 Scroll.** Requirement: the spotlight tracks its target through page scroll, with the sticky Topbar overlay accounted for. Verify: scripted scroll passes over long views. Evidence: `positioning-report.md`. Pass: the target stays framed. Blocker: spotlight drifting off the target while scrolling.

**C3 Layout change within a route.** Requirement: content shifts inside a view, data arriving or skeletons resolving, reposition correctly without manual help. Verify: scripted skeleton-to-content pass. Evidence: `positioning-report.md`. Pass: repositioned cleanly. Blocker: stale position after a content shift.

**C4 Cross-route steps.** Requirement: a step whose target lives on another view navigates through the app's own pushState navigation and re-spots the target after it mounts. Verify: scripted multi-step tour crossing at least two views. Evidence: `positioning-report.md` plus a recording. Pass: target framed after the view swap. Blocker: spotlight lost across navigation.

**C5 Overlay layering.** Requirement: the engine documents its layer choice inside the shell's z ladder and coexists with a modal, a dropdown, and a toast during a tour without visual or focus conflicts. Verify: scripted overlay coexistence run. Evidence: `positioning-report.md` plus recordings. Pass: documented layer holds, no conflicts. Blocker: tour hidden behind an existing overlay or stealing focus from one.

### D. Keyboard and announcements

**D1 Full keyboard operation.** Requirement: every step is operable keyboard-only, next, back, skip, close, with visible focus throughout, no trap while the tour is open, and the page tab order and the `#main-content` skip link intact (Phase 0 plan, section 10). Verify: scripted keyboard-only walkthrough plus manual confirmation. Evidence: `keyboard-focus-report.md`. Pass: full operation with no strandings. Blocker: any control unreachable by keyboard, or a broken tab order or skip link.

**D2 Focus management.** Requirement: focus moves into each step card, never strands between steps, and restores to the triggering element when the tour ends or is skipped, matching the DialogPanel contract (Phase 0 plan, sections 4.1 and 10). Verify: scripted focus assertions plus manual check. Evidence: `keyboard-focus-report.md`. Pass: per-step placement correct and restore demonstrated. Blocker: focus lost on any transition or left on a dead element.

**D3 Screen-reader announcements.** Requirement: step changes announce through a polite live region matching the portal's existing pattern, the GlobalSearch sr-only status region, covering start, step change, skip, and end, with nothing chatty or redundant (Phase 0 plan, section 10). Verify: manual screen-reader pass plus scripted live-region assertions. Evidence: `sr-announcements-report.md`. Pass: announcements correct and on par with the portal. Blocker: silent step changes or duplicate announcements.

**D4 Accessible names.** Requirement: the spotlight, step card, and every control carry an accessible name, so the tour is operable without sight. Verify: scripted name audit from the automation accessibility snapshot plus manual pass. Evidence: `sr-announcements-report.md`. Pass: no unnamed controls. Blocker: any unnamed interactive surface.

### E. Motion

**E1 Reduced motion.** Requirement: with `prefers-reduced-motion` on, the spotlight and step transitions settle without animation, per the shell's `MotionConfig reducedMotion="user"` contract, and the tour stays fully operable (Phase 0 plan, section 10). Verify: scripted run under reduced-motion emulation plus manual check. Evidence: `reduced-motion-report.md`. Pass: no movement when the setting is on. Blocker: animated transitions with reduced motion on.

### F. Responsive

**F1 Mobile sheet fallback.** Requirement: on small viewports the spotlight tour falls back to a bottom-sheet presentation usable on phone widths, coexisting with the mobile navigation dialog rather than fighting it (Phase 0 plan, section 10). Verify: scripted run at phone widths plus manual pass. Evidence: `mobile-sheet-report.md`. Pass: the sheet is usable and the nav dialog coexists. Blocker: unusable sheet, or a focus fight with the mobile nav dialog.

### G. Themes

**G1 All seven theme choices.** Requirement: spotlight, scrim, step card, and sheet stay readable and contrast-checked across the seven choices exactly as the source defines them: Light; Dark; Midnight, Slate, and OLED Black, each verified in dark mode with its data-palette attribute; Custom, a saved custom theme applied on explicit Light or Dark; System, verified resolved light and resolved dark with the palette stripped (Phase 0 plan, sections 4.1 and 10). Verify: scripted screenshot and computed-style matrix per theme, following the existing theme-gate conventions, plus manual review. Evidence: `theme-matrix.md` plus `screenshots/`. Pass: readable text and visible surfaces in every combination, OLED Black and the saved custom theme included. Blocker: unreadable or invisible surfaces in any choice.

### H. Stability and data

**H1 Unplanned mid-tour navigation.** Requirement: a user navigating away mid-step gets the engine's documented behavior, follow the user or end calmly, never a crash, orphaned overlay, or lost focus (Phase 0 plan, sections 4.1 and 10). Verify: scripted mid-tour navigation scenario. Evidence: `stability-report.md`. Pass: documented behavior demonstrated. Blocker: crash or stranded state.

**H2 Persistence failures stay non-blocking.** Requirement: a simulated progress read failure hides onboarding surfaces while the portal keeps working, and a simulated write failure keeps the tour running for the session, treats completion charitably, and never restricts the portal (Phase 0 plan, section 5). Verify: scripted failure simulation against the Phase 1 API with failures forced. Evidence: `persistence-failure-report.md`. Pass: the portal stays fully usable under both failures. Blocker: any portal lockout or trapped state on a persistence failure.

### I. Cost and performance

**I1 Cost memo, facts separated from estimates.** Requirement: the memo answers the cost questions in section 7 with measured facts, files touched, lines added, dependencies added, components, dev-only scaffolding, cleanly separated from reasoned estimates, maintenance per future nav or theme change, and stated assumptions; it compares the engine's weight honestly against what the Phase 0 plan expected, the custom-engine-costs-more risk (Phase 0 plan, section 4.1, cost). Verify: my read-through plus the baseline diff. Evidence: `cost-memo.md`. Pass: memo complete and honest, no cost claim without a source. Blocker: missing memo, facts and estimates conflated, or a disguised cost.

**I2 Performance measurements against the provisional thresholds.** Requirement: record what is measurable: client bundle delta, step-advance timing, resize and scroll handler cost, dev-mode memory, each measured against the decided rules in section 9. The thresholds are provisional by my decision: Phase 2 validates them, reports the evidence, and flags any that look unsuitable; recommended adjustments come to me rather than being applied silently. Verify: scripted timing runs recorded with the manifest. Evidence: `performance-notes.md`. Pass: measurements present, reproducible, honestly caveated, with each provisional threshold explicitly marked met, missed, or flagged unsuitable with a recommendation. Blocker: regression claims without numbers, or measurements that cannot be reproduced from the manifest.

### J. Quality gates and regressions

**J1 Static gates green.** Requirement: `npm run lint`, `npm run typecheck`, and `npm run build` all pass (Phase 0 plan, section 9, Phase 1 acceptance applies here too). Verify: run them. Evidence: `quality-gates.log`. Pass: all green. Blocker: any red gate.

**J2 Test suites and regressions.** Requirement: `bun test` suites pass, the existing authz suites plus any onboarding suites added following the dev-only versus production-tracked convention, and existing portal behavior shows no regression, including the skip link, existing modals and dialogs, and notifications. Verify: `bun test` plus a scripted regression smoke of existing overlays. Evidence: `quality-gates.log` plus regression notes in the reports. Pass: suites green, no regressions. Blocker: any failing suite or a regression in existing surfaces.

**J3 Automation coverage.** Requirement: positioning (B1, C1 through C5) and missing-target behavior (B2 through B4) are covered by automation under `scripts/onboarding/` with a manifest per run, and anything left manual is listed with the reason it cannot be automated. Verify: re-run the scripts from a clean checkout per the manifest. Evidence: scripts plus manifests under the evidence root. Pass: coverage real and reproducible. Blocker: criteria claimed without artifacts, or scripts that only pass on the author's machine.

## 6. Gate outcomes and the approval boundary

Three outcomes, no others:

- **Pass.** Every mandatory criterion passes and the evidence package is complete. The gate report comes to me with a recommendation, and that is all it is. Only my explicit approval starts Phase 3. A passing report alone is not authorization.
- **Conditional pass.** Every mandatory criterion passes, and the only remaining issues sit inside the permitted classes below. Each remaining issue carries an owner I assign at approval, a rationale, and a follow-up requirement with a due point I set. A conditional pass never waves a mandatory criterion: if a criterion failed, the outcome is fail, full stop, no matter how small the failure looks.
- **Fail / stop.** Any mandatory criterion fails, evidence is missing, or a critical issue stays unresolved. The work stops and options come to me: fix and re-run the gate, change course within the approved in-house engine direction, or call the engine off. Nobody switches to a third-party tour library or changes architecture without my separate approval (Phase 0 plan, section 4.2).

Permitted classes for a conditional pass, and nothing else: minor visual polish that does not touch text contrast or theme readability; wording inside the evidence package; performance observations tied to the provisional thresholds in section 9 and my validation decision at review. Anything accessibility-related, stability-related, data-safety-related, or scope-related is never conditional.

My decision of 2026-10-29 caps a conditional pass at three open items. A fourth issue inside the permitted classes still fails the gate and sends the work back for fixes and a re-run. Every conditional item is resolved by the Phase 3 acceptance review, and none of them may wave a mandatory criterion.

## 7. Cost questions the gate must answer

The memo behind criterion I1 answers these, with verified facts, estimates, and missing information kept visibly separate:

1. Maintenance: what does one future change to navigation, routing, or theme markup cost the engine? What is the per-change burden in files touched and effort?
2. Dependencies: did the engine add any runtime dependency? The expected answer is none, per D2, built on the pieces the project already has: framer-motion, the DialogPanel focus contract, the existing live-region patterns. Any new dependency needs my separate approval and a vetting pass per the repo's dependency conventions before it lands.
3. Licensing: only in play if a dependency appears. The existing dependencies are already in use and already vetted; if nothing new is added, this question answers itself.
4. Implementation complexity: how many files and lines, how much is engine versus content scaffolding, how many components, and how much is dev-only and retired later.
5. Operational cost: client bundle size delta, overlay runtime cost, anything that would show up on a hosting bill, and the cost of retiring the dev-only scaffolding at the polish phase.
6. What cannot be quantified from available evidence, said in those words: there is no historical maintenance data for a brand-new engine; production performance is unmeasurable until the feature ships past dev; long-run cost under portal evolution is a reasoned estimate, not a measurement. The memo names what is missing instead of papering over it with invented numbers.

## 8. Evidence artifact list

Evidence root, proposed, following the existing dark-theme gate layout under `docs/done/qa_evidence/ui-ux/`:

`docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/`

- `README.md` - index of the package, the run order, and how to read it
- `baseline-sha.txt` - the pinned commit where Phase 2 work began; a gate run without a recorded baseline is invalid
- `manifest.txt` - per the theme-gate convention: baseline SHA, HEAD SHA, exact command lines, environment, exit codes, timestamps, deviations
- `targets-matrix.md` - present, missing, delayed, removed (B1 through B4)
- `positioning-report.md` - resize, scroll, layout change, cross-route, layering (B1, C1 through C5)
- `keyboard-focus-report.md` - keyboard operation and focus management (D1, D2)
- `sr-announcements-report.md` - live-region and accessible-name results (D3, D4)
- `reduced-motion-report.md` - reduced-motion verification (E1)
- `mobile-sheet-report.md` - phone-width behavior and nav-dialog coexistence (F1)
- `theme-matrix.md` plus `screenshots/` - the seven theme choices (G1)
- `stability-report.md` - mid-tour navigation (H1)
- `persistence-failure-report.md` - simulated read and write failures (H2)
- `cost-memo.md` - the section 7 answers, facts versus estimates (I1)
- `performance-notes.md` - measurements against the provisional thresholds, each marked met, missed, or flagged unsuitable (I2)
- `quality-gates.log` - lint, typecheck, build, bun test, production smoke, regression smoke (A1, J1, J2)
- `recordings/` - short clips for the scenarios prose cannot carry

Automation scripts for the authorized Phase 2 build: `scripts/onboarding/*.mjs`, run with bun against the dev server, following the `scripts/theme/lib.mjs` conventions including the manifest. Their tracking follows the existing test convention: dev-only unless a separate convention decision says otherwise.

## 9. Thresholds and decisions, decided by me on 2026-10-29

These were mine to set, and I set them at the final decision review. The evidence package measures against them exactly as written; the Phase 2 run validates the provisional parts and reports, and any change to them is my call, not the builder's:

1. Performance thresholds (option D, hybrid numerical and qualitative). Four rules. First, the production bundle delta is zero onboarding bytes and zero onboarding modules; this restates criterion A1 and is not provisional. Second, step-advance timing is p95 at or under 100 ms from keypress or click to spotlight settled, measured over at least 20 advances and 3 runs on the gate box and recorded in the manifest. Third, no long task over 50 ms attributable to tour handlers during the scripted resize and scroll series; 50 ms is the Long Tasks API's own definition. Fourth, no monotonic dev-mode heap growth across 5 consecutive full tour cycles, with the heap returning near baseline after tour end. The last three are provisional: Phase 2 measures actual behavior against them, records the evidence, and flags any threshold that looks unsuitable, with recommended adjustments coming to me rather than being applied silently. Qualitative judgment still governs perceptual quality; the numbers govern what is objectively countable.
2. Cost proportionality (option 3, structured signal rubric). S1, engine core size relative to the portal's largest existing interactive component, is a warning signal requiring justification, not an automatic failure on line count alone. S2, zero new runtime dependencies, is mandatory and not provisional. S3, one representative future navigation or theme change costs at most one documented touch point, plus a documented target-resolution contract. S4, the gate automation is reusable for the Phase 3 and Phase 4 role tours rather than rewritten. S5, dev-only scaffolding is removable by a diff that touches no production path. The pass bar I set: S2 mandatory; S1, S3, S4, and S5 must all be satisfactory.
3. Conditional-pass policy (option B). The permitted classes in section 6 stand as written, capped at three open items, each resolved by the Phase 3 acceptance review. A conditional pass never waves a mandatory criterion.
4. D5, D7, and D9 are dropped as unresolved historical decisions: meanings not invented, IDs retired. Still open and still mine: the Phase 2 gate outcome itself, and the per-role step lists for Phase 3 and Phase 4 (Phase 0 plan, section 12).

## 10. Gate review template

What I fill in at review time:

```
# Phase 2 gate review - AICS Portal onboarding

Reviewer: me (the owner)                Date: ____
Evidence root: docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/
Manifest reviewed: ____                 Deviations noted in manifest: ____
Baseline SHA: ____                     HEAD SHA: ____

## Criterion dispositions

| ID | Result (pass / fail / not evidenced) | Notes |
|---|---|---|
| A1 | | |
| A2 | | |
| A3 | | |
| B1 | | |
| B2 | | |
| B3 | | |
| B4 | | |
| C1 | | |
| C2 | | |
| C3 | | |
| C4 | | |
| C5 | | |
| D1 | | |
| D2 | | |
| D3 | | |
| D4 | | |
| E1 | | |
| F1 | | |
| G1 | | |
| H1 | | |
| H2 | | |
| I1 | | |
| I2 | | |
| J1 | | |
| J2 | | |
| J3 | | |

## Mandatory confirmation

All mandatory criteria pass: yes / no
Remaining issues are all inside the permitted classes (section 6): yes / no

## Conditional items (only if conditional pass)

| Issue | Owner | Rationale | Follow-up required | Due |
|---|---|---|---|---|
| | | | | |

## Outcome

Pass / Conditional pass / Fail-stop   (definitions: this document, section 6)

## My decision

[ ] Approve continuation to Phase 3
[ ] Conditionally approve continuation to Phase 3 with the items above
[ ] Reject; options requested (fix and re-run / change course within the in-house direction / call the engine off)

Notes: ____

This decision authorizes Phase 3 to begin and nothing else. It does not authorize porting to main, deployment, scope expansion, any third-party switch, or any change to auth or authz.
```

## 11. Authorization status

- Phase 2 gate plan of record prepared: yes, this document, 2026-10-29, as a companion to `docs/onboarding-phase0-plan.md` section 4; my gate decisions applied same day (section 9).
- Implementation authorized: yes, Phase 1 and Phase 2 only, on `main-full-dev`, 2026-10-29. Phase 3, Phase 4, Phase 5 content work, production, `main`, and deployment are not authorized.
- Application code: written under that authorization on `main-full-dev`, committed and pushed immediately to `origin/main-full-dev` per the repo's standing convention (`CLAUDE.md` section 6, updated 2026-10-30). A push authorizes no PR, merge, or deployment; those stay separate explicit authorizations.
- Gate run: authorized as part of Phase 2. The evidence package is produced and presented to me at the end of Phase 2.
- Gate outcome: not decided, and it is mine alone. A clean report is evidence, never authorization, and nobody approves the gate on my behalf.
- Branch created, switched, or deleted: no new branches; the authorized work happens on `main-full-dev` itself.
- Database schema, environment variables, auth, or authorization touched: no existing ones. Phase 1 adds its own new onboarding collection and routes under the existing conventions.
- D5, D7, and D9: dropped as unresolved historical decisions, IDs retired, meanings not invented.

This document is the checklist for a review that happens at the end of the authorized Phase 2 build. Its outcome is mine to approve, conditionally approve, or reject.
