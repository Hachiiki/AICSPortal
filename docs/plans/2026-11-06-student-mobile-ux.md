# Student mobile UI implementation plan

**Goal:** Make the existing student portal clear and usable on phones, including everyday academic work and onboarding.

**Architecture:** Retain the single PortalShell, existing route and navigation configuration, institutional design tokens, and current authorization/data contracts. Improve responsive components in place. Keep shared desktop and faculty behavior working.

**Tech stack:** Next.js 16, React 19, TypeScript, Tailwind 4, Framer Motion, existing dialog utilities and Playwright.

## Scope and sequence

1. Capture baseline student screens at 320, 360, 390 and 430 CSS pixels. Use two independent council reviewers for visual hierarchy and usability/accessibility. Present their evidence-based dimension scores in tables. Reviewers do not coordinate scores.
2. Improve the shared chrome in `src/components/portal/Topbar.tsx`, `GlobalSearch.tsx`, `Sidebar.tsx` and `PortalShell.tsx`: usable mobile search, appropriately sized touch targets, viewport-safe menus and a reliable drawer focus contract.
3. Improve the student dashboard in `StudentDashboard.tsx`, `AcademicHeader.tsx`, `TodayGlance.tsx`, `ScheduleGrid.tsx` and grade components: bring classes and pending work forward, simplify mobile density, wrap schedule controls, and preserve full subject identity.
4. Improve `AcademicsPage.tsx` and `TasksTab.tsx`: accessible discoverable academic tabs, wrapping filters, readable task counts and cards, useful filtered-empty/retry states, and scrollable task dialogs with reachable actions.
5. Check the other existing student pages for reflow and touch issues. Fix concrete problems found in enrollment, events, professors, profile, settings and Help without expanding faculty/admin features.
6. Complete mobile onboarding review in `src/components/onboarding/StudentOnboarding.tsx` and `TourOverlay.tsx`: welcome, checklist, replay, target orientation, focus and short viewport behavior. Reuse existing persistence contracts.
7. Capture revised screenshots, ask the same two council reviewers to independently reassess, and address substantive findings. Report honest remaining limitations.

## Verification

- Use a local isolated preview with synthetic student data for UI and simulated onboarding writes. Do not change `.env.local`, production data or user-owned exports. Record which checks use fixtures.
- Exercise all student views at 320/360/390/430px and desktop. Check page-level horizontal overflow, input sizing, long labels, content and short viewport heights.
- Verify drawer Tab/Shift+Tab/Escape/focus restoration; search keyboard selection and task handoff; academics tab state; task filter reset, error recovery and dialog actions; welcome/tour/checklist/replay.
- Run existing relevant onboarding regressions, meaningful mobile browser assertions, lint, typecheck and the production build. Verify shared faculty/desktop chrome.
- Preserve unrelated local changes. Commit and push only this plan, intended UI changes, relevant verification scripts/evidence and authorized tracking updates. Keep this PR aimed at `main-full-dev`; merging and production release need a separate request.
- Publish a Markdown comment for every implementation commit with exact parent/commit screenshots, numbered change explanations and actual validation. Capture historical app inputs in an isolated temporary export so comparisons do not disturb the checkout.

## Skills

Use project-orchestrator, graphify, redesign-existing-projects, webdesign-ui, coding-agent, writing-plans, Agent Browser and unslop. Apply the repository's existing branch/source layout rather than creating a separate artifact site.

## Progress

- [x] Read project instructions and check baseline branch/local changes.
- [x] Start two independent council reviews.
- [x] Capture runtime baseline and implement fixes.
- [x] Complete browser and quality checks, then council reassessment.
- [x] Commit and push the implementation through the feature PR.

Final application source is `a3e1f33`. Acceptance-r10 passed 314 browser checks with no failures or client errors, and 154 relevant unit tests passed. Lint, typecheck and the production webpack build passed. Both independent council reviewers consider the examined version ready for PR review. The exact commit comparisons, honest score tables and remaining coverage limits are recorded in `docs/done/qa_evidence/ui-ux/mobile-2026-11-06/README.md`; GitHub Conversation comments carry the per-commit before/after explanations.

## Mobile composition pass, 2026-11-07

The owner authorizes a distinct mobile composition, preserving the content and functions, and adds mobile sign-in to scope. Continue on the existing feature branch and PR #95, now draft again. The same two council reviewers compare navigation approaches without a numerical target in their instructions.

The selected direction is a compact student phone header with a labeled Search trigger, notifications and account, plus Home, Tasks, Academics, Events and More at the bottom. More retains the existing complete drawer and phone theme action. Search uses the current role-filtered index in a bounded modal. Tasks and Academics have distinct URL-driven selected states. Staff and desktop chrome retain their existing composition. Reserve the bar's safe-area space in content and the nonmodal guide; verify keyboard, focus, nested overlays and route history.

Sign-in uses a compact normal-flow identity and form on phones. Campus imagery and existing welcome content follow the form. Preserve disclosure, help, legal links, theme, remember behavior, password managers, production demo gates and post-login transitions. Improve touch targets, remember/help wrapping and persistent announced errors without changing authentication endpoints or payloads.

- [x] Reopen the existing PR as draft and obtain independent design recommendations.
- [x] Record reviewable mobile designs and exact current-source baseline screenshots.
- [x] Implement phone navigation/search and sign-in composition in separate commits, pushing each immediately.
- [x] Run source-matched viewport, keyboard, error/retry, route, overlay and sign-in checks plus required quality gates.
- [x] Obtain both independent council reassessments and prepare the commit-specific comparisons and score tables.

The reviewed app source is `b7cbc33`. All 413 portal checks, 47 sign-in checks, 45 content clearance checks and 154 relevant unit tests passed. Lint, typecheck and the production build passed. Both council reviewers considered the source ready for PR review. [Verification and before/after evidence](../done/qa_evidence/ui-ux/mobile-composition-2026-11-07/README.md) accompanies the commit-by-commit [GitHub discussion](https://github.com/Hachiiki/AICSPortal/pull/95).

## Owner feedback follow-up

Keep the phone header on one line. The final Search control is an icon-only floating button at the lower-right corner above the separate five-destination bar. Give press and selection states short motion with reduced-motion support. More opens the navigation drawer with an X close control at the same thumb position. The student phone bell opens a scrollable Notifications page using the existing inbox and task links. The sign-in welcome and campus photo move above the form in a compact layout that avoids overlapping text.

Check 320px and common phone widths, a short viewport, dark mode, keyboard focus and dismissal, browser Back, notification read actions, task links and the desktop/staff fallback. Post exact before-and-after captures and change notes for the implementation commits on PR #95.

The final phone follow-up is implemented in `871e28d`. All 547 browser checks passed, and both council reviewers consider it ready for PR review. [Follow-up evidence and scores](../done/qa_evidence/ui-ux/mobile-owner-feedback-2026-11-07/README.md)
