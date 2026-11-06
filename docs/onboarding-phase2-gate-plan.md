# AICS Portal - Onboarding Phase 2 Gate - Plan of Record

## Owner acceptance amendment, 2026-11-06

Overall status: **Phase 2 complete, accepted by the owner with deferred follow-ups**.

The project owner explicitly authorized Phase 2 completion and proceeding with Phase 3 in this chat on 2026-11-06, Asia/Shanghai. The owner amended the acceptance criteria to defer these four requirements from the Phase 2 completion gate:

1. I2 Rule 2 transition timing, including all recorded failures against the 100 ms target.
2. I2 Rule 3 attribution of Windows long tasks.
3. I2 Rule 4b corrected retained-memory attribution and its remaining review/corrections.
4. A3 remaining evidence-package corrections.

These four items no longer block Phase 2 completion. Track them as open follow-ups in [TODO.md](../TODO.md#onboarding-phase-2-acceptance-and-deferred-follow-ups), with the technical detail retained in the [completion report](onboarding-phase2-completion-report.md#owner-acceptance-decision-2026-11-06). No due date or implementer was assigned by this decision.

This explicit owner amendment supersedes the earlier mandatory-completion and fail/stop rules for these four items only, including the three-item conditional-pass cap in sections 6 and 9. The outcome is owner acceptance under amended criteria. It does not assert that all technical criteria passed or use the earlier conditional-pass mechanism. All other requirements and recorded PASS, FAIL and INCONCLUSIVE results remain intact. The 100 ms target and historical memory benchmarks are unchanged; no sample, raw measurement, manifest or historical failure is rewritten.

The manual trace comparison remains supporting evidence, limited to the compared traces and their recorded conditions. It does not establish Windows task ownership, a compliant three-run timing PASS or complete retained-object attribution. No additional trace metadata or observations were supplied with this decision.

Phase 3 student onboarding may proceed on `main-full-dev`. This recording task changes acceptance documentation and follow-up tracking only and requires no additional test runs. PRs, merges to `main`, deployment and Faculty/Admin onboarding remain outside this authorization. Dated decisions and outcome statements below describe the earlier gate state.

## Final owner amendments, 2026-11-05

The owner selected A2-1, I1-1, I2-2 and qualified I2-3 in the final Phase 2 closure assignment. These are approved requirement changes and a cost judgment, not passing executions of the historical requirements. The original wording, measurements and failures below remain historical evidence. The final 26-row acceptance ledger is in the completion report's **Final focused closure, 2026-11-05** section. Phase 2 is NOT ACCEPTED while mandatory results there remain failed or inconclusive.

- A2 permits the self-only, session-derived onboarding-state API/collection and the student password-completion write after a successful password change. All other authorization, branch, password, token-revocation and data-access boundaries remain mandatory. Progress must never grant or alter privileges. PASS requires current-source review and appropriate security regressions.
- I1 proportionality is owner-approved on the reported approximately 8.8 KB cumulative gzip increase, zero new runtime dependencies, demonstrated component reuse and documented maintenance touch points. Facts and estimates remain separate. This approves no dependency addition, redesign or production release.
- I2 Rule 2 requires p95 at most 100 ms for ordinary click-to-settled transitions under reduced motion, at least 20 ordinary measured advances in each of three independent runs. Use `summarizeTimingRun` from `221df1a`. Exclude only `dev-2 -> dev-3`, the artificial late mount, and `dev-6 -> dev-8`, the artificial missing-target budget/auto-skip. Keep complete raw measurements and excluded samples. Genuine route/data transitions remain included regardless of speed. B2/B3 separately retain their delayed-target requirements. The reported 81.5/98/81.7 ms fixture-free values had only 15 ordinary samples per run and cannot alone meet the retained minimum.
- I2 Rule 4b requires no continuing growth of retained tour-specific objects, no unexplained detached-DOM growth, DOM-node growth at most +50, listener growth at most +10, correct repeated mount/unmount cleanup and reproducible heap-snapshot attribution. Continue recording total heap drift and slope. The historical 150 KB end-drift and 25 KB/cycle limits remain diagnostic benchmarks, with their historical failures unchanged. Code-cache saturation supports an explanation of the measured growth; it is not a universal no-leak guarantee. Use the existing 10/30-cycle evidence only within its actual source and attribution limits.
- Rule 3 remains unchanged: no task over 50 ms attributable to tour handlers in the specified resize/scroll sequence. Linux's reported zero tasks and Windows's unresolved ownership observations remain separate. Linux evidence does not resolve a mandatory Windows check.
- A1/Rule 4a and I1 S5 retain the owner's previously approved student-production/runtime interpretations. Faculty/Admin onboarding, production databases, Atlas, deployment, PRs and merges to `main` remain outside this assignment.
- The repaired H1 unexpected-navigation focus behavior needs a new owner keyboard/screen-reader recheck. The prior manual category PASS predates `7da5ec0`; it cannot supply that new observation. Record the recheck as awaiting owner verification until supplied.

Cloud closure update, 2026-11-06 (A3 + I2 assignment): the ten named missing `.phase2-cloud` artifacts are replaced by committed, reproducible evidence at HEAD `3e40a2d` under `phase2-gate/cloud-2026-11-06/` (interaction matrix green plus the H1 red-first pair, corrected synthetic timing series, Rule 2 on the real student tour with p95 97.4/98.1/113.8 ms recorded FAIL and full attribution showing frame pacing plus the dashboard-to-academics route change and no tour-handler hotspot, Rule 3 zero window-level long tasks with the single traced task attributed to V8 GC, Rule 4b retainer-chain attribution of the generic Object/Array remainder, bundle comparison, quality gates). A3 records PASS on the replacement basis; Rule 4b retained-memory attribution is complete with no leak demonstrated; Rule 2's gate-box number and the Windows attribution decision remain the owner's and no threshold moved. See the completion report's 2026-11-06 section.

Final reconciliation, 2026-11-04 (cloud continuation): the 2026-11-04 completion-report section records the focus-loss repair behind a red-first regression, the completed target/toast evidence, a full green rerun of the scripted interaction matrix (B1-B4, C1-C5, D1-D4, E1, F1, G1, H1 strengthened, H2, portal regressions), Linux I2 measurements with Rule 4b attribution (saturating V8 code-cache accumulation, zero retained tour memory) and Rule 2/3 breakdowns, same-platform bundle deltas, and A2 verification. H1, B1-B4, C5, H2 and J3 now carry fresh scripted PASS evidence; A2, I1 and I2 remain owner decisions and no threshold moved. A1 passes under the approved amendment. The owner's manual categories remain separately recorded. Read the report's newest section rather than treating historical banners below as current results.

Current technical disposition, 2026-11-03: NOT READY. The owner instructed **Keep draft limits; memory remains unresolved** after corrected, valid cal1/cal2 measured 549/525 KB drift and 47.46667/42.30303 KB per cycle, with zero node/listener growth and successful isolation/cleanup. The draft 150 KB and 25 KB/cycle limits are unchanged. Fresh timing also misses the draft 100 ms limit; long-task attribution remains inconclusive. A1 now has committed-source student-production evidence under the explicit amendment below. The completion report records exact tested source identities and byte-equivalence checks separately from new builds. Historical banners and original criteria below remain dated records, not current results.

Owner-approved interpretations, received 2026-11-03 during final technical verification:

- **A1, I2 Rule 1 and Rule 4a:** the owner approved the student-production scope. The real student guided tours may compile and run in production. Development-only synthetic tours, fixtures, boards and testing controls must remain excluded. Actual production compilation, local synthetic-account login/navigation, committed application-source identity, producer/artifact integrity and complete process cleanup remain mandatory. This explicitly supersedes the historical prohibition on all onboarding bytes/modules and all tour UI below; that old criterion is retained as history and its old failed scans remain failed. The current exclusion check must distinguish permitted student engine markers from prohibited synthetic/testing markers. Targeted marker scans do not prove exhaustive absence of every related byte or module and must never be described that way. Existing legacy producer registrations and readers retain their original meaning.
- **I1 S5:** the owner approved the runtime interpretation. Retirement removes the synthetic host and board while preserving the shared student engine/API and an inert mount entry, with no change to student production behavior. This supersedes the literal no-production-source-file-edit wording below. It does not authorize removing shared authorization or persistence, altering student functionality, deployment, or a broader redesign.

Neither interpretation approves the Phase 2 outcome or locks/changes the provisional performance thresholds. Faculty and Admin onboarding remain out of scope.

Manual evidence update, 2026-11-03: the owner reports approving the updated student preview's visual design/experience and passing keyboard/focus, screen-reader announcements, targets/dropdowns/overlays, reduced motion, mobile accessibility and visual themes/readability. The manual checklist and completion report record those categories separately from automation, without invented execution metadata or detailed observations. This does not approve the technical gate, change A1/Rule 4a or lock the provisional performance thresholds. The original criteria below remain visible pending explicit scope reconciliation.

Owner scope update, 2026-11-02: the current assignment explicitly authorizes Phase 3 student onboarding on `main-full-dev` while Phase 2 remains NOT READY. This supersedes the historical Phase 3 stop below for development only. It does not approve Phase 2, change its requirements, authorize deployment or alter any producer fingerprint. A1's historical zero-engine production requirement cannot be applied unchanged to the new, intentionally production-compiled student tour. Keep the synthetic-tour exclusion check and the original A1 requirement distinct pending owner review. See the dated continuation in the completion report.

Completion evidence update, 2026-11-02: see `docs/onboarding-phase2-completion-report.md`. Recommendation remains NOT READY. The completion session repaired and verified the production import exclusion and custom-theme control contrast, but complete A1 runtime evidence, valid memory calibration, manual screen-reader review and reliable Windows browser-exit confirmation remain outstanding. No threshold or acceptance rule changes in this update.

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

**I2 Performance measurements against the provisional thresholds.** Requirement: record what is measurable: client bundle delta, step-advance timing, resize and scroll handler cost, and production-profile memory stability, each measured against the decided rules in section 9. Rules 2, 3, and 4b remain preliminary by my decision. Rule 4a restates A1 and is not provisional. For the preliminary thresholds, Phase 2 validates them, reports the evidence, and flags any that look unsuitable; recommended adjustments come to me rather than being applied silently. Verify: scripted timing runs recorded with the manifest. Evidence: `performance-notes.md`. Pass: measurements present, reproducible, honestly caveated, with each provisional threshold explicitly marked met, missed, or flagged unsuitable with a recommendation. Blocker: regression claims without numbers, or measurements that cannot be reproduced from the manifest.

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

Automation scripts for the authorized Phase 2 build: `scripts/onboarding/*.mjs`, with the actual Node or Bun executable and version recorded per run, following the `scripts/theme/lib.mjs` conventions including the manifest. Their tracking follows the existing test convention: dev-only unless a separate convention decision says otherwise.

## 9. Thresholds and decisions, decided by me on 2026-10-29

These were mine to set, and I set them at the final decision review. The evidence package measures against them exactly as written; the Phase 2 run validates the provisional parts and reports, and any change to them is my call, not the builder's:

1. Performance thresholds (option D, hybrid numerical and qualitative). Four rules, with Rule 4 split into two layers:
   - Rule 1: the production bundle delta is zero onboarding bytes and zero onboarding modules. This restates criterion A1 and is not provisional.
   - Rule 2: step-advance timing is p95 at or under 100 ms from keypress or click to spotlight settled, measured over at least 20 advances and 3 runs on the gate box and recorded in the manifest.
   - Rule 3: no long task over 50 ms attributable to tour handlers during the scripted resize and scroll series. The 50 ms boundary is the Long Tasks API's definition.
   - Rule 4a, not provisional: the standard production client bundle carries zero onboarding bytes and zero onboarding modules, and the live production portal carries no tour machinery. Cite matching A1 production-smoke manifest, chunk scan, and passing build/live-portal report for the current HEAD. Missing, failed, or stale evidence requires fresh verification and cannot be reported as PASS.
   - Rule 4b, preliminary until I review calibration: use a disposable probe worktree at the current HEAD. Confine the probe flag and mount patch to that worktree, retaining normal production minification. Build and serve with `next start` under `NODE_ENV=production`; `APP_ENV=development` opens the demo login only. This is a production-compiler-profile measurement environment over the local gate MongoDB. It is not a replica of the deployed application. Independently validate host `127.0.0.1`, port `27017`, and database `aics_portal` before database contact, including `ensureMongod()`, which probes or starts the local process but does not select a database. Never contact Atlas.
   - Rule 4b sampling: discard one verified warm-up cycle, require a two-GC stable baseline, recording both values and the existing 15 KB stability tolerance, then run ten full tours under reduced motion. Verify each step transition, including the absent-target step's deliberate auto-skip, and successful completion. Failed or incomplete tours never count. Every recorded sample requires a successful forced GC; no snapshot occurs between recorded samples. Record GC failures, unstable baselines, and snapshot-preparation failures, abort the affected run, and exclude invalid preparation from attribution evidence.
   - Rule 4b decisions and attribution: post-GC `JSHeapUsedSize` end-drift and regression slope over the ten values decide the memory rule. DOM-node and event-listener counts only escalate to a baseline-versus-final snapshot diff outside the measured series. Aggregate exact counts and shallow byte sums by V8 node type and name. Describe constructor aggregates only for object nodes; keep closures, strings, code, arrays, and other types separate. Depth-2 adjacent self-size sums are approximate and are not retained-size estimates. Verify onboarding-specific attributes, API paths, step identifiers, and tour text against source and the probe chunks. Use exact fingerprint matches on recorded strong retainer chains, ranked before retainer shallow size. Label individual sampled nodes named, inferred, or unknown. An inferred label requires its own recorded chain to a verified fingerprint; unrelated strings, substring proximity, and other objects in the same aggregate do not establish ownership. Capped or mixed samples do not attribute an aggregate's growth. A memory failure verdict stands on the heap series; attribution explains it and never substitutes for it. When a guard trip or explicit snapshot request requires attribution, a parser error leaves valid heap measurements and their independent threshold results intact but marks attribution evidence incomplete and blocks an overall clean gate pass. Reports must not claim attribution was produced on parser failure. Calibration remains measurement-only and explicitly reports incomplete evidence without emitting gate verdicts.
   - Rule 4b thresholds and isolation: draft end-drift 150 KB, slope 25 KB per cycle, Nodes at most baseline+50, and listeners at most baseline+10 are measured by cal1 and cal2. I decide locking, raising, lowering, extension, or deferral. Before creating a probe, capture complete `git worktree list --porcelain` records. Never prune existing worktrees. After cleanup, verify that every original record remains unchanged and only this run's probe was removed. Before and after the probe, record git status, SHA-256 of `OnboardingDevMount.tsx` and `next-env.d.ts`, and a path-and-size-only manifest of `我的项目/`. Never read or hash that export's contents. Failed removal, changed or unverifiable worktree records, or changed or unverifiable main-tree integrity is an isolation failure that stops the run, including calibration. Report it without automatic repair. Port inspection must fail closed. Before any probe HTTP or browser request, verify that the launched root is alive and the listener belongs to its owned process group; an unrelated server cannot satisfy readiness. This Windows gate uses kernel job ownership for server and browser descendants, including the normal gate's dev server. Never terminate unknown processes. Server/browser close errors, failed termination, a nonempty job, or unverifiable supervisor exit are isolation failures in both calibration and normal execution. The shared helpers that swallow termination errors or kill by PID file/port are not used by this measurement script. An inspection timeout permanently invalidates the control protocol: late replies are discarded and no later request may use them as ownership evidence. Cleanup remains available independently through control-channel closure, bounded supervisor-exit waits, and, if needed, termination using only this run's retained supervisor process handle. Stop-response and exit deadlines each allow the native stop routine's two waits of up to 10 seconds plus a margin. Record cleanup attempted, cleanup failed, supervisor termination confirmed, and job-empty confirmation separately. Failed or unverifiable finalization remains fatal; disposing control pipes does not establish successful cleanup.

   - Rule 4b reproducibility: write execution metadata before launching servers or browsers. Record the actual runtime executable/version, argument arrays, calibration mode/trial, snapshot request/directory, allowlisted non-secret settings, effective local MongoDB and serving settings, and SHA-256 plus path/size of the executing measurement script. Record the shared helper hash and Next runtime identity too. The measurement script may be uncommitted and must be identifiable independently of HEAD. Reject unsupported arguments and implicit runtime options rather than recording possible secrets. Never record credentials, cookies, AUTH_SECRET, or unrestricted environment dumps. Verify that the script hash is unchanged at run end. Windows process supervision and request-owner checks are part of this recorded procedure; no PID-file reuse or silent fallback is permitted.

   Rules 2, 3, and 4b remain preliminary. Rule 4a is not provisional. Phase 2 records the measurements and flags unsuitable thresholds for my review; no threshold changes automatically. Qualitative judgment governs perceptual quality, and the numbers govern what is objectively countable.
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
