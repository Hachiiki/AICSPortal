# AICS Portal — Dark Theme Phase 1: Audit & Implementation Plan

**Date:** 2026-10-24 · **Branch audited:** `main-full-dev` @ `d999d67` (remote-verified)
**Scope:** Planning only — zero application code changed during this audit.
**Method:** Full repo inspection + an empirical Tailwind v4 compile probe (v4.3.3, the project's actual version) run with the project's own dependencies from scratch files outside the repo.
**Rev 2 (2026-10-24, owner review — final):** incorporates the owner's two review points — (1) verified light-output preservation for the Phase 0 migrations with objective, computed-value gates, and (2) phase boundaries redrawn so the first push that can render dark also ships user-facing theme controls — **plus the owner's three final clarifications:** (a) **Phase 1 explicitly includes the complete, usable theme-switching experience** — ThemeProvider, Settings appearance selector (Light/Dark/System), Topbar toggle, and login-page toggle; Phase 1 is not complete and must not be pushed until all four controls work, and Phase 2 contains only non-blocking polish/QA (the Rev 1 table's separate "Selectors & login" phase is eliminated; canonical phase table in §6); (b) **G1–G4 are enforceable acceptance gates** — each with a pinned baseline commit, exact command, expected result, and retained evidence, under a stop-on-failure rule (§5.1); (c) **this revision is plan-only** — zero application code changed, nothing committed/pushed/merged/deployed without owner authorization. Census numbers re-verified; two Rev 1 errors corrected (§1.3). Architecture, scope, and testing strategy otherwise unchanged.

**Rev 2.1 (2026-10-26, owner-authorized documentation amendment, issue #91):** the Phase-1 G4 light-parity criterion was originally written as "still zero diffs," which cannot hold literally once Phase 1 ships visible controls on matrix routes. The §5.1 Phase-1 re-run paragraph and the §6 Phase-1 exit-gate wording now describe the two-stage G4 interpretation the committed harness already enforces: a strict zero-pixel engine-only parity stage, then a final controls stage where only explicitly allow-listed routes may differ, with those diffs attributed to the new controls, and every other failure condition still failing the gate. Scope, architecture, and acceptance bar are unchanged; the harness was already built this way (commits `474b9bc`, `7a2f16e`). Plan-only revision: zero application code, zero harness code changed.

---

## 1. Architecture Audit (verified findings)

### 1.1 Theming stack

| Layer | File(s) | State |
|---|---|---|
| Tailwind CSS | `@tailwindcss/postcss` v4.3.3 (`package.json`) | CSS-first config. `src/app/globals.css` is the single real config (`@import "tailwindcss"` + `@theme inline` + `@custom-variant dark`) — re-verified: it is the only CSS file in `src/`, `postcss.config.mjs` loads only `@tailwindcss/postcss`, and no `@config` directive exists anywhere in the repo. |
| **Vestigial config** | `tailwind.config.ts` | v3-style config (hsl() wrappers, `darkMode:"class"`). **Not loaded** (no `@config`; re-verified). Do not edit it; Phase 0 deletes it. |
| Dark variant | `globals.css:4` | `@custom-variant dark (&:is(.dark *))` — class strategy already wired. |
| `.dark` token block | `globals.css:106-138` | Exists (shadcn stock neutral greys) but **never applied** — nothing sets `.dark` on `<html>`. |
| Theme library | `next-themes@0.4.6` | **Already a dependency**, but used only by `src/components/ui/sonner.tsx` (`useTheme`). No `<ThemeProvider>` is mounted → it is currently inert. **API verified from `node_modules/next-themes/dist/index.d.ts`:** `attribute="class"`, `defaultTheme`, `enableSystem`, `storageKey`, `disableTransitionOnChange`, `enableColorScheme` all exist on `ThemeProviderProps`; `useTheme()` returns `{ theme, resolvedTheme, systemTheme, setTheme, … }`. |
| Root layout | `src/app/layout.tsx` | `suppressHydrationWarning` already on `<html>`/`<body>` (required by next-themes). **But body hardcodes `bg-white text-slate-900`** (className spanning lines 57–59), shadowing the `@apply bg-background text-foreground` that `@layer base` (globals.css:144–146) already applies to `body`. Removing the hardcoded classes restores the semantic rule with **identical light output** (light `--background` = oklch(1 0 0) = white). |
| Design system of record | `.superdesign/design-system.md` | Documents semantic roles mapped onto the slate scale: Canvas=slate-50, Surface=white, Line=slate-200, Ink=slate-900, Body=slate-700, Muted=slate-500, Faint=slate-400, Ghost=slate-300; brand=blue scale; status=green/amber/red/blue tints; login has its own scoped `T.*` tokens. |
| Additional refs | `docs/UI_UX_AUDIT_REPORT.md`, `docs/UI_UX_IMPLEMENTATION_TRACKER.md` | In-repo prior audits (a11y findings; light-mode WCAG contrast pass done 2026-10-15 via `scripts/wcag-contrast-audit.py`). No separate "Dark Mode UI Design Guidelines" file exists in the repo — the task's §3 principles + the in-repo design system are the governing references. |

### 1.2 The decisive mechanism — empirically VERIFIED

A compile probe (`/home/z/my-project/scripts/dark-probe/`, outside the repo) with the project's own Tailwind v4.3.3 confirms:

```css
.bg-slate-200 { background-color: var(--color-slate-200); }   /* default palette → var() */
.text-slate-900 { color: var(--color-slate-900); }
.bg-white { background-color: var(--color-white); }
```

All default-palette utilities compile to **runtime `var()` references**, and the `:root` theme vars live in `@layer theme`. An **unlayered** `.dark { … }` block on `<html>` therefore overrides them by cascade (the app's existing `.dark` block already relies on exactly this for `--background` etc.). The same probe verified the var-chain form for the NEW Phase-0 tokens: `@theme inline { --color-surface: var(--surface) }` emits `.bg-surface { background-color: var(--surface) }` and `.dark\:bg-surface:is(.dark *) { background-color: var(--surface) }` — i.e. the new tokens are dark-overridable through the exact mechanism the shadcn tokens already use.

**Consequence:** the entire existing utility vocabulary (slate/blue/status scales) can be re-themed in dark mode from ONE place in `globals.css` without touching ~1,600 call sites.

Also verified in the probe (Rev 2 additions):
- **Opacity modifiers emit `color-mix()`:** `bg-slate-900/40` → `color-mix(in oklab, var(--color-slate-900) 40%, transparent)` inside `@supports (color: color-mix(in lab, red, red))`, with a static `color-mix(in srgb, …)` fallback. The same structure is emitted for var-chain tokens (`bg-scrim/40` → `color-mix(in oklab, var(--scrim) 40%, transparent)`). In every browser the app already supports (its existing CSS already requires `color-mix` — e.g. `outline-foreground/70` in `@layer base`, `ring-ring/50`, `dark:bg-input/30` in `ui/button`), old and new classes resolve identically. **Migrations must keep the `/α` modifier on the new class** (never bake alpha into the token) — this is codified in §2.5.
- **Shadow utilities inline their values** (no `var(--shadow-*)` emission) → shadows are NOT runtime-remappable. Decision: in dark, elevation comes from surface-lightness steps (per the design guidelines); existing subtle shadows stay and become near-invisible on dark — acceptable and calm. No shadow work in Phase 1.
- **Latent bug found & fully investigated (Rev 2):** `@theme inline` defines `--color-muted` TWICE (globals.css:33 → `var(--muted)`, then :49 → `#64748B`). Last-wins **bakes the literal `#64748B` into any `*-muted` utility** (probe-verified: current-state sheet emits `.bg-muted { background-color: #64748B }`; fixed sheet emits `var(--muted)`), which both mis-values it as slate-500 and makes it un-overridable in `.dark`. **Usage census (PCRE, whole `src/`): ZERO `bg-muted` / `text-muted` / `border-muted` / `ring-muted` call sites exist anywhere** — the only "muted" CSS usages are 4× `text-muted-foreground` (a separately-defined, un-duplicated token) in `ui/dropdown-menu` + `ui/dialog`; every other "muted" hit is the login `T.muted` object, a `<video muted>` attribute, or comments. Since Tailwind v4 generates utilities on demand, the duplicate **never enters the emitted stylesheet today**. **Therefore correcting it changes NO rendered output** — the owner's conditional ("if correcting changes light output, isolate it") resolves to *it does not*. It is still fixed in Phase 0 (by deleting the dead block that contains it, see next bullet) and still gated by G1.
- **Dead code found (Rev 2):** the "Profile page design tokens" block (globals.css:43–63: `--color-canvas/surface/line/ink/body/muted/brand-*/navy/success-*/danger-*`, all **inline literals**) has **zero consumers** — a PCRE census finds no `bg-canvas`/`bg-surface`/`text-ink`/`bg-brand-*`/etc. utility anywhere in `src/`, and no direct `var(--color-*)`/`var(--muted)` references in components. As inline literals these tokens are also dark-unoverridable. Phase 0 **deletes this block**: it resolves the `--color-muted` duplicate (line :49 dies with the block, restoring the single `--color-muted: var(--muted)` from :33) AND prevents a second last-wins collision — the block's literal `--color-surface: #FFFFFF` (line :45) would otherwise shadow the new var-chain `--color-surface` token. Light `--muted` keeps its shadcn value `oklch(0.97 0 0)`; the `.dark` `--muted: oklch(0.269 0 0)` becomes live in Phase 1 for any future shadcn-style component.

### 1.3 Current color usage census (re-verified Rev 2; PCRE over `src/`)

| Class family | Count | Role (per design-system.md) |
|---|---|---|
| `*-slate-*` (all shades, utility positions) | **1,643** | Canvas/fills (50/100), lines (200), faint (400), muted text (500), body (700), ink (900) |
| `bg-white` | **230** = 219 plain + 7 alpha (`/95`, `/85`, `/80`×2, `/50`×2 hover, `/20`) + 2 `hover:bg-white` + 1 `focus:bg-white` + 1 `file:bg-white` | Card/sidebar/topbar surfaces |
| `text-white` / `bg-black` | ~85 | Text on brand surfaces — must stay literal |
| `bg-blue-600/700/800` | **39** (12/15/12) | Brand action backgrounds (white text) — keep unchanged |
| `text-blue-*` (all shades+variants) | **127** = blue-700 ×85 (74 static + 10 hover + 1 focus), blue-600 ×36, blue-950 ×2, blue-900 ×1, blue-800 ×1 (hover), blue-500 ×1, blue-200 ×1 | Link/action text |
| `border/ring-blue-500` | ~78 | Focus rings — lighten in dark (palette bridge) |
| `bg-blue-50/100`, `border-blue-200/300` | ~69 | Info tints — darken in dark (palette bridge) |
| `from/to-blue-600/800` (gradients) | 4 (2 avatar rings) | Brand decoration — unchanged in dark |
| `accent-blue-700` | 2 | Form-control accent — verify-only in dark |
| Status tints (green/amber/red/emerald/violet/cyan/teal/orange, utility positions) | **399** | `bg-*-50` + `text-*-700` pills/badges — remap both directions |
| Hex literals | **184 in 30 files** | Login `T.*` tokens (isolated in `login-tokens.ts`), EmptyState contrast-tuned treatments, error pages, ID-card/COE print surfaces, misc inline styles |
| Gradients / backdrop-blur | 4 / 5 | Negligible; blur surfaces in 4 files to review |
| Existing `dark:` variants | **8**, all in `ui/button.tsx` + `ui/dropdown-menu.tsx` — and all on **shadcn semantic tokens** (`destructive`, `input`, `accent`, `ring`), NOT the slate palette | Inert until `.dark` lands; then **auto-correct** once Phase 1 calibrates the semantic `.dark` values (no recalibration of these sites needed — they never reference the inverted slate scale) |

**Rev 1 corrections (owner-review investigation):**
1. Rev 1 claimed "light `text-slate-100..400` on colored hero chips — 32 usages / 2 files". **Wrong.** The verified census finds only TWO `text-slate-300` chevron icons (EventsPageParts:369, AdminEnrollmentPage:133) — both on **light** surfaces (faint-icon role, palette-bridge handles them; not exceptions). The only genuine light-on-chip cases are `text-blue-200` ×1 (AdminPeoplePage:321 — count badge on the active `bg-[#153357]` navy tab) and `bg-white/20` ×1 (FacultyGradeEncodingPage:530 — chip on the same navy) → both stay **literal** (navy never changes).
2. Rev 1 claimed a "LegalShell dark footer". **Wrong.** LegalShell's footer is light; the only solid `bg-slate-900` in it is the **skip-link focus state** (LegalShell:28, `focus:bg-slate-900 focus:text-white`).

**Exception classes that a blanket palette remap would break (migrate in Phase 0):**
1. `bg-slate-900/40` ×5 and `/50` ×5 (10 sites / 9 files: `Modal`, `Sidebar`, `TasksTab`×2, `SettingsPage`, `LegalShell`… see §2.5) → `bg-scrim/40|50` — **modifier preserved**.
2. `focus:bg-slate-900` solid ×1 (LegalShell skip-link) → `focus:bg-scrim` — resolves to the identical light value; in dark the scrim token goes near-black so `focus:text-white` stays correct.
3. `text-blue-200` ×1 + `bg-white/20` ×1 (navy chips, above) → stay literal.
4. `bg-white` — 230 sites migrate to `bg-surface` (§2.5) **except two**: `StudentIdCard:40` `bg-white/80` (ID-card print surface — stays light by design) and `FacultyGradeEncodingPage:530` `bg-white/20` (navy chip). `--color-white` itself is never remapped (`text-white` on brand surfaces stays white).
5. ID card + COE print surfaces — literal hex + print CSS by construction; they stay light (a physical card / printed document). `StudentIdFront`, `StudentIdCard`, `DigitalIDCardLarge`, `COEDocument`, `COEModal` (screen preview of the printed doc — keep light by design, like paper).
6. `global-error.tsx` — self-contained inline styles (renders when the root layout itself fails; cannot rely on globals.css). Stays light; acceptable as a crash fallback.

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

Layer 1 (semantic — the target vocabulary; var-chain form, see §2.5):

| Token | Light | Dark | Notes |
|---|---|---|---|
| `--background` (canvas) | `oklch(0.984 0.003 247.86)` (=slate-50) | `oklch(0.185 0.012 255)` | Page canvas; dark is a restrained blue-tinted near-dark, never #000 |
| `--surface` | `#FFFFFF` | `oklch(0.225 0.012 255)` | Cards, sidebar, topbar, dropdowns base — replaces `bg-white` (§2.5) |
| `--surface-2` | `oklch(0.968 0.007 247.9)` (=slate-100) | `oklch(0.27 0.014 255)` | Hover fills, raised input wells, table headers |
| `--line` | `oklch(0.929 0.013 255.5)` (=slate-200) | `oklch(0.32 0.014 255)` | Borders, dividers (solid, not white-alpha, to survive backdrop-blur) |
| `--ink` | `oklch(0.208 0.042 265.7)` (=slate-900) | `oklch(0.94 0.005 255)` | Headings — off-white in dark, never #fff |
| `--body` | `oklch(0.372 0.044 257.3)` (=slate-700) | `oklch(0.80 0.01 255)` | Body text |
| `--muted-fg` | `oklch(0.554 0.046 257.4)` (=slate-500) | `oklch(0.64 0.012 255)` | Captions — AA vs surface (≈4.6:1) |
| `--link` | `oklch(54.6% 0.245 262.881)` (≡ v4 blue-600) | `oklch(0.72 0.14 260)` | Rest link text (`text-blue-600` successor) |
| `--link-strong` | `oklch(48.8% 0.243 264.376)` (≡ v4 blue-700) | `oklch(0.75 0.13 260)` | Static `text-blue-700` successor + hover target for `--link` |
| `--link-deep` | `oklch(42.4% 0.199 265.638)` (≡ v4 blue-800) | `oklch(0.78 0.12 260)` | `hover:text-blue-800` successor |
| `--scrim` (solid, no alpha) | `oklch(20.8% 0.042 265.755)` (≡ v4 slate-900) | `oklch(0 0 0)` | Overlay base — sites keep their own `/40` `/50` modifiers |
| `--ring` (focus) | blue-500 | `oklch(0.70 0.15 260)` | ≥3:1 vs both canvases |

Why a link family instead of Rev 1's single `--link = blue-700`: the 122 migrating occurrences span blue-600 (36), blue-700 (85), blue-800-hover (1) — a single token would silently re-shade every 600/800 site in **light** mode. Four exact-value tokens keep light byte-stable (§2.5). `text-blue-900` ×1 and `text-blue-950` ×2 need **no migration** — census confirms they are text-only usages, so the Layer-2 palette overrides below re-theme them with zero call-site changes.

Brand & status (calibrated per theme; `--color-*-50/…` scale overrides below make existing classes follow):

| Role | Light | Dark |
|---|---|---|
| Brand action bg (`blue-600/700/800`, 39 sites) | unchanged | **unchanged** (white text keeps 6.3–8.6:1; preserves brand identity) |
| Brand tint bg (`blue-50/100`) | unchanged | `oklch(0.28 0.05 255)` / `oklch(0.32 0.06 255)` |
| Brand tint border (`blue-200/300`) | unchanged | `oklch(0.42 0.08 255)` |
| Focus/decor `blue-500` (rings ~78 + status dots ×2) | unchanged | `oklch(0.70 0.15 260)` |
| Success | green-50/700/200 | bg `oklch(0.30 0.04 155)`, text `oklch(0.79 0.14 155)`, border `oklch(0.44 0.07 155)` |
| Warning | amber-50/700/200 | bg `oklch(0.32 0.05 75)`, text `oklch(0.83 0.14 80)`, border `oklch(0.46 0.08 80)` |
| Danger | red-50/700/200 | bg `oklch(0.30 0.06 25)`, text `oklch(0.70 0.19 25)`, border `oklch(0.46 0.12 25)` |
| Emerald (active/positive) | emerald-600/50 | dot `oklch(0.72 0.15 160)`, bg `oklch(0.30 0.05 160)` |
| Violet/Cyan/Teal/Orange (category keys) | unchanged | same formula: -50→tinted dark bg, -600/700 text→L≈0.75 |

Layer 2 (the migration bridge — palette-var overrides in `.dark`):

| Overridden var (dark) | Value | Auto-rethemes |
|---|---|---|
| `--color-slate-50` | `oklch(0.22 0.012 255)` | canvas/fill sites |
| `--color-slate-100` | `oklch(0.26 0.012 255)` | subtle fills |
| `--color-slate-200` | `oklch(0.32 0.014 255)` | lines |
| `--color-slate-300` | `oklch(0.42 0.014 255)` | faint chevrons/icons (bumped from 0.35 for visibility on dark canvas) |
| `--color-slate-400` | `oklch(0.52 0.012 255)` | faint icons |
| `--color-slate-500` | `oklch(0.64 0.012 255)` | muted text |
| `--color-slate-600` | `oklch(0.72 0.01 255)` | secondary text |
| `--color-slate-700` | `oklch(0.80 0.01 255)` | body |
| `--color-slate-800` | `oklch(0.88 0.008 255)` | 12 sites |
| `--color-slate-900` | `oklch(0.94 0.005 255)` | ink (AFTER the 10 scrim sites + skip-link migrate to `bg-scrim` in Phase 0) |
| `--color-blue-500` | `oklch(0.70 0.15 260)` | rings/borders/dots |
| `--color-blue-900`, `--color-blue-950` | `oklch(0.80 0.10 260)` / `oklch(0.86 0.07 260)` | the 3 text-only sites (verified: no bg/border consumers) |
| `--color-blue-50/100`, `--color-blue-200/300` | tints above | 69 info tint sites |
| `--color-{green,amber,red,emerald,violet,cyan,teal,orange}-{50,100,200,300,500,600,700}` | per status table | 399 status sites |

NOT overridden: `--color-white`, `--color-black`, `--color-blue-600/700/800` (brand action surfaces + avatar gradients — deep blues preserved), ID/COE print hex literals, the two navy-chip literals.

Login palette (scoped, in `login-tokens.ts` — becomes a function of resolved theme or CSS vars):
`T.bg` → `oklch(0.21 0.012 255)`, `T.border` → `oklch(0.32 0.014 255)`, `T.text` → `oklch(0.93 0.01 255)`, `T.muted` → `oklch(0.66 0.012 255)`, `T.primary`/`primaryDark` → `oklch(0.68 0.14 255)`/`oklch(0.74 0.13 255)` (hover INVERTS: lighter on dark), `T.accent` → `oklch(0.72 0.13 240)`. The navy brand panel + `PORTAL_TEXT_GRADIENT` stay as-is.

**Deliberate deviations from the guidelines, explained:** (1) solid dark line colors instead of white-alpha borders — the portal uses `backdrop-blur` on 4 faculty surfaces, and alpha borders over blur read inconsistently; solid tinted lines are deterministic. (2) Brand action backgrounds keep their deep light-theme blues in dark rather than brightening the whole blue scale — this preserves the portal's recognizable primary actions and avoids re-verifying 39 button/chip surfaces; only text/ring/tint shades re-calibrate. (3) `text-white` on brand chips stays pure white (it sits on unchanged brand surfaces, not on theme surfaces).

### 2.5 Phase 0 light-preservation contract (Rev 2 — the core of the owner's Point 1)

**Rule:** every Phase-0 mapping must resolve to the **identical computed value in light mode** — including opacity modifiers and hover/focus/file variant prefixes. Alpha is expressed by keeping the `/α` modifier on the new class (never baked into the token), so both sides emit the same `color-mix(in oklab, … α%, transparent)` form.

| Today (sites) | After Phase 0 | Light value (identical, probe-verified) |
|---|---|---|
| `bg-white` (219) | `bg-surface` | `--surface: #FFFFFF` ≡ `--color-white: #fff` |
| `bg-white/95` (1), `/85` (1), `/80` (2), `/20`… see exceptions | `bg-surface/95` etc. | `color-mix(in oklab, #ffffff α%, transparent)` ≡ same with `#fff` |
| `hover:bg-white` (2), `hover:bg-white/50` (2) | `hover:bg-surface(/50)` | same mechanism under `@media (hover: hover)` |
| `focus:bg-white` (1 — PortalShell skip-link) | `focus:bg-surface` | ≡ |
| `file:bg-white` (1 — FacultyStudentsPage) | `file:bg-surface` | `::file-selector-button` ≡ |
| `text-blue-600` (36) | `text-link` | `--link: oklch(54.6% 0.245 262.881)` ≡ v4 `--color-blue-600` |
| `text-blue-700` (85: 74 static + 10 hover + 1 focus) | `text-link-strong` / `hover:` / `focus:` forms | `--link-strong: oklch(48.8% 0.243 264.376)` ≡ v4 `--color-blue-700` |
| `hover:text-blue-800` (1) | `hover:text-link-deep` | `--link-deep: oklch(42.4% 0.199 265.638)` ≡ v4 `--color-blue-800` |
| `bg-slate-900/40` (5: FacultyStudentsPage×2, FacultyPreviousRecordsPage, FacultyGradeEncodingPage, Sidebar) | `bg-scrim/40` | `--scrim: oklch(20.8% 0.042 265.755)` ≡ v4 `--color-slate-900`; modifier preserved |
| `bg-slate-900/50` (5: AttendanceModal, Modal, TasksTab×2, SettingsPage avatar overlay) | `bg-scrim/50` | ≡ |
| `focus:bg-slate-900` (1 — LegalShell skip-link + `focus:text-white`) | `focus:bg-scrim` | same resolved value; dark: near-black scrim keeps white text correct |

**Exceptions that stay literal (no token):** `text-blue-200` ×1 and `bg-white/20` ×1 on the navy `bg-[#153357]` chips (navy is brand-constant); `bg-white/80` ×1 in `StudentIdCard` (print surface); all ID/COE print hex; `global-error.tsx`; login `T.*` (Phase 1). The two `text-slate-300` chevrons are **not** exceptions (they sit on light surfaces; the palette bridge re-themes them, with slate-300's dark value chosen for visibility).

**Browser-support note (probe-verified):** for var-chain tokens with `/α`, Tailwind emits `var(--token)` as the fallback line and the `color-mix` declaration inside `@supports`; for static palette colors it emits a static `color-mix(in srgb, …)` fallback. The fallback *lines* differ in form, but the app's existing stylesheet already depends on the `@supports (color: color-mix(…))` branch (`outline-foreground/70`, `ring-ring/50`, `dark:bg-input/30`), so the supported-browser floor is unchanged and both branches resolve identically there. G2/G4 verify this in real browsers.

**Muted disposition (owner's Point 1):** the duplicate `--color-muted` is removed by deleting the dead token block; light `--muted` retains `oklch(0.97 0 0)`. Because the census proves **zero** `*-muted` call sites, this changes no rendered output — no isolation or compatibility shim is needed. (Had any existed, the plan would have kept a compat value in Phase 0 and isolated the correction; the investigation rendered that moot. The grep census + G1 + the build diff are the objective evidence.)

---

## 3. Theme preference & initialization strategy

**Library:** `next-themes@0.4.6` — already installed, already imported by sonner; zero new dependencies. API surface **verified from the package's own type definitions** (§1.1).

```tsx
// src/app/layout.tsx (conceptual)
<ThemeProvider attribute="class" defaultTheme="system" enableSystem
              storageKey="aics_theme" disableTransitionOnChange>
```

- **Three preferences:** light / dark / system — built into next-themes; system follows `prefers-color-scheme` and reacts to OS changes live.
- **Flash prevention:** next-themes injects a blocking pre-paint script into `<head>` that resolves the stored value (or media query) and sets `.dark` on `<html>` before first paint. `suppressHydrationWarning` is already in place on `<html>`/`<body>` (verified). No FOUC for explicit or system choices; SSR output stays theme-agnostic.
- **Persistence:** `localStorage["aics_theme"]` — matches the existing `aics_cookie_consent` convention. No cookies (avoids consent-gating the theme), no account schema change (theme is per-device, per the constraint). Session-level consistency across routes/refreshes is inherent (class on `<html>` + localStorage).
- **Selector UI:** `SettingsPage` gains an `appearance` section (radio: Light / Dark / System — available to all roles via `SECONDARY_NAV`); quick light/dark cycle button in `Topbar`; small toggle on the login page. **These are Phase 1 exit criteria, not a later phase:** they ship in the SAME push as the theme engine, and Phase 1 is not complete until they work (§6, owner's final clarification).
- **Body classes:** `bg-white text-slate-900` on `<body>` → removed; the existing `@layer base` `bg-background text-foreground` takes over with identical light output.
- **Not selected:** CSS `light-dark()` (too new for the browser matrix), cookies (consent complexity), server-side theme (needs auth coupling — unnecessary).

---

## 4. Shared components & page areas needing changes

**Tier A — infrastructure (small, high-leverage):**
- `src/app/globals.css` — the bulk of the work: delete the dead "Profile page design tokens" block (resolves the `--color-muted` duplicate), add the §2.5 var-chain tokens with light values, recalibrated `.dark` block + palette-var overrides (Phase 1), dark skeleton shimmer, `color-scheme` hints.
- `src/app/layout.tsx` — ThemeProvider mount, body classes (Phase 1).
- `src/components/portal/SettingsPage.tsx` — `appearance` section + `Section` union (Phase 1).
- `src/components/portal/Topbar.tsx` — quick theme toggle (Phase 1).
- `src/components/auth/login-tokens.ts` + `LoginView`/`CredentialsForm`/`FaceIdPanel` — theme-aware login palette; login toggle (Phase 1).
- `src/components/portal/Skeleton.tsx` (CSS in globals) — dark shimmer (Phase 1).
- Delete `tailwind.config.ts` (vestigial, unloaded — Phase 0 housekeeping).

**Tier B — exception migrations (mechanical, grep-reviewable — Phase 0):**
- `bg-white` → `bg-surface`: 228 of 230 sites across ~55 files (2 literal exceptions, §2.5), preserving every `/α` and `hover:`/`focus:`/`file:` prefix.
- Link family: 122 occurrences across ~40 files → `text-link` / `text-link-strong` / `hover:text-link-strong` / `hover:text-link-deep` / `focus:text-link-strong`.
- Scrim migrations (11 sites / 10 files): `Modal`, `Sidebar`, `TasksTab`×2, `SettingsPage`, `LegalShell` (skip-link), `FacultyStudentsPage`×2, `FacultyPreviousRecordsPage`, `FacultyGradeEncodingPage`, `AttendanceModal`.
- No chip-text migrations needed (Rev 1's 32-site estimate was a miscount — the 2 genuine cases stay literal).

**Tier C — verify-only (auto-themed by the remap, needs visual QA):**
- All tables (`GradesTable`, `GradesRow`, faculty Grade Encoding, admin tables), `ScheduleGrid` course keys, `RemarksBadge`, `AnnouncementsDeck/Widget`, `TodayGlance`, `TodaysClasses`, `EventsPage(Parts)`, `ProfessorsPage`, `EnrollmentPage`, dashboards ×3, `DialogPanel`, `SelectMenu`, `ui/dropdown-menu`, `ui/button`, `ui/sonner` (auto-fixed by provider), `GlobalSearch`, `Modal`, `DevBanner` (intentionally loud — keep), `not-found.tsx`, `error.tsx`, legal pages, `StudentProfile`, `StudentDashboard`, all faculty/admin pages, the 8 stock `dark:` variants in `ui/` (semantic tokens → correct once `.dark` is calibrated).

**Explicitly unchanged:** ID card components + `id-card-config.ts`, `COEDocument` print CSS, `global-error.tsx` (self-contained crash fallback), `DevBanner`, brand action backgrounds + avatar gradients, `palette.ts` legacy exports (ID card only), auth/session/route code (no backend changes), the two navy-chip literals.

---

## 5. Accessibility & regression testing plan

**Contrast gates (WCAG 2.1 AA):**
1. Extend the existing `scripts/wcag-contrast-audit.py` methodology: add a dark-mode matrix asserting every text token ≥4.5:1 (body) / ≥3:1 (large text, icons-as-status) against BOTH surface and canvas; rings/lines ≥3:1 (non-text, 1.4.11).
2. Specific pairs to verify in dark: muted-fg on surface (target ≥4.6:1), warning amber text on amber tint (hardest pair — may need L 0.85), status pill text on tinted bgs (all 399 sites share one formula → verify once per family), link on canvas, white on blue-800 (unchanged, 8.6:1 — re-assert).
3. Light mode: assert the palette overrides produce byte-identical rendered colors to today (regression guard — the light theme must not move).

### 5.1 Enforceable acceptance gates G1–G4 (owner's final clarification — hard exit criteria, not guidelines)

**Enforcement status:** a phase passes only when its gates exit 0 **and** their evidence bundles are retained and committed with the phase. **If any gate fails: STOP** — do not run the next gate, do not commit the failing state as complete, do not push; report the failure and the retained evidence to the owner, fix, then re-run the gates from G1. **Class-name or class-string comparisons alone are never accepted as proof of visual parity** (owner directive); the grep/class-diff checks inside G4 are completeness checks that supplement — never replace — the computed-value and pixel evidence.

**Common protocol (all four gates):**
- **Baseline pinning — the FIRST Phase-0 action, before any edit:**
  ```bash
  mkdir -p docs/done/qa_evidence/ui-ux/dark-theme/phase0
  git rev-parse HEAD > docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt
  ```
  The recorded SHA is authoritative and is echoed by every gate report. At the time of this revision `origin/main-full-dev` = `f085e20` (the Rev 1 plan commit); if this revised plan is committed before Phase 0 starts, the baseline becomes that plan commit. **A gate run without a recorded baseline SHA is invalid.**
- **Baseline builds never touch the dev worktree:** `git worktree add /home/z/my-project/.baseline-check "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)"` (path added to `.git/info/exclude`), build and capture there, then `git worktree remove`.
- **Run order:** G1 → G2 → G3 → G4 (cheapest first); the first failure halts the sequence.
- **Browser environment (G2–G4):** Playwright Chromium — added as a devDependency in the Phase-0 tooling commit (verified absent from `package.json` today; the only planned new dependency) after `bunx playwright install chromium`; headless Chromium, viewport 1280×800, deviceScaleFactor 1, `colorScheme: 'light'`, `prefers-reduced-motion: reduce`, network-idle + 500 ms settle before every capture.
- **Evidence root:** `docs/done/qa_evidence/ui-ux/dark-theme/<phase>/<gate>/` (extends the existing ui-ux evidence convention — 20 tracked PNGs already live there). `/docs/` is a gitignored path in this repo (`.gitignore:53`), so evidence files are force-added, exactly like this plan document and the existing evidence set. Each gate directory contains `manifest.txt` recording: baseline SHA, HEAD SHA, exact commands, exit codes, timestamps.
- **Re-run rule:** any change to Phase-0 scope after a green run re-runs ALL four gates from G1.

**G1 — Token-resolution equivalence (static; re-runnable in CI)**
- **Proves:** every §2.5 old→new mapping resolves to the identical computed value in light mode at the token level — including the `/40 /50 /80 /85 /95` modifiers, the `hover:`/`focus:`/`file:` prefixed forms, and the `@supports` color-mix branch that wins in modern browsers.
- **Baseline:** the pinned SHA above.
- **Command:** `bun scripts/theme/equiv-check.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g1/`
- **Procedure:** the harness (in-repo evolution of the validated prototype `scripts/dark-probe/equiv-check.py`) extracts the pre-migration utility inventory from the **baseline tree** and the post-migration inventory from **HEAD**, compiles both class lists through the project's own `@tailwindcss/postcss` v4.3.3 pipeline, parses the emitted CSS, resolves every `var()` chain against the light-mode `:root`/`@theme` values, normalizes color notation, and asserts pairwise equality for the complete §2.5 mapping table. Exits non-zero on any mismatch or missing rule.
- **Expected result:** exit 0; `report.json` shows every pair identical. **Prototype status: 15/15 pairs PASS** with the project's own Tailwind 4.3.3 (mechanism validated during the Rev 2 investigation); the in-repo version extends the pair list to the complete inventory.
- **Evidence retained:** `g1/manifest.txt`, `g1/report.json`, `g1/resolved-pairs.tsv`, `g1/pre-inventory.txt`, `g1/post-inventory.txt`.
- **On failure:** STOP per the enforcement rule; the report prints both resolved values for the failing pair.

**G2 — Computed-style equality in headless Chromium (light mode)**
- **Proves:** the migrated classes resolve identically through a real browser cascade — catches `@supports` branch selection, `color-mix()` resolution, and cascade subtleties that static parsing cannot.
- **Baseline:** the old-class side of every pair, compiled at HEAD; G1 separately proves the old vocabulary compiles identically at the pinned baseline, closing the loop.
- **Command:** `bun scripts/theme/g2-computed.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g2/`
- **Procedure:** at HEAD the harness compiles ONE specimen stylesheet containing BOTH vocabularies (old + new class lists, explicit source inventory) through the real `globals.css`, loads `scripts/theme/specimen.html` — paired elements `[data-old]`/`[data-new]` with identical DOM geometry — in headless Chromium under the common environment spec, and for every pair reads `getComputedStyle` for: `color`, `background-color`, `background-image`, `border-{top,right,bottom,left}-color`, `outline-color`, `box-shadow`, `text-decoration-color`, `accent-color`. Reports every pair×property mismatch with both resolved values. Exits non-zero on any mismatch.
- **Expected result:** 0 mismatches across all pairs × all properties.
- **Evidence retained:** `g2/manifest.txt`, `g2/computed.json`, `g2/mismatches.txt` (expected: empty).

**G3 — Specimen screenshot diff (light mode; 0 pixels)**
- **Proves:** end-to-end rendering — not just computed values — is pixel-identical for the migrated vocabulary.
- **Baseline:** the pinned SHA above.
- **Command:** `bun scripts/theme/g3-specimen-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g3/`
- **Procedure:** renders the identical specimen DOM twice — at the **baseline commit** with the OLD class list, and at **HEAD** with the NEW class list, each compiled with that tree's own `globals.css` — captures full-page screenshots under the common environment spec, and pixel-diffs them (pixelmatch, threshold 0.00, alpha included).
- **Expected result:** **0 differing pixels** (`report.json` → `diffPixels: 0`).
- **Evidence retained:** `g3/manifest.txt`, `g3/baseline-old.png`, `g3/head-new.png`, `g3/diff.png`, `g3/report.json`.

**G4 — Route-level screenshot + grep coverage (light mode)**
- **Proves:** the real application — every route in the fixed matrix — renders pixel-identically in light mode after Phase 0, and the migration inventory is complete (no stragglers, no smuggled class changes).
- **Baseline:** the pinned SHA above.
- **Command:** `bun scripts/theme/g4-route-diff.mjs --baseline "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" --out docs/done/qa_evidence/ui-ux/dark-theme/phase0/g4/`
- **Fixed route matrix (enumerated; never silently reduced):** `/portal/login`; `/legal/privacy`, `/legal/terms`, `/legal/cookies`, `/legal/refund`; student `/portal/{branch}/student/{username}` (dashboard) plus `/academics`, `/settings`, `/enrollment`, `/events`, `/tasks`, `/profile`, `/professors` (session via the existing dev-only `POST /api/auth/demo`, which issues a real cookie for the seeded demo student); faculty `/portal/{branch}/faculty/{username}` (dashboard) plus `/my-students`, `/grade-encoding`; admin `/portal/{branch}/admin/{username}` (release queue) plus `/people`, `/events`, `/announcements` (sessions via the seeded dev accounts that produced the existing `admin-*.png` evidence; credentials via env vars, never committed — if unavailable at gate time the harness reports the gap and the gate fails; coverage is never reduced silently). Plus three interaction states: modal open (admin events / student enrollment COE), dropdown open (topbar user menu), skeleton loading (network-throttled navigation).
- **Procedure:** `bun run build` + `bun run start` (fixed port, dev env vars as needed) on BOTH the baseline scratch worktree and the dev worktree; Playwright navigates each route/state, captures full-page light screenshots; pairwise pixelmatch; then the coverage checks (exact commands, expected outputs recorded in `g4/grep-coverage.txt`):
  - `rg -P -n 'bg-white(?!/80|/20)' src/` → exactly the two allowlisted sites (`StudentIdCard:40` `/80`, `FacultyGradeEncodingPage:530` `/20`, §2.5);
  - `rg -P -n 'text-blue-(600|700|800)' src/` → **0 matches**;
  - `rg -P -n 'bg-slate-900' src/` → **0 matches** (all 10 scrim sites + the skip-link migrated);
  - `git diff --unified=0 "$(cat docs/done/qa_evidence/ui-ux/dark-theme/phase0/baseline-sha.txt)" -- src/ | rg '^[+-].*(bg-white|bg-surface|text-blue-|text-link|bg-scrim|bg-slate-900)'` → the extracted old→new class multiset equals the §2.5 mapping table exactly (no unlisted changes smuggled in).
- **Expected result:** every route/state pair **0 differing pixels**; greps return exactly the allowlisted remnants; the class-diff equals the mapping table.
- **Evidence retained:** `g4/manifest.txt`, `g4/routes/<route>/{baseline.png,post.png,diff.png}`, `g4/route-report.json`, `g4/grep-coverage.txt`, `g4/class-diff.txt`.

**Phase-1 re-run (light-parity guard when the engine lands; amended Rev 2.1 per issue #91):** immediately after the Phase-0 push, its exit SHA is pinned the same way into `…/dark-theme/phase1/baseline-sha.txt` (recorded for the executed run: `acbe71a`). Phase 1 then re-runs G1, G2, and G4 in light mode against that baseline before its own push. G1 and G2 stay strictly zero-difference, exactly as in Phase 0. G4 runs as **two stages**, because Phase 1 adds visible controls to matrix routes, so a single literal zero-diff pass is unsatisfiable at HEAD. The property being protected is that the light theme does not move, not that new controls are invisible:

- **Parity stage (engine-only, at commit 1a):** `GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase1 GATE_MAIN_WT=<dev worktree> bun scripts/theme/g4-route-diff.mjs --mode parity --stage capture --out docs/done/qa_evidence/ui-ux/dark-theme/phase1/g4-parity/` (preceded by the same command with `--stage setup`; the harness header documents both stages and the `GATE_*` worktree overrides). **All route/state captures must be 0 differing pixels.** The engine ships no control, so the literal Phase-0 criterion holds at this state. This is the strict light-parity proof.
- **Final stage (controls present, at HEAD = commit 1b):** the same harness with `--mode final --allow-diff <route,names>`. The mode refuses to run without an explicit allow list (hard error), so every permitted diff is a deliberate, named decision rather than a silent loosening. Routes not on the list must stay **0 differing pixels** (the four `/legal` routes carry no control and serve as the negative controls). Allow-listed routes may differ **only where the intended controls render** (login-page toggle, Topbar toggle plus the replaced Theme-soon placeholder, Settings appearance section). Every diff's bounding box is recorded in `route-report.json` and its `routes/<route>-diff.png` retained, so each diff can be attributed to a control on review.
- **Failure rule (both stages):** the gate exits non-zero on any unexpected diff (any diff at all in parity mode; any diff on a non-allow-listed route in final mode), any failed capture (including the authenticated-route content validation that rejects a landed-on-login capture), any failed coverage grep, or a class-mapping mismatch. For parity/final the class-diff rule is: **zero old-vocabulary tokens** (`bg-white`, `text-blue-600/700/800`, `bg-slate-900`) may appear in the baseline-to-HEAD class diff; new-vocabulary changes are recorded as evidence. The pass condition in code is `unexpectedDiffs === 0 && failedCaptures === 0 && grepsOk && classDiffOk`.
- **Evidence retained:** `g4-parity/` and `g4/`, each with `manifest.txt` (baseline SHA, HEAD SHA, worktree, exact command, exit code, environment, deviations), `route-report.json` (per-capture diffPixels, sizes, bbox, diffAllowed), `routes/*.png` (baseline, post, diff), `grep-coverage.txt`, `class-diff.txt`.
- **Known limitation, recorded honestly:** the final stage's allow list is route-granular, not region-granular. The harness records each diff's bounding box but does not mechanically fail a diff whose pixels extend beyond the expected control region; the bbox plus the retained diff PNG are the review instruments for attributing every diff to the intended controls. The control-hiding capture proposed in issue #91 (re-capturing with the controls hidden via a `data-theme-control` marker and `display:none`) was deliberately **not** implemented: the two-stage design proves a stronger property, a real zero-pixel build at the engine-only commit, rather than a synthetically altered one, and it relies on the plan-mandated 1a/1b commit split. Phase-1 dark-mode quality is asserted by the §5 contrast matrix and the §6 functional checks (they assert quality, not zero-diff).

**Bookkeeping:** the emitted-CSS size delta (bytes, before/after) is documented in the Phase-0 PR body.

**Functional regression:**
4. `bun test src/lib/authz/` (76) + `scripts/lib` (6) + lint + typecheck — theme work is CSS/class-level; these must stay green (guards against accidental logic edits).
5. Route matrix manual pass (light + dark × 3 roles): login → student (dashboard/academics/events/professors/enrollment/tasks/profile/settings) → faculty (dashboard/students/grade encoding/records/announcements/schedule/tasks) → admin (all 7). Verify: modals, dropdowns, toasts, skeletons, empty states, focus rings, skip-links (both shells), drawer + scrim, table sticky headers, COE print (must print light), ID card (light card on dark page).
6. `prefers-reduced-motion`: shimmer already respects it; theme transition uses `disableTransitionOnChange` (no cross-fade animation to gate).
7. System-preference live-switch test (change OS theme while app open), refresh-persistence test, multi-tab consistency.
8. Browser matrix: Chromium (Vercel preview), Firefox, Safari/iOS (OKLCH + cascade layers + `color-mix` supported in all current versions — and already required by the app's existing CSS).
9. Screenshot-diff pass of grade encoding + dashboard in both themes for visual calm review (no clipped text, no invisible borders).

---

## 6. Phased implementation plan (Rev 2 — revised per owner review + final clarification)

**Owner requirements (Point 2 + final clarification):** Phase 1 includes the **complete, usable theme-switching experience** — the theme provider, the Settings appearance selector (Light/Dark/System), the Topbar toggle, and the login-page toggle — and **is not complete, and must not be pushed independently, until those controls work**. Phase 2 contains **only remaining polish and QA that does not block users from selecting and switching themes**. Infrastructure and controls may be separate **commits** within Phase 1, but the intermediate state is never pushed alone and never presented as a finished feature. Each phase = one push to `main-full-dev`, lint+typecheck+tests green, independently revertible. *(The Rev 1 table's separate "Selectors & login" phase — the source of the Phase 1/Phase 2 contradiction flagged in review — is eliminated; the table below is the canonical phase structure.)*

| Phase | Contents | User-visible dark? | Independent push? | Exit gates |
|---|---|---|---|---|
| **0 — Exception migrations + light-value tokens + gate harness** | §2.5 mappings (228 `bg-white`, 122 link occurrences, 11 scrim sites); dead-token-block deletion; `tailwind.config.ts` deletion; `scripts/theme/` gate harness (+ Playwright devDependency) | No — zero visual change | Yes — **only after G1–G4 all green** | G1+G2+G3+G4 (§5.1) + coverage greps + tests/lint/typecheck/build + CSS-size delta documented |
| **1 — Theme engine + complete switching experience** (ONE push: commits 1a engine + 1b controls) | Engine: provider, `.dark` tokens, palette overrides, login `T.*` dark values, skeleton, `color-scheme`. Controls: Settings appearance selector (Light/Dark/System), Topbar toggle, login toggle | Yes — the first and only dark-enabling push | **Only as the single 1a+1b push — never without working controls** | All four controls functional (checklist below) + G1/G2/G4 light re-run vs Phase-0 exit (G1/G2 strict zero; G4 two-stage per §5.1 Rev 2.1: parity stage strict 0 px, final stage only explicitly allow-listed control diffs) + dark contrast matrix + route smoke + no-FOUC + persistence + CI green |
| **2 — Non-blocking polish & QA** | Inline-hex cleanups, blurred-surfaces review, full route matrix ×3 roles ×2 themes, COE/ID-card checks, evidence archive | No new switching capability | Yes | Route-matrix checklist 100%, zero open P1/P2 visual bugs, evidence archived |
| **3 — Docs** | Design-system dark token tables, TODO entry, plan marked implemented | No | Yes | Docs committed; zero code changes |

### Phase 0 — Exception migrations + light-value tokens (zero visual change)
**Deliverable:** every future-dark-sensitive call site migrates to tokens whose LIGHT values are exactly today's rendered colors (§2.5 contract).
- All §2.5 mappings: `bg-white`→`bg-surface` (228 sites), link family (122 occurrences), scrims (11 sites), skip-links.
- globals.css: delete the dead "Profile page design tokens" block (resolves the `--color-muted` duplicate; prevents the `--color-surface` literal collision), add the var-chain tokens with light values only.
- Delete vestigial `tailwind.config.ts`.
- Add the in-repo gate harness: `scripts/theme/` (G1 `equiv-check.mjs`, G2 `g2-computed.mjs`, G3 `g3-specimen-diff.mjs`, G4 `g4-route-diff.mjs`, `specimen.html`) + Playwright devDependency — the tooling commit that makes §5.1 executable.
**Acceptance criteria (all must pass; any gate failure = STOP + report, no push — §5.1):**
- G1, G2, G3, G4 green per §5.1, with evidence bundles retained under `docs/done/qa_evidence/ui-ux/dark-theme/phase0/` and the baseline SHA recorded before the first edit.
- G4 coverage greps: exactly the §2.5 allowlist remnants; class-diff == mapping table exactly.
- `bun test src/lib/authz/` 76/0; `bun test scripts/lib/` 6/0; lint 0 errors; typecheck clean; `bun run build` succeeds; emitted-CSS size delta documented in the PR body.
**Risk:** Low (pure rename + dead-code removal; every pair objectively gated). **Effort:** ~half day.

### Phase 1 — Theme engine + the complete, usable theme-switching experience (ONE push, two commits)
**Deliverable:** dark rendering AND every control a user needs to select and switch themes — landing together, complete at push. **Phase 1 is not complete — and MUST NOT be pushed — until ALL FOUR of these controls work** (owner's final clarification; no control work may be deferred to Phase 2):
1. **ThemeProvider** mounted with the verified config; `.dark` applied to `<html>` before first paint.
2. **Settings appearance selector** — Light / Dark / System radio in `SettingsPage`, reachable by every role via `SECONDARY_NAV`.
3. **Topbar toggle** — present on every authenticated surface.
4. **Login-page toggle** — functional pre-authentication (outside the shell).

- **Commit 1a (engine — local only until 1b passes):** ThemeProvider mount (`attribute="class"`, `defaultTheme="system"`, `enableSystem`, `storageKey="aics_theme"`, `disableTransitionOnChange`), remove hardcoded body classes, recalibrated `.dark` core tokens + Layer-2 palette-var overrides (dark `--muted` goes live — no light impact, §2.5), `--surface/…` dark values, dark skeleton shimmer, `color-scheme` hints, login `T.*` dark values.
- **Commit 1b (controls — completes the phase):** the Settings `appearance` section, the Topbar quick toggle, and the login-page toggle.
- The push contains BOTH commits; 1a is never pushed alone, never announced, and the PR describes the feature only as complete-at-push. **A failure in any control reopens Phase 1 — it is never deferred to Phase 2.**
**Acceptance criteria (all must pass before the push):**
- **Controls checklist — each of the four controls:** switches all three modes; persists via `aics_theme` across refresh; consistent across tabs; follows OS changes live in System mode; no FOUC under throttled first paint. Verified per control (harness-assisted: Playwright drives each control in each mode and asserts `documentElement.classList` plus the canvas computed `background-color`); toggle reachable within 2 interactions from every authenticated surface.
- **Light mode unchanged:** G1 + G2 re-run in light vs the Phase-0 exit commit with zero differences, plus the G4 two-stage re-run per §5.1 Phase-1 re-run (Rev 2.1): the engine-only parity stage is strict zero pixels on every capture; the final stage is zero pixels on control-free routes, with only explicitly allow-listed, control-attributed diffs elsewhere.
- **Dark mode:** contrast script green (§5 matrix); route smoke in dark (login + one route per role); sonner/dropdown/dialog/button verified in dark; skeletons and empty states visible.
- CI green; worktree clean after push.
**Risk:** Medium (the big visible switch — mitigated by shipping all four controls in the same push and gating light parity on §5.1). **Effort:** ~1 day.

### Phase 2 — Non-blocking polish & QA only (no theme-selection or theme-switching work)
**Scope rule (owner's final clarification):** Phase 2 contains only remaining polish and QA that does not block users from selecting and switching themes. Every control ships in Phase 1; a control found broken here is a Phase-1 regression to be fixed immediately — not Phase-2 polish.
**Deliverable:** inline-hex cleanups in shared components (`Sidebar` #f1f5f9×2, `Topbar` #1e293b avatar, `EmptyState`, `TasksTab`, `AcademicHeader`, `CookieConsent`/`LegalShell` inline styles — `#153357` navy stays), blurred-surfaces review, full contrast audit run, route matrix ×3 roles ×2 themes, COE print light, ID card light-on-dark, screenshot archive under `docs/done/qa_evidence/ui-ux/dark-theme/phase2/`.
**Acceptance criteria:** route-matrix checklist 100%; archived evidence; zero open P1/P2 visual bugs; reduced-motion respected; browser matrix pass.
**Risk:** Low (QA-driven). **Effort:** ~half day.

### Phase 3 — Docs
**Deliverable:** `.superdesign/design-system.md` gains the dark token tables; TODO.md entry; this plan marked implemented.
**Acceptance criteria:** docs committed; no code changes in this phase. **Risk:** none. **Effort:** trivial.

**Risks & mitigations (rolled up):**
- **R1 Blanket remap surprises** (a slate shade used against its role, or new code landing mid-implementation): mitigated by the §1.3 census + Tier-C verify pass + screenshot diffs; any straggler is a one-line fix.
- **R2 `bg-white` rename churn** (228 sites): mechanical per-file edit, reviewed as a class-only diff; objective gates G1–G4 replace class-name-only review (owner directive).
- **R3 Contrast edge cases** (amber-on-amber-tint): pre-verified pairs in the Phase-1 commit; adjust the token, not call sites.
- **R4 Hydration/flash regressions**: next-themes handles; `suppressHydrationWarning` already present; test hard on slow-3G throttle.
- **R5 Vestigial `tailwind.config.ts` confuses contributors**: deleted in Phase 0.
- **R6 Environment resets destroying local work** (observed 5× across sessions): commit early per phase; worklog after each phase; verify both remote SHAs before any git operation.
- **R7 (Rev 2) Fallback-line asymmetry for `/α` utilities** (static `color-mix(in srgb,…)` vs `var(…)` fallback): browser floor unchanged (app already requires `color-mix`); G2/G4 verify in real browsers; noted in §2.5.

**Estimated effort:** Phase 0 ~half day (mostly mechanical + harness), Phase 1 ~1 day (calibration + controls + QA), Phase 2 ~half day QA-driven, Phase 3 trivial.

---

## 7. Verified findings vs assumptions

**Verified (read from the repo, grepped, or empirically compiled with the project's own Tailwind 4.3.3):**
- Rev 2 census (§1.3): 1,643 slate utilities; 230 `bg-white` (incl. all alpha/prefixed forms enumerated); 127 `text-blue-*` with per-shade and per-variant splits; 39 brand-action bgs; 399 status-tint utilities; 184 hex literals in 30 files; 8 `dark:` variants, all semantic-token-based; `bg-blue-500` ×2 (dots only).
- `--color-muted` duplicate: exists (globals.css:33/:49); bakes literal `#64748B` into `*-muted` utilities under `@theme inline` (probe A/B); **zero `*-muted` call sites in `src/`** (PCRE census; only `text-muted-foreground` ×4 on a separate token); the dead "Profile page design tokens" block (globals.css:43–63) has zero consumers.
- The var() emission of default-palette utilities; the var-chain emission + `.dark` cascade for the NEW tokens (`dark\:bg-surface:is(.dark *)` → `var(--surface)`); opacity-modifier `color-mix` behavior for both static and var-chain colors; shadow inlining (all probe-verified).
- **G1 equivalence: 15/15 mapping pairs resolve identical in light mode** (`scripts/dark-probe/equiv-check.py`, project's own pipeline) — including `/80`, `/95`, `hover:/50`, `focus:`, `file:` forms and both scrim opacities.
- next-themes 0.4.6 API surface read from `node_modules/next-themes/dist/index.d.ts` (all planned props exist).
- `@config` absent repo-wide; `globals.css` is the only CSS file; `postcss.config.mjs` loads only `@tailwindcss/postcss`; layout body hardcoding + `@layer base` fallback; `suppressHydrationWarning` on `<html>`/`<body>`; storage-key convention; `SECONDARY_NAV` covering all roles; Settings section structure; ID/COE print isolation; existing `.dark` block; no chart library (stat cards only); LegalShell skip-link (not a "dark footer"); the two navy chips; `text-blue-900/950` are text-only usages.

**Assumptions to validate during implementation (not yet verified):** exact dark OKLCH values are calibrated proposals pending the contrast script run (targets stated, pairs listed); the G1–G4 harnesses are fully specified with exact commands and evidence requirements (§5.1) but not yet built — G1's mechanism is validated (15/15 prototype pass), and G2–G4 land in the Phase-0 tooling commit with Playwright as the only new devDependency (verified absent from `package.json` today); seeded dev credentials for the faculty/admin G4 sessions exist in the dev environment (the existing `admin-*.png` evidence implies yes — confirmed at gate time or the gate fails, never passes by omission); the per-file distribution of the 228 `bg-white` renames (~55 files, estimate from census); Chrome/Firefox/Safari behavior of the `@supports` color-mix branch on the exact Vercel preview runtime.

**Recommendations:** approve Phase 0 first (objectively gated zero-visual-change prep that makes every later diff reviewable), then Phase 1 as the single user-visible switch — the engine and ALL FOUR controls (ThemeProvider, Settings appearance selector, Topbar toggle, login toggle) in one push, never one without the others.
