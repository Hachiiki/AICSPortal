# AICS Student Portal — Design System

> Extracted from the codebase for use with Superdesign.
> This document defines all design tokens, component patterns, and layout
> conventions used across the portal. It serves as the single source of
> truth for design decisions when creating or refining UI.

---

## 1. Brand Identity

**School:** Asian Institute of Computer Studies (AICS)
**Branch:** Commonwealth
**Portal type:** Student information system (university portal)
**Design direction:** Institutional, professional, restrained — like a real university IT portal. Not flashy, not playful. Clean, mature, trustworthy.

---

## 2. Color System

### 2.1 Portal Color Palette (primary)

Used across all authenticated pages (dashboard, academics, events, professors, profile).

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| **Canvas** | `#F8FAFC` | `slate-50` | Page background |
| **Surface** | `#FFFFFF` | `white` | Cards, sidebar, topbar |
| **Line** | `#E2E8F0` | `slate-200` | Borders, dividers |
| **Ink** | `#0F172A` | `slate-900` | Headings, primary text |
| **Body** | `#334155` | `slate-700` | Body text |
| **Muted** | `#64748B` | `slate-500` | Secondary text, captions |
| **Faint** | `#94A3B8` | `slate-400` | Placeholder, disabled |
| **Ghost** | `#CBD5E1` | `slate-300` | Disabled items, empty states |

### 2.2 Brand (Blue) Scale

| Token | Hex | Tailwind | Usage |
|---|---|---|---|
| Brand-50 | `#EFF6FF` | `blue-50` | Light backgrounds |
| Brand-100 | `#DBEAFE` | `blue-100` | Hover backgrounds |
| Brand-200 | `#BFDBFE` | `blue-200` | Focus rings, light borders |
| Brand-600 | `#2563EB` | `blue-600` | Active states, progress bars |
| Brand-700 | `#1D4ED8` | `blue-700` | Code text, links, active nav |
| Brand-800 | `#1E40AF` | `blue-800` | Active sidebar background |
| **Navy** | `#1E3A8A` | `blue-950` | Hero headings, deep accents |

### 2.3 Login Page Palette (scoped)

The login page uses a separate, institutional palette. Not mixed with the portal.

| Token | Hex | Usage |
|---|---|---|
| **T.text** | `#17324D` | Primary text, headings |
| **T.bg** | `#F7F9FB` | Page background, help boxes |
| **T.border** | `#D9E0E6` | Input borders, dividers |
| **T.muted** | `#6B7785` | Secondary text, icons |
| **T.primary** | `#1769AA` | Primary action blue |
| **T.primaryDark** | `#124D7A` | Hover / pressed state |
| **T.accent** | `#2F9ED8` | Focus rings, scan line, accents |

### 2.4 Legacy Brand palette

Used in older ID card components and some palette.ts exports.

| Token | Hex | Usage |
|---|---|---|
| PALETTE.white | `#FFFFFF` | White |
| PALETTE.mist | `#D2D2D3` | Light gray |
| PALETTE.sky | `#64BFE9` | Light blue (gradient bottom) |
| PALETTE.azure | `#4EA4D7` | Medium blue (gradient top) |
| PALETTE.ocean | `#287CBB` | Mid blue |
| PALETTE.navy | `#153357` | Dark navy |

### 2.5 Status Colors

| Status | Background | Text | Border | Tailwind |
|---|---|---|---|---|
| **Success / Passed / Graded** | `#F0FDF4` | `#15803D` / `#16A34A` | `#BBF7D0` | `green-50/700/border-200` |
| **Warning / Pending / INC** | `#FFFBEB` | `#B45309` | `#FDE68A` | `amber-50/700/border-200` |
| **Danger / Missing (open)** | `#FEF2F2` | `#DC2626` | `#FECACA` | `red-50/700/border-200` |
| **Neutral / Missing (closed)** | `#F1F5F9` | `#475569` | `#E2E8F0` | `slate-100/600/border-200` |
| **Info / Needs attention** | `#EFF6FF` | `#1D4ED8` | `#BFDBFE` | `blue-50/700/border-200` |

### 2.6 Schedule / Course Colors

| Color key | Dot | Background | Border | Code text |
|---|---|---|---|---|
| **blue** | `bg-blue-600` | `bg-blue-50` | `border-blue-500` | `text-blue-700` |
| **green** | `bg-green-600` | `bg-green-50` | `border-green-600` | `text-green-700` |
| **amber** | `bg-amber-500` | `bg-amber-50` | `border-amber-500` | `text-amber-700` |
| **violet** | `bg-violet-600` | `bg-violet-50` | `border-violet-500` | `text-violet-700` |
| **red** | `bg-red-500` | `bg-red-50` | `border-red-400` | `text-red-700` |

