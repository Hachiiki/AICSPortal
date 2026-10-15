# AICS Portal — UI/UX Audit Report

**Date:** 2026-09-11
**Scope:** Student / Faculty / Admin portal (`src/components/portal/`, `src/components/faculty/`, `src/components/admin/`, `src/components/auth/`, `src/app/`, `globals.css`, `.superdesign/design-system.md`)
**Method:** Code inspection of live repo (no attached screenshots were provided in-chat, so findings cite `file:line`). Skills applied: `ui-ux-pro-max`, `redesign-existing-projects`, `web-design-guidelines`.
**Stack:** Next.js 16 App Router + React 19 + Tailwind CSS 4 + shadcn/ui New York + Lucide + Framer Motion + Sonner.

---

## 1. Executive Summary

The portal has the correct institutional direction: restrained, professional, trustworthy. The shell architecture is strong — one `PortalShell` (`src/components/portal/PortalShell.tsx`), one nav config (`src/lib/aics/nav-config.ts`), role-aware global search, and some of the best skeleton loading coverage in a project this size (`src/components/portal/Skeleton.tsx`).

The debt is consistency and accessibility, not visual taste:

1. **Two design languages.** Login uses private tokens `T.*` (`#17324D / #1769AA`) while the portal uses slate + `blue-800 #1E40AF` + hardcoded `#153357` / `#287CBB`. Three navys and two primary blues coexist.
2. **Accessibility gaps that block sign-off.** Grade-encoding inputs have no labels, muted/disabled text fails contrast, there is no skip link, and the Fill/Submit modals have no dialog semantics or Escape handling.
3. **Mobile is blocked instead of responsive.** `MobileWarning` renders a `z-[9999]` full-screen blocker under 768px even though the shell already has a drawer, scrollable schedule, and wrapping toolbars.
4. **Generic card-everywhere + table density.** Every section is `bg-white rounded-xl border shadow-sm` with no elevation hierarchy. The Grade Encoding table (7–9 columns, 72px inputs) has no sticky header or first column.

No data-loss or auth issues were found in this pass. All findings below are UI/UX and frontend a11y.

---

## 2. Issue Catalog

### 2.1 High priority

#### H1 — Grade inputs have no accessible labels
- **What:** `src/components/faculty/FacultyGradeEncodingPage.tsx:416-419` renders bare `<input>` elements for Prelim / Midterm / Finals with only a column `<th>` as context. Screen readers announce "edit text" with no student or period. Class typo `mono` instead of `font-mono` means tabular numerals never apply.
- **Why it matters:** Fails WCAG 1.3.1 Info and Relationships and 3.3.2 Labels or Instructions. Faculty cannot encode grades efficiently with assistive technology. This blocks an accessibility sign-off on the highest-traffic faculty workflow.
- **How to improve:** Add `aria-label={`${row.studentName} prelim`}` (and midterm/finals) to each input. Fix class to `font-mono tabular-nums`. Grow inputs to `w-20 h-10`, keep `disabled` for submitted/released with visible `cursor-not-allowed`.

#### H2 — MobileWarning blocks the product
- **What:** `src/components/MobileWarning.tsx:31` renders `fixed inset-0 z-[9999] bg-slate-900/95` for viewports under 768px. The dismiss state resets on navigation. The corner X is `absolute` inside a card with no `relative` parent, so it positions to the viewport.
- **Why it matters:** Ships a responsive drawer, scrollable schedule (`min-w-[720px]`), and wrapping toolbars, then forbids their use. `z-9999` violates the documented scale in `PortalShell.tsx:32-42`. Mobile faculty cannot check rosters or release queues.
- **How to improve:** Delete the blocker. Keep tables usable via horizontal scroll with sticky first column and sticky `thead`. If a nudge is needed, use a dismissible banner persisted to `localStorage`, never a full-screen overlay.

#### H3 — No skip link, incomplete focus system
- **What:** No `Skip to content` link in `src/app/layout.tsx` or `PortalShell.tsx:59-98`. Login inputs fake focus with JS `onFocus/onBlur` inline styles (`src/components/auth/CredentialsForm.tsx:105-112`) instead of `:focus-visible`.
- **Why it matters:** Keyboard users tab through the entire sidebar and topbar on every page with no bypass. JS-driven focus breaks forced-colors and keyboard-only detection.
- **How to improve:** Add `<a href="#main">` in the shell and `id="main"` on `<main>`. Replace JS focus with `focus-visible:ring-2 ring-blue-500 border-blue-600`.

#### H4 — Modals lack dialog semantics and Escape handling
- **What:** Fill-down and Submit modals (`FacultyGradeEncodingPage.tsx:434-512`) are plain `fixed z-50` divs with no `role="dialog"`, no `aria-modal`, no Escape-to-close, no focus trap. The History drawer (`:518`) already does this correctly.
- **Why it matters:** Keyboard and screen-reader users get stranded behind the backdrop with no announced title or exit.
- **How to improve:** Extract a shared `Modal` with `role=dialog aria-modal aria-labelledby`, Escape to close, initial focus on the input, focus restore on close. Reuse for Fill, Submit, and future confirms.

