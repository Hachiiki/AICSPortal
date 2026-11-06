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

## Skills

Use project-orchestrator, graphify, redesign-existing-projects, webdesign-ui, coding-agent, writing-plans, Agent Browser and unslop. Apply the repository's existing branch/source layout rather than creating a separate artifact site.

## Progress

- [x] Read project instructions and check baseline branch/local changes.
- [x] Start two independent council reviews.
- [ ] Capture runtime baseline and implement fixes.
- [ ] Complete browser and quality checks, then council reassessment.
- [ ] Commit, push and update the PR for review.