### 2.7 Event Category Colors

| Category | Dot color | Pill style |
|---|---|---|
| **Academic** | `bg-blue-500` | `bg-blue-50 text-blue-700 border-blue-200` |
| **Deadline** | `bg-red-500` | `bg-red-50 text-red-700 border-red-200` |
| **Campus** | `bg-violet-500` | `bg-violet-50 text-violet-700 border-violet-200` |
| **Holiday** | `bg-green-500` | `bg-green-50 text-green-700 border-green-200` |
| **Tasks due** | `bg-amber-500` | `bg-amber-50 text-amber-700 border-amber-200` |

### 2.8 Task Type Colors

| Type | Style |
|---|---|
| **Activity** | `bg-blue-50 text-blue-700 border-blue-200` |
| **Quiz** | `bg-violet-50 text-violet-700 border-violet-200` |
| **Test** | `bg-orange-50 text-orange-700 border-orange-200` |
| **Project** | `bg-teal-50 text-teal-700 border-teal-200` |

---

## 3. Typography

### 3.1 Font Families

| Token | Font | Usage |
|---|---|---|
| `--font-sans` (Geist) | Geist Sans | Body text, UI labels, all portal text |
| `--font-mono` (Geist Mono) | Geist Mono | Student numbers, subject codes, grades, times |
| `--font-id-display` | Roboto Condensed 700 | ID card names/numbers (display) |
| `--font-id-body` | Roboto 400/500 | ID card address (body) |

### 3.2 Type Scale

| Element | Size | Weight | Tracking | Usage |
|---|---|---|---|---|
| Page title | `text-2xl` (1.5rem) | `font-bold` | `tracking-tight` | "Academics", "Events", "Professors" |
| Section heading | `text-base` (1rem) | `font-semibold` | — | Card headers, "Task Overview" |
| Subheading | `text-sm` (0.875rem) | `font-semibold` | — | "Grades & Subjects" |
| Body | `text-sm` (0.875rem) | `font-normal` | — | General text |
| Caption | `text-xs` (0.75rem) | `font-normal` | — | Subtitles, descriptions |
| Micro label | `text-[10px]` | `font-medium` | `tracking-wider` (0.05em) | Uppercase stat labels |
| Stat value | `text-base` / `text-2xl` | `font-bold` | — | Overview numbers, GPA |
| Mono code | `text-xs` | `font-bold` | `font-mono` | Subject codes (CS 205) |
| Micro caption | `text-[10px]` | `font-medium` | — | Footer hints |

### 3.3 Uppercase Labels

Used for stat labels and table headers:
```css
text-[10px] / text-[11px] + font-semibold + uppercase + tracking-wider + text-slate-500
```
Examples: "GPA", "UNITS", "SUBJECTS", "TOTAL", "GRADED", "PROFESSORS"

---

## 4. Spacing & Layout

### 4.1 Spacing Scale

Follows Tailwind's default scale. Most-used values:
- `gap-1` (4px) — pill internal icon gap
- `gap-2` (8px) — small element gaps
- `gap-3` (12px) — card header gaps
- `gap-4` (16px) — card grid gaps, default section gap
- `gap-6` (24px) — main content sections, summary chip gaps
- `gap-8` (32px) — large section gaps

### 4.2 Page Layout

**Authenticated shell:**
- Fixed sidebar: `w-60` (240px), left side
- Main content: `lg:pl-60` (left padding = sidebar width)
- Topbar: `h-16` (64px), sticky top
- Main content padding: `px-4 sm:px-6 lg:px-8 py-6 lg:py-8`

**Content max-width:** none (full width within sidebar), except profile page which uses `max-w-6xl mx-auto`

### 4.3 Card Layout

Standard card:
- Background: `bg-white`
- Border: `border border-slate-200`
- Radius: `rounded-xl` (12px)
- Shadow: `shadow-sm`
- Internal padding: `px-6 py-4` (header) / `px-6 py-5` (body)

### 4.4 Grid Patterns

- **2-column desktop:** `grid grid-cols-1 lg:grid-cols-3 gap-6` (calendar 2/3 + rail 1/3)
- **Card grid:** `grid grid-cols-1 md:grid-cols-2 gap-4` (professor cards)
- **Stat row:** `grid grid-cols-5 divide-x divide-slate-100` (task overview stats)

---

## 5. Border Radius

