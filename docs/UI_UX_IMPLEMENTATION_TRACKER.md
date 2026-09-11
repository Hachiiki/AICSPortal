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
| Done | #20 | High | a11y / modals | Fill/Submit modals lack dialog semantics + Escape | New `src/components/portal/Modal.tsx` + `src/components/faculty/FacultyGradeEncodingPage.tsx` (Fill + Submit) | Fixed 2026-09-11: shared `Modal` with `role=dialog` + `aria-modal` + `aria-labelledby` title, Escape-to-close, initial focus (Fill input / Submit select), focus restore, Tab trap, backdrop-click preserved, stable `useCallback` closers. No visual change. History drawer untouched. Lint clean in touched files (pre-existing errors elsewhere untouched), `npm run build` passes. |
| Done | #22 | Medium | tables | Sticky header + first column for grade table | `FacultyGradeEncodingPage.tsx` (Final frozen right in `period=all`), `FacultyStudentsPage.tsx` + `AdminReleasePage.tsx` (sticky theads) | Fixed 2026-09-11: Final col `right-0` (`z-20` th / `z-0` solid `bg-blue-50` td) in `period=all`; roster (10 cols) + release queue (5 cols) sticky `thead top-16`. No first-col freeze on roster (assessed: header suffices). Lint clean in touched files, build passes. |
| Done | #24 | Medium | design-system | Unify remark badges, drop `dangerouslySetInnerHTML` | `RemarksBadge.tsx` (extended map), `FacultyGradeEncodingPage.tsx` (local fn deleted, shared component) | Fixed 2026-09-11: all 7 remarks mapped (canonical `rounded-md`); empty keeps `—` text; no `badgeForRemarks`/`dangerouslySetInnerHTML` in `src/`. Lint clean in touched files, build passes. |
| Done | #23 | Medium | design-system | JS hover to Tailwind hover | `Sidebar.tsx` NavButton, `CredentialsForm.tsx` Sign In, `FaceIdPanel.tsx` Face ID buttons | Fixed 2026-09-11: pure Tailwind hover/active (`hover:bg-slate-100`, `hover:bg-[#124D7A]`, `active:scale`), same colors; Face ID buttons had the same defect and were converted too. GlobalSearch combobox hover-index kept (behavior, not styling). Lint clean in touched files, build passes. |
| Done | #21 | Medium | a11y / touch | Touch targets below 24px | `FacultyGradeEncodingPage.tsx:423`, `CredentialsForm.tsx:160-177`, `GlobalSearch.tsx:411-421` | Fixed 2026-09-11: History `h-6 min-w-6` (24px) + `aria-label`; checkbox visual `w-5 h-5` with `py-1` label (28px hit area); clear-X `p-2 -m-1` (32px hit area). Bell verified 36px, untouched. Lint clean in touched files, build passes. |
| Done | #27 | Medium | typography | Lock H1 + `tabular-nums` | 16 page H1s + Stat values (AcademicHeader, FacultyDashboard) + release count | Fixed 2026-09-11: one H1 recipe (`font-bold tracking-tight text-balance text-slate-900`; heroes keep `blue-950` + `sm:text-3xl`); `tabular-nums` on Stat values + release count (mono cells already stable). Login gradient hero, COEDocument print heading, RoleGate message assessed as out of scope. Lint clean in touched files, build passes. |
| Done | #25 | Medium | feedback | Toast position + actions | `src/app/layout.tsx:55`, `AnnouncementsDeck.tsx` dismiss-all, new DELETE `announcements/read` | Fixed 2026-09-11: Toaster `bottom-right` (Sonner stretches bottom toasts near-full-width on mobile, effectively bottom-center); Dismiss-all fires a toast with working Undo (local restore + DELETE un-mark, POST-mirrored guards, branch-scoped). Submit toast deliberately actionless: no live faculty queue view exists (table reflects submitted status; previous-records covers prior released terms) — an action would be a dead end. Lint clean in touched files, build passes. |
| Done | #28 | Medium | states | Standard empty/error patterns | `FacultyGradeEncodingPage.tsx` empty, `src/app/page.tsx:445+` error, `use-student-data.ts` retryKey | Fixed 2026-09-11: filtered-empty gets icon + title + why + Clear-filters (resets search/status/dirty); data-load error gets Retry (real refetch via `useStudentData` retryKey, single consumer) + secondary sign-out. Lint clean in touched files, build passes. |
| Done | #26 | Low | polish | Login radius, forgot-pw toast, back icon, dot hack, icon sizes | `LoginView.tsx:115`, `CredentialsForm.tsx` forgot, 7 back links, `AnnouncementsDeck.tsx:215` | Fixed 2026-09-11: panel `rounded-t-[28px] lg:rounded-l-[40px]`; forgot-password is now a `mailto:it-support@aics.edu.ph` link (address confirmed in HelpSupportPage); all 7 rotated back chevrons → `ChevronLeft` (accordion rotations kept — correct usage); dot fallback branch deleted. L5 assessed: two-tier system already consistent (w-4 chrome / w-3 meta, default strokeWidth 2) — no library swap, no churn. Verified no `rotate-180`-as-back or `.replace('bg-'` remains. Lint clean in touched files, build passes. |

## Current phase

Phase 2 — High-priority a11y: #19 (skip link) up next, then #20 (modals). All open child issues from the original audit except #19/#20 are done.

## Completed fixes

- #16 (2026-09-11): labeled grade inputs, `font-mono tabular-nums`, `h-10` sizing, `scope="col"` on period headers.
- #17 (2026-09-11): deleted `MobileWarning` blocker + usages, sticky grade `thead top-16` + sticky first column.
- #18 (2026-09-11): contrast floor to `slate-500` across 16 files + design-system token docs.

## Remaining high-priority

- None. All high-priority audit items done (#16, #17, #19, #20).

## Risks / blockers

- Manual browser verification (keyboard pass, 390x844 mobile check, screenshots) deferred by owner until all fixes land; issues closed on code + lint + build verification.
- Browser smoke check (2026-09-11, dev server + headless Chromium, student demo session) verified live: skip link first Tab stop and activates to `#main-content`; login `focus-visible` border `#1769AA` + 3px ring; sidebar footer computes to `slate-500`; bottom-right error toast fires on failed login; DELETE un-mark API returns 200; login panel radius 28px top at 390px; L2 mailto href correct. Not verifiable without a faculty session: grade-encoding inputs/table, Fill/Submit modals, Undo toast click-through, announcement dismissal flow.
- No unit test runner (`npm test` does not exist). Verification = `npm run lint` + `npm run build` + deferred manual check.
- #17 + M2 overlap on sticky table work; implement sticky once to satisfy both.
- M2-M8/L1-L5 now have child issues (#21-#28, created 2026-09-11 with verified line refs; M5 corrected — Topbar bell already 36px and out of scope).

## Next recommended issue

None — every audit item (H1–H4, M1–M8, L1–L5) is implemented and its child issue closed (#16–#28, epic checklist fully ticked). Remaining: owner batch verification (browser pass + screenshots) and push.
