# UI/UX Implementation Tracker

Source of truth: `docs/UI_UX_AUDIT_REPORT.md` + epic #15 + child issues #16, #17, #18.
Branch: `ux/15-ui-ux-audit-redesign`. Updated: 2026-09-11.

## Audit summary

High priority:
- H1 (#16): Grade prelim/midterm/finals inputs have no accessible names; `mono` typo kills tabular numerals.
- H2 (#17): `MobileWarning` full-screen `z-[9999]` blocker under 768px; dismiss resets on nav; X mispositioned.
- H3 (no child issue yet): No skip link in `layout.tsx`/`PortalShell.tsx`; login fakes focus with JS `onFocus/onBlur` inline styles.
- H4 (no child issue yet): Fill/Submit modals are plain `fixed z-50` divs, no `role=dialog`, no Escape, no focus trap. History drawer already correct.

Medium priority:
- M1 (#18): `text-slate-400/300` (`#94A3B8`/`#CBD5E1`) for `text-xs` copy, disabled nav `#cbd5e1` on white (~1.7:1), `Soon` badge.
- M2: Grade table 7-9 cols, no sticky header/first col; `ScheduleGrid` already scrolls with `min-w-[720px]`.
- M3: Two remark-badge systems (`RemarksBadge` vs local `badgeForRemarks` + `dangerouslySetInnerHTML`).
- M4: Hover via JS inline styles (`Sidebar`, `CredentialsForm` Sign In).
- M5: Touch targets below 24px (History button, remember-me `w-4`, search clear X, Topbar bell).
- M6: Typography drift (3x H1 variants, scattered tracking, `tabular-nums` only on schedule).
- M7: `Toaster` `top-center` in `layout.tsx:55`, no Undo/View actions.
- M8: Inconsistent empty/error states (grade filter empty bare text, auth error no Retry).

Quick wins (report section 4):
1. `aria-label` + `font-mono tabular-nums` on grade inputs.
2. `ChevronRight rotate-180` back links to `ArrowLeft`.
3. Muted text floor to `slate-500`; fix disabled nav + `Soon` badge.
4. `Toaster` to `bottom-right`; View-queue action.
5. Wire `dark` toggle or delete Theme row.
6. Login rounding + warning card `relative` X fix.
7. Sticky grade `thead` under 64px topbar; row actions to 36px min.

Most affected files:
- `src/components/faculty/FacultyGradeEncodingPage.tsx`
- `src/components/MobileWarning.tsx`, `src/app/page.tsx` (4 mount points)
- `src/components/portal/PortalShell.tsx`, `src/app/layout.tsx`
- `src/components/auth/CredentialsForm.tsx`, `src/components/auth/LoginView.tsx`
- `src/components/portal/Sidebar.tsx`, `src/components/portal/Topbar.tsx`
- `src/components/portal/RemarksBadge.tsx`, `src/components/portal/AnnouncementsDeck.tsx`
- `src/components/admin/AdminReleasePage.tsx`, `src/components/portal/GlobalSearch.tsx`
- `src/components/portal/ScheduleGrid.tsx`, `.superdesign/design-system.md`

Acceptance gates (every fix): `npm run lint` clean in touched files, `npm run build` passes, keyboard-only pass (Tab/Shift+Tab/Enter/Escape), contrast AA 4.5:1 spot-check for text, screenshots student+faculty (+admin if touched), no secrets/`.env.local`/`.next/` in diff.

## Tracker table

| Status | GitHub Issue | Priority | Area | Summary | Affected Files | Notes |
|---|---|---|---|---|---|---|
| Done | #16 | High | a11y / grade encoding | Grade inputs have no accessible labels + `mono` typo | `src/components/faculty/FacultyGradeEncodingPage.tsx:394-404,416-419` | Fixed 2026-09-11: `aria-label` student+period on all 4 inputs, `font-mono tabular-nums`, `w-20 h-10`, `th w-[88px]`→`w-24`, disabled styles preserved. Lint clean in touched file (2 pre-existing errors elsewhere), `npm run build` passes. |
| Done | #17 | High | ux-blocker / mobile | Remove `MobileWarning` full-screen blocker, sticky table context | `src/components/MobileWarning.tsx` (deleted), `src/app/page.tsx:26,135-171`, grade table `FacultyGradeEncodingPage.tsx:394-415` | Fixed 2026-09-11: import + all 4 mount points removed, component deleted, no `z-[9999]` left in `src/`. Sticky `thead top-16` (solid bgs, corner `z-20`) + sticky first column (`z-0`, solid `bg-white`/`bg-amber-50` when dirty, `border-r` anchor). No banner added (drawer + scroll tables cover mobile). Lint clean in touched files (2 pre-existing errors elsewhere), `npm run build` passes. |
| Done | #18 | Medium | a11y / design-system | Contrast failures muted/disabled text | 16 files (Sidebar, Topbar, AnnouncementsDeck/Widget, LoginView, BranchRedirect, GlobalSearch, EnrollmentPage, EventsPageParts, ProfessorsPage, SettingsPage, TasksTab, AdminReleasePage, FacultyAnnouncements/GradeEncoding/PreviousRecords/Schedule/Students pages) + `.superdesign/design-system.md:33-34` | Fixed 2026-09-11: all small-size secondary text floored to `slate-500`; disabled nav `#cbd5e1`→`#64748b` on `slate-100`; Soon badges to `slate-500` on `slate-100` (4.76:1); placeholder to `slate-500`; LoginView `#9aa5b1`→`#64748B`; enrollment upcoming stepper circle/sublabel to `#64748b`; Faint/Ghost tokens redocumented as non-text. Decorative icons/spinners/connectors kept. Lint clean in touched files (2 pre-existing src errors + 16 in restored `.agents` skill scripts, all untouched), `npm run build` passes. |
| Done | #19 | High | a11y / keyboard | No skip link, JS-faked focus | `src/components/portal/PortalShell.tsx`, `src/components/auth/CredentialsForm.tsx` | Fixed 2026-09-11: skip link first tab stop in shell targeting `#main-content` wrapper (`tabindex=-1`; pages keep own `main` landmarks); `onFocus`/`onBlur` handlers deleted from both login inputs, replaced with `focus-visible` border `#1769AA` + 3px `#2F9ED8`/15 ring (same token look, keyboard-only). Lint clean in touched files (pre-existing errors elsewhere untouched), `npm run build` passes. |
| Not Started | #20 | High | a11y / modals | Fill/Submit modals lack dialog semantics + Escape | `src/components/faculty/FacultyGradeEncodingPage.tsx:434-512` | Created 2026-09-11. Extract shared `Modal` (`role=dialog`, Escape, focus trap/restore); History drawer (`:518`) is the reference pattern. |
| Not Started | #15 (M2) | Medium | tables | Sticky header + first column for grade table | `FacultyGradeEncodingPage.tsx:392-404`, `ScheduleGrid.tsx:203` | Overlaps #17 acceptance (sticky). Coordinate. |
| Not Started | #15 (M3) | Medium | design-system | Unify remark badges, drop `dangerouslySetInnerHTML` | `RemarksBadge.tsx:19-24`, `FacultyGradeEncodingPage.tsx:34-38,420` | Delete local fn, reuse component. |
| Not Started | #15 (M4) | Medium | design-system | JS hover to Tailwind hover | `Sidebar.tsx:71-81`, `CredentialsForm.tsx:194-199` | Pure Tailwind + transitions. |
| Not Started | #15 (M5) | Medium | a11y / touch | Touch targets below 24px | `FacultyGradeEncodingPage.tsx:423`, `CredentialsForm.tsx:164`, `GlobalSearch.tsx:411-420`, Topbar bell | Min `h-9 min-w-9`, checkbox `w-5 h-5`. |
| Not Started | #15 (M6) | Medium | typography | Lock H1 + `tabular-nums` | `AcademicHeader.tsx:34`, Grade Encoding + Admin H1, `ScheduleGrid.tsx:179` | `text-2xl font-bold tracking-tight text-slate-900`. |
| Not Started | #15 (M7) | Medium | feedback | Toast position + actions | `src/app/layout.tsx:55` | `bottom-right`, View queue / Undo. |
| Not Started | #15 (M8) | Medium | states | Standard empty/error patterns | `FacultyGradeEncodingPage.tsx:430`, `AnnouncementsDeck.tsx:155-179`, `AdminReleasePage.tsx:134-141`, `src/app/page.tsx:456-470` | Icon+title+why+action. |
| Not Started | #15 (L1-L5) | Low | polish | Login radius, forgot-pw toast, back icon, dot hack, icon sizes | `LoginView.tsx:115`, `CredentialsForm.tsx:178-185`, `FacultyGradeEncodingPage.tsx:337`, `AnnouncementsDeck.tsx:215` | Batch as one low-priority pass. |

## Current phase

Phase 2 — High-priority a11y: #19 (skip link) up next, then #20 (modals). All open child issues from the original audit except #19/#20 are done.

## Completed fixes

- #16 (2026-09-11): labeled grade inputs, `font-mono tabular-nums`, `h-10` sizing, `scope="col"` on period headers.
- #17 (2026-09-11): deleted `MobileWarning` blocker + usages, sticky grade `thead top-16` + sticky first column.
- #18 (2026-09-11): contrast floor to `slate-500` across 16 files + design-system token docs.

## Remaining high-priority

- #20 (modal dialog semantics) — last open high-priority issue (#16, #17, #19 done).

## Risks / blockers

- Manual browser verification (keyboard pass, 390x844 mobile check, screenshots) deferred by owner until all fixes land; issues closed on code + lint + build verification.
- No unit test runner (`npm test` does not exist). Verification = `npm run lint` + `npm run build` + deferred manual check.
- #17 + M2 overlap on sticky table work; implement sticky once to satisfy both.
- M2-M8/L1-L5 have no child issues yet; create issues before implementing or track under #15.

## Next recommended issue

#20 `[a11y] Fill/Submit modals lack dialog semantics and Escape handling` — high priority, last open audit child issue. M2-M8/L1-L5 still have no child issues.