| Token | Value | Tailwind | Usage |
|---|---|---|---|
| `--radius` | `0.625rem` (10px) | `rounded-lg` | Default card/button radius |
| sm | `calc(0.625rem - 4px)` = 6px | `rounded-md` | Pills, badges, small buttons |
| lg | `0.625rem` (10px) | `rounded-lg` | Cards |
| xl | `0.625rem + 4px` = 14px | `rounded-xl` | Large cards, section containers |
| full | `9999px` | `rounded-full` | Avatars, status dots, toggle |

Login page uses custom radii: `rounded-[8px]` (inputs/buttons), `rounded-[10px]` (switcher), `rounded-[12px]` (face video), `rounded-l-[40px]` (panel left corners).

---

## 6. Shadows

| Level | Tailwind | Usage |
|---|---|---|
| Default | `shadow-sm` | All cards, sidebar |
| Elevated | `shadow-lg` | Dropdowns, popovers, modals |
| Maximum | `shadow-2xl` | Centered modals |
| None | (none) | Table rows, inline elements |

---

## 7. Component Patterns

### 7.1 Card

```
bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden
```
Header: `px-6 py-4 border-b border-slate-100`
Body: `px-6 py-5`

### 7.2 Pill / Badge

```
inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border
```
Color varies by status (see Color System above).

### 7.3 Button — Primary

```
px-4 py-2 rounded-lg text-sm font-semibold text-white bg-blue-700 hover:bg-blue-800
```

### 7.4 Button — Secondary

```
px-3 py-1.5 rounded-lg text-xs font-medium border border-slate-200 text-slate-600 hover:bg-slate-50
```

### 7.5 Button — Danger/Late

```
px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100
```

### 7.6 Info Icon Button (circular)

```
w-8 h-8 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-700
```

### 7.7 Avatar (initials)

```
w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-semibold
background: #1e293b (slate-800)
```

### 7.8 Table

```
w-full text-sm
Header: bg-slate-50 border-b border-slate-100
Header cell: px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500
Body row: border-b border-slate-100 last:border-b-0 hover:bg-slate-50/60
Body cell: px-4 py-3
Code cell: font-mono text-xs font-bold text-blue-700
Grade cell: font-mono text-sm font-bold text-blue-700
```

### 7.9 Skeleton Shimmer

```css
.aics-skeleton {
  background: linear-gradient(90deg,
    rgb(226 232 240) 0%,   /* slate-200 */
    rgb(241 245 249) 50%,  /* slate-100 */
    rgb(226 232 240) 100%  /* slate-200 */
  );
  background-size: 200% 100%;
  animation: aics-shimmer 1.6s ease-in-out infinite;
  border-radius: 0.5rem;
}
```

### 7.10 Sidebar Nav Item — Active

```
background: #1e40af (blue-800)
color: #ffffff
```

### 7.11 Sidebar Nav Item — Default

```
color: #475569 (slate-600)
hover: background #f1f5f9 (slate-100), color #0f172a (slate-900)
```

### 7.12 Sidebar Nav Item — Disabled (SOON)

```
color: #cbd5e1 (slate-300)
cursor: not-allowed
Badge: text-[9px] font-semibold uppercase tracking-wider bg-slate-100 text-slate-400 px-1.5 py-0.5 rounded
```

### 7.13 Back to Dashboard Link

```
inline-flex items-center gap-2 text-sm font-semibold text-blue-600 hover:text-blue-700 mb-3
Icon: ChevronRight w-4 h-4 rotate-180
```

### 7.14 Progress Bar

```
Container: h-2 rounded-full bg-slate-100 overflow-hidden
Fill: h-full rounded-full bg-blue-600 transition-all
```

---

## 8. Iconography

**Library:** Lucide React
**Default size:** `w-4 h-4` (16px) for most UI, `w-3.5 h-3.5` (14px) for inline, `w-5 h-5` (20px) for topbar, `w-10 h-10` (40px) for empty states.

Key icons used:
- `Home` — Dashboard nav
- `GraduationCap` — Academics nav
- `CalendarDays` — Events nav
- `Users` — Professors nav
- `Stamp` — Enrollment nav (disabled)
- `Settings` — Settings nav (disabled)
- `CircleHelp` — Help nav (disabled)
- `ChevronRight` rotate-180 — Back to Dashboard
- `ChevronLeft/Right` — Calendar prev/next
- `ChevronDown/Up` — Accordion expand/collapse
- `Download` — PDF export
- `Info` — View details (circular button)
- `Lock` — Closed submissions
- `Clock` — Office hours, pending status
- `MapPin` — Room location
- `Mail` — Email link
- `CheckCircle2` — Graded status
- `AlertTriangle` — Overdue/warning
- `Calendar` — Due date / needs attention
- `CheckCircle` — Empty state "all caught up"
- `ClipboardList` — Empty task list
- `ScanFace` — Face ID
- `ShieldCheck` — Security footer
- `Bell` — Notifications
- `Menu` — Mobile hamburger
- `X` — Close modal