### 2.2 Medium priority

#### M1 — Contrast failures on muted and disabled text
- **What:** `text-slate-400 #94A3B8` and `text-slate-300 #CBD5E1` used for captions, disabled nav (`src/components/portal/Sidebar.tsx:43-54`, `#cbd5e1` on white ~1.7:1), and the `Soon` badge (`bg-slate-100 text-slate-400`).
- **Why it matters:** Fails WCAG AA 4.5:1 for `text-xs / text-[11px]` body copy. Disabled items are unreadable rather than merely dimmed.
- **How to improve:** Floor secondary text at `text-slate-500 #64748B`. Disabled items minimum `text-slate-500` on `bg-slate-100`. Never use `slate-300/400` for text.

#### M2 — Tables lose context on scroll
- **What:** Grade Encoding renders 7–9 columns with `w-56` student cells and `w-[88px]` grade cells, no sticky header or first column. `ScheduleGrid.tsx:203` already scrolls correctly with `min-w-[720px]`.
- **Why it matters:** Past ~30 rows, faculty cannot see student names while editing right-side columns. Horizontal scroll without anchors causes mis-entry.
- **How to improve:** `thead th { position: sticky; top: 64px }`, first column sticky left with solid `bg-white`, freeze the computed Final column when `period=all`.

#### M3 — Two remark-badge systems
- **What:** `src/components/portal/RemarksBadge.tsx:19-24` (`green/slate/amber`, `rounded-md`) vs local `badgeForRemarks()` in `FacultyGradeEncodingPage.tsx:34-38` (`violet/blue/cyan/emerald/amber/red`, `rounded-full`, rendered via `dangerouslySetInnerHTML` at `:420`).
- **Why it matters:** The same remark renders in two colors and two shapes. HTML-string badges bypass React escaping and cannot be unit-tested.
- **How to improve:** Delete the local function, reuse `<RemarksBadge>` everywhere, lock one shape (`rounded-md`).

#### M4 — Hover implemented with JS inline styles
- **What:** `Sidebar.tsx:71-81` (`onMouseEnter` sets `style.background`), login Sign In (`CredentialsForm.tsx:194-199`) same pattern.
- **Why it matters:** No CSS transition runs, touch devices get no hover, forced-colors mode breaks. Adds render-time handlers for what Tailwind does statically.
- **How to improve:** Pure Tailwind `hover:bg-slate-100 hover:text-slate-900`, active state via `data-[active]`. Add `active:scale-[0.98] transition` for press feedback.

#### M5 — Touch targets below 24px minimum
- **What:** History button `text-[10px] px-1.5 py-0.5` (`FacultyGradeEncodingPage.tsx:423`), remember-me box `w-4 h-4` (`CredentialsForm.tsx:164`), search clear `X` with no padding (`GlobalSearch.tsx:411-420`), Topbar bell `p-2`.
- **Why it matters:** Fails WCAG 2.5.8 target size. Dense grade tables become mis-tap prone.
- **How to improve:** Icon buttons minimum `h-9 min-w-9`. Checkbox `w-5 h-5` with padded label hit area.

#### M6 — Typography scale drift
- **What:** H1 varies: `text-2xl sm:text-3xl font-extrabold text-blue-950` (`AcademicHeader.tsx:34`) vs `text-2xl font-extrabold text-slate-900` (Grade Encoding, Admin). Tracking variants `0.12em / 0.15em / wider` scattered. `tabular-nums` only on the schedule week range (`ScheduleGrid.tsx:179`).
- **Why it matters:** No single H1 voice. Grades and stats set in proportional figures jitter on edit.
- **How to improve:** Lock H1 to `text-2xl font-bold tracking-tight text-slate-900` (hero welcome may keep `blue-950` on dashboards only). Add `text-wrap:balance` to H1, `tabular-nums` to every grade/stat/mono cell.

#### M7 — Toast position and missing actions
- **What:** `<Toaster richColors position="top-center" />` (`src/app/layout.tsx:55`) covers search and topbar on small screens. Save/submit/release and announcement dismissal offer no Undo or View action.
- **Why it matters:** Success evidence disappears with the toast. Top-center obscures the element the user just acted on.
- **How to improve:** Move to `bottom-right` on desktop (`bottom-center` on mobile). Add actions: Submit -> View queue, Dismiss -> Undo.

#### M8 — Empty and error states are inconsistent
- **What:** Loading is excellent (mirrored skeletons). Empty is mixed: announcements caught-up (`AnnouncementsDeck.tsx:155-179`) and admin waiting (`AdminReleasePage.tsx:134-141`) are good, but filtered-grades empty (`FacultyGradeEncodingPage.tsx:430`) is bare text with no Clear-filters action. Auth error (`src/app/page.tsx:456-470`) is red text plus Back-to-login with no Retry.
- **Why it matters:** Edge cases feel unfinished and trap users with no next step.
- **How to improve:** Standard empty pattern (icon + title + one-line why + primary action) and error pattern (Retry + secondary Sign out) everywhere.

