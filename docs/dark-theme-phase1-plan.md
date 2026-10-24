# AICS Portal — Dark Theme Phase 1: Audit & Implementation Plan

**Date:** 2026-10-24 · **Branch audited:** `main-full-dev` @ `d999d67` (remote-verified)
**Scope:** Planning only — zero application code changed during this audit.
**Method:** Full repo inspection + an empirical Tailwind v4 compile probe (v4.3.3, the project's actual version) run with the project's own dependencies from scratch files outside the repo.

---

## 1. Architecture Audit (verified findings)

### 1.1 Theming stack

| Layer | File(s) | State |
|---|---|---|
| Tailwind CSS | `@tailwindcss/postcss` v4.3.3 (`package.json`) | CSS-first config. `src/app/globals.css` is the single real config (`@import "tailwindcss"` + `@theme inline` + `@custom-variant dark`). |
| **Vestigial config** | `tailwind.config.ts` | v3-style config (hsl() wrappers, `darkMode:"class"`). **Not loaded** — globals.css has no `@config` directive, so Tailwind v4 ignores it. Do not edit it; plan removes or documents it. |
| Dark variant | `globals.css:4` | `@custom-variant dark (&:is(.dark *))` — class strategy already wired. |
| `.dark` token block | `globals.css:106-138` | Exists (shadcn stock neutral greys) but **never applied** — nothing sets `.dark` on `<html>`. |
| Theme library | `next-themes@0.4.6` | **Already a dependency**, but used only by `src/components/ui/sonner.tsx` (`useTheme`). No `<ThemeProvider>` is mounted → it is currently inert. |
| Root layout | `src/app/layout.tsx` | `suppressHydrationWarning` already on `<html>`/`<body>` (required by next-themes). **But body hardcodes `bg-white text-slate-900`**, bypassing the semantic `bg-background text-foreground`. |
| Design system of record | `.superdesign/design-system.md` | Documents semantic roles mapped onto the slate scale: Canvas=slate-50, Surface=white, Line=slate-200, Ink=slate-900, Body=slate-700, Muted=slate-500, Faint=slate-400, Ghost=slate-300; brand=blue scale; status=green/amber/red/blue tints; login has its own scoped `T.*` tokens. |
| Additional refs | `docs/UI_UX_AUDIT_REPORT.md`, `docs/UI_UX_IMPLEMENTATION_TRACKER.md` | In-repo prior audits (a11y findings; light-mode WCAG contrast pass done 2026-10-15 via `scripts/wcag-contrast-audit.py`). No separate "Dark Mode UI Design Guidelines" file exists in the repo — the task's §3 principles + the in-repo design system are the governing references. |

### 1.2 The decisive mechanism — empirically VERIFIED

A compile probe (`/home/z/my-project/scripts/dark-probe/`, outside the repo) with the project's own Tailwind v4.3.3 confirms:

```css
.bg-slate-200 { background-color: var(--color-slate-200); }   /* default palette → var() */
.text-slate-900 { color: var(--color-slate-900); }
.bg-white { background-color: var(--color-white); }
```

All default-palette utilities compile to **runtime `var()` references**, and the `:root` theme vars live in `@layer theme`. An **unlayered** `.dark { … }` block on `<html>` therefore overrides them by cascade (the app's existing `.dark` block already relies on exactly this for `--background` etc.).

**Consequence:** the entire existing utility vocabulary (slate/blue/status scales) can be re-themed in dark mode from ONE place in `globals.css` without touching ~1,600 call sites.

Also verified in the probe:
- **Shadow utilities inline their values** (no `var(--shadow-*)` emission) → shadows are NOT runtime-remappable. Decision: in dark, elevation comes from surface-lightness steps (per the design guidelines); existing subtle shadows stay and become near-invisible on dark — acceptable and calm. No shadow work in Phase 1.
- **Latent bug found:** `@theme inline` defines `--color-muted` TWICE (globals.css:33 → `var(--muted)`, then :49 → `#64748B`). Last-wins: `bg-muted` currently compiles to literal slate-500, shadowing the shadcn `muted` token. (Harmless today — zero `bg-muted` usage outside `ui/` — but must be resolved during token consolidation.)

### 1.3 Current color usage census (grep-verified)

| Class family | Count | Role (per design-system.md) |
|---|---|---|
| `*-slate-*` (all shades) | **1,634** | Canvas/fills (50:203, 100:168), lines (200:296), faint (400:30), muted text (500:452), body (700:140), ink (900:192) |
| `bg-white` (+7 alpha) | **237** | Card/sidebar/topbar surfaces |
| `text-white` / `bg-black` | ~85 | Text on brand surfaces — must stay literal |
| `bg-blue-600/700/800` | 38 | Brand action backgrounds (white text) — keep unchanged |
| `text-blue-600/700/800/950` | 119 | Link/action text — needs lighter dark values |
| `border/ring-blue-500` | 98 | Focus rings — lighten in dark |
| `bg-blue-50/100`, `border-blue-200/300` | 69 | Info tints — darken in dark |
| Status tints (green/amber/red/emerald/violet/cyan/teal/orange) | ~510 | `bg-*-50` + `text-*-700` pills/badges — remap both directions |
| Hex literals | 163 in 27 files | Login `T.*` tokens (isolated in `login-tokens.ts`), EmptyState contrast-tuned treatments, error pages, ID-card/COE print surfaces, misc inline styles |
| Gradients / backdrop-blur | 4 / 5 | Negligible; blur surfaces in 4 files to review |
| Existing `dark:` variants | 5 | All inside shadcn `ui/` primitives (button, dropdown-menu) — inert until `.dark` is calibrated |

**Exception classes that a blanket palette remap would break (must migrate first):**
1. `bg-slate-900(/40|50)` scrims + `LegalShell` dark footer — **10 usages / 10 files** → migrate to a dedicated `--color-scrim` token (or literal) before the slate remap lands.
2. Light `text-slate-100..400` on colored hero chips — **32 usages / 2 files** (`EventsPageParts.tsx`, `AdminEnrollmentPage.tsx`) → migrate to `text-white`.
3. `bg-white` — cannot remap `--color-white` (would also flip `text-white` on brand surfaces) → mechanical rename to `bg-surface` (surface = #FFFFFF in light → dark surface in dark). Reviewable as a pure class rename.
4. ID card + COE print surfaces — literal hex + print CSS by construction; they stay light (a physical card / printed document). `StudentIdFront`, `StudentIdCard`, `DigitalIDCardLarge`, `COEDocument`, `COEModal` (screen preview of the printed doc — keep light by design, like paper).
5. `global-error.tsx` — self-contained inline styles (renders when the root layout itself fails; cannot rely on globals.css). Stays light; acceptable as a crash fallback.

### 1.4 Surfaces inventory

- **Auth:** `LoginView` (brand navy panel + `T.*`-token form panel — the navy panel with white text is brand-constant in both themes; the form panel, inputs, `FaceIdPanel`, `CredentialsForm`, post-login transitions theme via the `T` object becoming theme-aware), `route.ts` demo entry.
- **Shell (all roles):** `PortalShell` (canvas `bg-slate-50`), `Sidebar` (bg-white + `bg-blue-800` active + inline `#f1f5f9` hex in two spots), `Topbar` (bg-white, navy chip `#153357`, avatar `#1e293b` inline), `GlobalSearch`, `DevBanner` (intentionally loud — keep).
- **Student:** Dashboard (`TodayGlance`, `TodaysClasses`, `AnnouncementsWidget`), Academics (`AcademicsPage`, `GradesTable`, `GradesRow`, `ScheduleGrid` course-color keys, `RemarksBadge`), Events (`EventsPageParts`), Professors, Enrollment (COE modal/print), Tasks, Profile/`StudentProfile`, Settings (4 sections: profile/security/notifications/privacy).
- **Faculty:** Dashboard, My Students, Grade Encoding (dense table + modals), Previous Records, Announcements, Schedule, Tasks.
- **Admin:** Dashboard (stat cards), Release Queue, Events, Announcements, Professors, People (CSV export), Enrollment.
- **Shared primitives:** `Modal`/`DialogPanel` (custom + radix dialog), `SelectMenu` (5 consumers), `ui/dropdown-menu`, `ui/button`, `Skeleton` (light-only shimmer gradient — needs dark variant), `EmptyState` (hex, contrast-documented), `sonner` toasts (`richColors`; `useTheme` already wired — becomes theme-aware the moment a provider is mounted), legal pages (`LegalShell` + consent banner).
- **Theme selector home:** `SettingsPage` `Section` union + `SECONDARY_NAV` (settings/help) applies to **all three roles** → add an `appearance` section; plus a quick toggle in `Topbar` (exists on every authenticated surface). Login page gets a small toggle too (it is outside the shell).

### 1.5 Persistence conventions (existing, reuse)

- `localStorage` is the established client-side store: `aics_cookie_consent` (`src/lib/legal/site.ts`). No account schema changes needed — theme is a device preference, not a profile field. next-themes `storageKey="aics_theme"` follows the convention.

---

## 2. Proposed semantic token palette (OKLCH)

Layer 1 (new, semantic — the target vocabulary):

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` (canvas) | `oklch(0.984 0.003 247.86)` (=slate-50) | `oklch(0.185 0.012 255)` | Page canvas; dark is a restrained blue-tinted near-dark, never #000 |
| `--surface` | `oklch(1 0 0)` (=white) | `oklch(0.225 0.012 255)` | Cards, sidebar, topbar, dropdowns base |
| `--surface-2` | `oklch(0.968 0.007 247.9)` (=slate-100) | `oklch(0.27 0.014 255)` | Hover fills, raised input wells, table headers |
| `--line` | `oklch(0.929 0.013 255.5)` (=slate-200) | `oklch(0.32 0.014 255)` | Borders, dividers (solid, not white-alpha, to survive backdrop-blur) |
| `--ink` | `oklch(0.208 0.042 265.7)` (=slate-900) | `oklch(0.94 0.005 255)` | Headings — off-white in dark, never #fff |
| `--body` | `oklch(0.372 0.044 257.3)` (=slate-700) | `oklch(0.80 0.01 255)` | Body text |
| `--muted-fg` | `oklch(0.554 0.046 257.4)` (=slate-500) | `oklch(0.64 0.012 255)` | Captions — AA vs surface (≈4.6:1) |
| `--link` | `#1D4ED8` (blue-700) | `oklch(0.72 0.14 260)` | Link/action text — the ONE new utility class (`text-link`) |
| `--scrim` | `oklch(0.208 0.042 265.7 / 40%)` | `oklch(0 0 0 / 60%)` | Modal/drawer overlays |
| `--ring` (focus) | blue-500 | `oklch(0.70 0.15 260)` | ≥3:1 vs both canvases |

Brand & status (calibrated per theme; `--color-*-50/…` scale overrides below make existing classes follow):

| Role | Light | Dark |
|---|---|---|
| Brand action bg (`blue-600/700/800`) | unchanged | **unchanged** (white text keeps 6.3–8.6:1; preserves brand identity) |
| Brand tint bg (`blue-50/100`) | unchanged | `oklch(0.28 0.05 255)` / `oklch(0.32 0.06 255)` |
| Brand tint border (`blue-200/300`) | unchanged | `oklch(0.42 0.08 255)` |
| Focus/decor `blue-500` | unchanged | `oklch(0.70 0.15 260)` |
| Success | green-50/700/200 | bg `oklch(0.30 0.04 155)`, text `oklch(0.79 0.14 155)`, border `oklch(0.44 0.07 155)` |
| Warning | amber-50/700/200 | bg `oklch(0.32 0.05 75)`, text `oklch(0.83 0.14 80)`, border `oklch(0.46 0.08 80)` |
| Danger | red-50/700/200 | bg `oklch(0.30 0.06 25)`, text `oklch(0.70 0.19 25)`, border `oklch(0.46 0.12 25)` |
| Emerald (active/positive) | emerald-600/50 | dot `oklch(0.72 0.15 160)`, bg `oklch(0.30 0.05 160)` |
| Violet/Cyan/Teal/Orange (category keys) | unchanged | same formula: -50→tinted dark bg, -600/700 text→L≈0.75 |

Layer 2 (the migration bridge — palette-var overrides in `.dark`):

| Overridden var (dark) | Value | Auto-rethemes |
|---|---|---|
| `--color-slate-50` | `oklch(0.22 0.012 255)` | 203 canvas/fill sites |
| `--color-slate-100` | `oklch(0.26 0.012 255)` | 168 subtle fills |
| `--color-slate-200` | `oklch(0.32 0.014 255)` | 296 lines |
| `--color-slate-300` | `oklch(0.35 0.014 255)` | 11 |
| `--color-slate-400` | `oklch(0.52 0.012 255)` | 30 faint icons |
| `--color-slate-500` | `oklch(0.64 0.012 255)` | 452 muted text |
| `--color-slate-600` | `oklch(0.72 0.01 255)` | 104 |
| `--color-slate-700` | `oklch(0.80 0.01 255)` | 140 body |
| `--color-slate-800` | `oklch(0.88 0.008 255)` | 12 |
| `--color-slate-900` | `oklch(0.94 0.005 255)` | 192 ink (AFTER the 10 scrim sites migrate to `--color-scrim`) |
| `--color-blue-500` | `oklch(0.70 0.15 260)` | 98 rings/borders/dots |
| `--color-blue-50/100`, `--color-blue-200/300` | tints above | 69 info tint sites |
| `--color-{green,amber,red,emerald,violet,cyan,teal,orange}-{50,100,200,300,500,600,700}` | per status table | ~510 status sites |

NOT overridden: `--color-white`, `--color-black`, `--color-blue-600/700/800/900/950` (brand action surfaces), ID/COE print hex literals.

Login palette (scoped, in `login-tokens.ts` — becomes a function of resolved theme or CSS vars):
`T.bg` → `oklch(0.21 0.012 255)`, `T.border` → `oklch(0.32 0.014 255)`, `T.text` → `oklch(0.93 0.01 255)`, `T.muted` → `oklch(0.66 0.012 255)`, `T.primary`/`primaryDark` → `oklch(0.68 0.14 255)`/`oklch(0.74 0.13 255)` (hover INVERTS: lighter on dark), `T.accent` → `oklch(0.72 0.13 240)`. The navy brand panel + `PORTAL_TEXT_GRADIENT` stay as-is.

**Deliberate deviations from the guidelines, explained:** (1) solid dark line colors instead of white-alpha borders — the portal uses `backdrop-blur` on 4 faculty surfaces, and alpha borders over blur read inconsistently; solid tinted lines are deterministic. (2) Brand action backgrounds keep their deep light-theme blues in dark rather than brightening the whole blue scale — this preserves the portal's recognizable primary actions and avoids re-verifying 38 button/chip surfaces; only text/ring/tint shades re-calibrate. (3) `text-white` on brand chips stays pure white (it sits on unchanged brand surfaces, not on theme surfaces).

---

## 3. Theme preference & initialization strategy

**Library:** `next-themes@0.4.6` — already installed, already imported by sonner; zero new dependencies. Mounting it additionally fixes the currently-inert `useTheme()` in `ui/sonner.tsx`.

```tsx
// src/app/layout.tsx (conceptual)
<ThemeProvider attribute="class" defaultTheme="system" enableSystem
              storageKey="aics_theme" disableTransitionOnChange>
```

- **Three preferences:** light / dark / system — built into next-themes; system follows `prefers-color-scheme` and reacts to OS changes live.
- **Flash prevention:** next-themes injects a blocking pre-paint script into `<head>` that resolves the stored value (or media query) and sets `.dark` on `<html>` before first paint. `suppressHydrationWarning` is already in place on `<html>`/`<body>` (verified). No FOUC for explicit or system choices; SSR output stays theme-agnostic.
- **Persistence:** `localStorage["aics_theme"]` — matches the existing `aics_cookie_consent` convention. No cookies (avoids consent-gating the theme), no account schema change (theme is per-device, per the constraint). Session-level consistency across routes/refreshes is inherent (class on `<html>` + localStorage).
- **Selector UI:** `SettingsPage` gains an `appearance` section (radio: Light / Dark / System — available to all roles via `SECONDARY_NAV`); quick light/dark cycle button in `Topbar`; small toggle on the login page.
- **Body classes:** `bg-white text-slate-900` on `<body>` → `bg-background text-foreground` (line 58 of layout.tsx).
- **Not selected:** CSS `light-dark()` (too new for the browser matrix), cookies (consent complexity), server-side theme (needs auth coupling — unnecessary).

---

## 4. Shared components & page areas needing changes

**Tier A — infrastructure (small, high-leverage):**
- `src/app/globals.css` — the bulk of the work: recalibrated `.dark` block, palette-var overrides, `--color-scrim`, `--color-link`, fix the duplicate `--color-muted`, dark skeleton shimmer, `color-scheme: light dark` hints.
- `src/app/layout.tsx` — ThemeProvider mount, body classes.
- `src/components/portal/SettingsPage.tsx` — `appearance` section + `Section` union.
- `src/components/portal/Topbar.tsx` — quick theme toggle.
- `src/components/auth/login-tokens.ts` + `LoginView`/`CredentialsForm`/`FaceIdPanel` — theme-aware login palette; login toggle.
- `src/components/portal/Skeleton.tsx` (CSS in globals) — dark shimmer.

**Tier B — exception migrations (mechanical, grep-reviewable):**
- `bg-white` → `bg-surface`: 237 sites across ~55 files (pure class rename; light output byte-equivalent).
- `text-blue-600/700/800/950` → `text-link` (+hover): 119 sites.
- Scrim migrations (10 sites/10 files): `Modal`, `Sidebar`, `TasksTab`, `SettingsPage`, `LegalShell`, `FacultyStudentsPage`, `FacultyPreviousRecordsPage`, `FacultyGradeEncodingPage`, `AttendanceModal`, `FacultyAnnouncementsPage`.
- Light-on-chip text (32 sites/2 files): `EventsPageParts`, `AdminEnrollmentPage`.
- Inline hex in shared components: `Sidebar` (#f1f5f9×2), `Topbar` (#153357 keep / #1e293b avatar), `EmptyState`, `TasksTab`, `AcademicHeader`, `COEModal`/`COEDocument` (keep light), `CookieConsent`/`LegalShell` inline styles.

**Tier C — verify-only (auto-themed by the remap, needs visual QA):**
- All tables (`GradesTable`, `GradesRow`, faculty Grade Encoding, admin tables), `ScheduleGrid` course keys, `RemarksBadge`, `AnnouncementsDeck/Widget`, `TodayGlance`, `TodaysClasses`, `EventsPage(Parts)`, `ProfessorsPage`, `EnrollmentPage`, dashboards ×3, `DialogPanel`, `SelectMenu`, `ui/dropdown-menu`, `ui/button`, `ui/sonner` (auto-fixed by provider), `GlobalSearch`, `Modal`, `DevBanner` (intentionally loud — keep), `not-found.tsx`, `error.tsx`, legal pages, `StudentProfile`, `StudentDashboard`, all faculty/admin pages.

**Explicitly unchanged:** ID card components + `id-card-config.ts`, `COEDocument` print CSS, `global-error.tsx` (self-contained crash fallback), `DevBanner`, brand action backgrounds, `palette.ts` legacy exports (ID card only), auth/session/route code (no backend changes).

---

## 5. Accessibility & regression testing plan

**Contrast gates (WCAG 2.1 AA):**
1. Extend the existing `scripts/wcag-contrast-audit.py` methodology: add a dark-mode matrix asserting every text token ≥4.5:1 (body) / ≥3:1 (large text, icons-as-status) against BOTH surface and canvas; rings/lines ≥3:1 (non-text, 1.4.11).
2. Specific pairs to verify in dark: muted-fg on surface (target ≥4.6:1), warning amber text on amber tint (hardest pair — may need L 0.85), status pill text on tinted bgs (all ~510 sites share one formula → verify once per family), link on canvas, white on blue-800 (unchanged, 8.6:1 — re-assert).
3. Light mode: assert the palette overrides produce byte-identical rendered colors to today (regression guard — the light theme must not move).

**Functional regression:**
4. `bun test src/lib/authz/` (76) + `scripts/lib` (6) + lint + typecheck — theme work is CSS/class-level; these must stay green (guards against accidental logic edits).
5. Route matrix manual pass (light + dark × 3 roles): login → student (dashboard/academics/events/professors/enrollment/tasks/profile/settings) → faculty (dashboard/students/grade encoding/records/announcements/schedule/tasks) → admin (all 7). Verify: modals, dropdowns, toasts, skeletons, empty states, focus rings, skip-link, drawer + scrim, table sticky headers, COE print (must print light), ID card (light card on dark page).
6. `prefers-reduced-motion`: shimmer already respects it; theme transition uses `disableTransitionOnChange` (no cross-fade animation to gate).
7. System-preference live-switch test (change OS theme while app open), refresh-persistence test, multi-tab consistency.
8. Browser matrix: Chromium (Vercel preview), Firefox, Safari/iOS (OKLCH + cascade layers supported in all current versions; `color-mix` fallbacks not required since we use direct values).
9. Screenshot-diff pass of grade encoding + dashboard in both themes for visual calm review (no clipped text, no invisible borders).

---

## 6. Phased implementation plan (for approval)

Each phase = one focused commit on `main-full-dev`, lint+typecheck+tests green, independently revertible.

| Phase | Deliverable | Files (expected) | Risk |
|---|---|---|---|
| **0. Exception migrations** (prep, still light-only) | Scrims→`bg-scrim/…`, chip text→`text-white`, `bg-white`→`bg-surface`, link text→`text-link`, fix duplicate `--color-muted`, add Layer-1 tokens with LIGHT values only | ~60 files, mechanical renames; zero visual change in light (byte-equivalent CSS output) | Low — pure rename; grep-verifiable; screenshot-diff should show zero movement |
| **1. Theme engine** | ThemeProvider mount, body classes, `aics_theme` storage, `color-scheme`, dark skeleton, recalibrated `.dark` core tokens + palette-var overrides | `globals.css`, `layout.tsx`, `Skeleton.tsx` | Medium — the big visible switch; ships WITH the settings/topbar/login selectors so users can control it |
| **2. Selectors & login** | Settings `appearance` section, Topbar toggle, login toggle + `T.*` dark values | `SettingsPage`, `Topbar`, `login-tokens.ts`, auth components | Low-medium — isolated UI |
| **3. Polish & QA pass** | Inline-hex cleanups in shared components, `LegalShell` footer, blurred surfaces review, contrast audit run, route matrix, screenshot diffs | few files + audit script extension | Low |
| **4. Docs** | `.superdesign/design-system.md` gains the dark token tables; TODO.md entry | docs only | None |

**Risks & mitigations:**
- **R1 Blanket remap surprises** (a slate shade used against its role, e.g. new code landed mid-implementation): mitigated by the census table + Tier-C verify pass + screenshot diffs; any straggler is a one-line fix.
- **R2 `bg-white` rename churn** (237 sites): mechanical `sed`-style edit per file, reviewed as class-only diff; alternative (leaving bg-white white in dark) would leave glaring cards — rejected.
- **R3 Contrast edge cases** (amber-on-amber-tint): pre-verified pairs in Phase 1 commit; adjust token, not call sites.
- **R4 Hydration/flash regressions**: next-themes handles; `suppressHydrationWarning` already present; test hard on slow 3G throttle.
- **R5 Vestigial `tailwind.config.ts` confuses contributors**: add a header comment marking it unused (or delete — recommend delete in Phase 0).
- **R6 Environment resets destroying local work** (observed 4× this session): commit early per phase; worklog after each phase.

**Estimated effort:** Phase 0 ~half day (mostly mechanical), Phase 1 ~half day (token calibration + QA), Phase 2 ~2 hours, Phase 3 ~half day QA-driven, Phase 4 trivial.

---

## 7. Verified findings vs assumptions

**Verified (read from the repo or empirically compiled):** every count in §1.3; the var() emission of default-palette utilities (probe, v4.3.3); shadow inlining (probe); duplicate `--color-muted` behavior (probe); `next-themes` presence + sole consumer; layout body hardcoding; storage-key convention; `SECONDARY_NAV` covering all roles; Settings section structure; ID/COE print isolation; existing `.dark` block; `suppressHydrationWarning`; no chart library (stat cards only).

**Assumptions to validate during implementation (not yet verified):** exact dark OKLCH values are calibrated proposals pending the contrast script run (targets stated, pairs listed); next-themes v0.4.6 API surface (attribute/defaultTheme/enableSystem/storageKey/disableTransitionOnChange) matches its README as remembered; the 32 light-text-on-chip sites all sit on deep brand surfaces (spot-checked two files, not all 32 lines); no `@config` reference to `tailwind.config.ts` anywhere in the build (grep of css files — the PostCSS pipeline would need it explicitly).

**Recommendations:** approve Phase 0 first (zero-visual-change prep makes every later diff reviewable), then Phase 1+2 together as the user-visible switch.