---

## 9. Animation

**Library:** Framer Motion
**Default entrance:** `initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}`
**Modal entrance:** `initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}`
**Skeleton shimmer:** 1.6s ease-in-out infinite
**Toggle switch:** transition-transform on the knob

---

## 10. Page Structure

### 10.1 Authenticated Page Shell

```
<div className="min-h-dvh bg-slate-50 font-sans">
  <Sidebar active="..." onNavigate={...} />
  <div className="lg:pl-60">
    <Topbar student={...} onProfile={...} onLogout={...} />
    <main className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 min-w-0 space-y-6">
      {/* Page header: back link + title + subtitle */}
      {/* Content cards */}
    </main>
  </div>
</div>
```

### 10.2 Page Header Pattern

```
<div>
  <button onClick={back} className="...text-blue-600...">
    <ChevronRight className="w-4 h-4 rotate-180" /> Back to Dashboard
  </button>
  <h1 className="text-2xl font-bold tracking-tight text-slate-900">Page Title</h1>
  <p className="text-sm text-slate-500 mt-1">Subtitle with context</p>
</div>
```

### 10.3 Summary Chips Pattern

```
<div className="flex gap-3">
  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 shadow-sm">
    <Icon className="w-4 h-4 text-blue-600" />
    <span className="text-xs font-medium text-slate-500">Label</span>
    <span className="text-sm font-bold text-slate-900">Value</span>
  </div>
</div>
```

---

## 11. Print Styles

The Certificate of Enrollment (COE) uses special print CSS:
```css
@media print {
  body * { visibility: hidden !important; }
  .coe-print-area, .coe-print-area * { visibility: visible !important; }
  .coe-print-area { position: absolute; left: 0; top: 0; width: 100%; padding: 2rem; }
  .no-print { display: none !important; }
}
```

---

## 12. Responsive Behavior

- **Mobile (< 1024px):** Sidebar becomes a slide-in drawer (AnimatePresence + motion.aside). Topbar shows hamburger menu.
- **Tablet (768-1024px):** Grids collapse to 1 column. Calendar horizontally scrollable.
- **Desktop (≥ 1024px):** Full layout — fixed sidebar, 2-3 column grids.
- **Mobile warning overlay:** Shows a full-screen warning when viewport < 768px wide, telling users to use desktop.

---

## 13. Existing Files & Architecture

### Key source files:
- `src/app/globals.css` — Tailwind v4 theme tokens, skeleton shimmer, print CSS
- `src/app/layout.tsx` — Font loading (Geist, Geist Mono, Roboto Condensed, Roboto), Vercel Analytics
- `src/lib/aics/palette.ts` — Legacy brand palette
- `src/components/auth/login-tokens.ts` — Login-scoped institutional palette
- `src/lib/schedule.ts` — Schedule color styles, grid constants, date helpers
- `src/lib/aics/tasks.ts` — Task status/variant/type colors
- `src/lib/aics/events.ts` — Event category colors
- `src/components/portal/RemarksBadge.tsx` — Remarks pill component
- `src/components/portal/Skeleton.tsx` — Shimmer skeleton primitives

### Component file structure:
```
src/components/
  auth/
    LoginView.tsx        — 60/40 split login page
    CredentialsForm.tsx  — Username/password form
    FaceIdPanel.tsx      — Face ID webcam panel
    BranchRedirect.tsx   — Post-login animation
    login-tokens.ts      — Login design tokens
  portal/
    Sidebar.tsx          — 240px fixed sidebar
    Topbar.tsx           — 64px topbar with dropdown
    StudentDashboard.tsx — Main dashboard
    StudentProfile.tsx   — Profile page
    AcademicsPage.tsx    — Academics (grades/subjects/tasks tabs)
    TasksTab.tsx         — Tasks tab (extracted)
    EventsPage.tsx       — Events calendar
    EventsPageParts.tsx  — Calendar/rail sub-components
    ProfessorsPage.tsx   — Professor directory
    Skeleton.tsx         — Loading skeletons
    GradesRow.tsx        — Shared table row components
    RemarksBadge.tsx     — Remarks pill
    GradesTable.tsx      — Dashboard grades table
    ScheduleGrid.tsx     — Weekly calendar grid
    TodaysClasses.tsx    — Today's classes sidebar
    AcademicHeader.tsx   — Dashboard hero
```