### 2.3 Low priority

#### L1 — Login panel radius applies on mobile
- **What:** `LoginView.tsx:115` uses `rounded-l-[40px] lg:-ml-12` on all breakpoints. The 60/40 split stacks to a 42vh hero on mobile, so the panel shows an odd top rounding.
- **Fix:** `rounded-t-[28px] lg:rounded-t-none lg:rounded-l-[40px]`.

#### L2 — Forgot password is a dead-end toast
- **What:** `CredentialsForm.tsx:178-185` fires `toast.info('Contact the AICS IT Office...')`.
- **Fix:** Link to a real support page or prefilled `mailto:` instead of a toast.

#### L3 — Back link uses a rotated icon
- **What:** `ChevronRight rotate-180` used as Back (`FacultyGradeEncodingPage.tsx:337`, design-system 7.13).
- **Fix:** Use `ArrowLeft` or `ChevronLeft` with no rotation for correct semantics and optical centering.

#### L4 — Announcement dot render hack
- **What:** `AnnouncementsDeck.tsx:215` does `style.dot.replace('bg-','#')`, which never yields a valid hex and always falls back.
- **Fix:** Render `<span className={`w-2 h-2 rounded-full ${style.dot}`} />` and delete the fallback branch.

#### L5 — Iconography is Lucide-only
- **What:** Every icon across nav, tables, and states is Lucide at mixed sizes.
- **Fix:** Acceptable for an SIS. Lock sizes (`16 / 20 / 32`) and `strokeWidth={2}` rather than swapping libraries.

---

## 3. Strategic Action Plan

### Redesign
- Grade Encoding toolbar and table density: section pills to a `Select`, period tabs to a segmented control, sticky header plus sticky student column, `h-10` labeled inputs.
- Login-to-portal token bridge: collapse `#17324D / #153357 / #1E3A8A / #1E40AF / #287CBB / #1769AA` to one navy plus one action blue in `globals.css`; delete inline `style={{background:}}`.
- Promote Fill / Submit / History overlays into one shared accessible `Modal` + `Drawer` pair.

### Add
- Skip-to-content link, labeled grade inputs, Escape handling, focus trap and restore.
- Clear-filters empty state, Retry error state, Undo / View-queue toast actions.
- `max-w-[1440px] mx-auto` content cap for ultra-wide, sticky table headers, `aria-live` verification for Sonner announcements.

### Remove
- `MobileWarning` full-screen blocker (`src/components/MobileWarning.tsx`).
- JS hover handlers (`Sidebar.tsx:71-81`, `CredentialsForm.tsx:194-199`).
- Local `badgeForRemarks` plus `dangerouslySetInnerHTML` (`FacultyGradeEncodingPage.tsx:34-38,420`).
- Dead Theme menu item that only toasts (`Topbar.tsx:57-59`) — either wire the existing `dark` variant in `globals.css:106-138` or delete it. Same for `Soon` nav items that go nowhere.

### Keep
- `PortalShell` z-scale and `lg:pl-60` shell, centralized `nav-config.ts`, role-aware `GlobalSearch` with `Ctrl+K`.
- Mirrored shimmer skeletons over spinners (extend the pattern to `AdminReleasePage`, which still uses `Loader2`).
- Swipeable `AnnouncementsDeck` with reduced-motion respect and the per-period draft -> submitted -> released grade flow with audit notes.

---

## 4. Quick Wins (1–2 hours each)

1. Fix `mono` to `font-mono tabular-nums` and add `aria-label` to grade inputs (`FacultyGradeEncodingPage.tsx:416-419`).
2. Swap every `ChevronRight rotate-180` back link for `ArrowLeft`.
3. Raise muted text to `slate-500` minimum; fix disabled nav and `Soon` badge contrast.
4. Move `Toaster` to `bottom-right`; add View-queue action to release toast.
5. Wire the `dark` class toggle or delete the Theme row in the account menu.
6. Fix login rounding and make the warning card `relative` so its X positions correctly.
7. Make grade `thead` sticky under the 64px topbar; raise row action buttons to 36px minimum.

---

## 5. Acceptance Gates for Implementation PRs

- [ ] `npm run lint` passes with no new warnings in touched files.
- [ ] `npm run build` passes.
- [ ] Keyboard-only pass on login, dashboard, grade encoding, release queue (Tab / Shift+Tab / Enter / Escape).
- [ ] Contrast spot-check on body secondary, disabled, badge, and placeholder text (AA 4.5:1 for small text).
- [ ] Screenshots for student + faculty (+ admin if touched) attached to the PR.
- [ ] No secrets in diff, no `.env.local` / `.next/` committed.
