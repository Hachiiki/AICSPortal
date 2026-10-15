# 17 — WCAG AA Color Contrast Audit

Scope: `src/` (1133 color-class usages, 28 distinct classes). Method: automated WCAG 2.1 relative-luminance ratio computation with line-level icon/text classification, followed by manual review of every flagged file.

Thresholds: **4.5:1** normal text · **3.0:1** large text and non-text UI (icons, borders, focus rings). Surfaces audited: white cards, `slate-50` canvas, same-family tinted badges (`*-50`), brand constants (login palette, admin navy, status colors).

## Verdict

- 3 failing class/surface combinations (2 of them icon-only usages at the 3:1 bar)
- 6 borderline (within 0.3 of the bar)
- 0 fixed-pair failures (brand/login/status constants)

## Failing + borderline combinations

| Status | Class | Kind | on white | on slate-50 | on *-50 badge | Uses | Example locations |
|---|---|---|---|---|---|---|---|
| FAIL | `text-blue-200` | text | 1.42:1 | 1.36:1 | 1.31:1 | 1 | `src/components/admin/AdminPeoplePage.tsx:244` |
| BORDERLINE | `text-slate-500` | text | 4.76:1 | 4.55:1 | 4.55:1 | 406 | `src/components/admin/AdminAnnouncementsPage.tsx:219`; `src/components/admin/AdminAnnouncementsPage.tsx:262`; `src/components/admin/AdminAnnouncementsPage.tsx:284`; `src/components/admin/AdminAnnouncementsPage.tsx:285` |
| BORDERLINE | `text-red-600` | text | 4.83:1 | 4.62:1 | 4.41:1 | 27 | `src/components/admin/AdminAnnouncementsPage.tsx:269`; `src/components/admin/AdminReleasePage.tsx:126`; `src/components/admin/AdminPeoplePage.tsx:214`; `src/components/admin/AdminEnrollmentPage.tsx:296` |
| BORDERLINE | `text-green-700` | text | 5.02:1 | 4.79:1 | 4.79:1 | 12 | `src/components/portal/RemarksBadge.tsx:28`; `src/components/portal/EnrollmentPage.tsx:313`; `src/components/portal/StudentProfile.tsx:162`; `src/components/portal/StudentProfile.tsx:503` |
| BORDERLINE | `text-amber-700` | text | 5.02:1 | 4.80:1 | 4.84:1 | 25 | `src/components/admin/AdminPeoplePage.tsx:60`; `src/components/admin/AdminEnrollmentPage.tsx:98`; `src/components/admin/AdminDashboardPage.tsx:335`; `src/components/admin/AdminDashboardPage.tsx:398` |
| FAIL | `text-slate-300` | icon | 1.48:1 | 1.42:1 | 1.42:1 | 2 | `src/components/admin/AdminEnrollmentPage.tsx:133`; `src/components/portal/EventsPageParts.tsx:360` |
| FAIL | `text-slate-400` | icon | 2.56:1 | 2.45:1 | 2.45:1 | 43 | `src/components/admin/AdminAnnouncementsPage.tsx:261`; `src/components/admin/AdminReleasePage.tsx:121`; `src/components/admin/AdminPeoplePage.tsx:206`; `src/components/admin/AdminPeoplePage.tsx:252` |
| BORDERLINE | `text-amber-600` | icon | 3.19:1 | 3.04:1 | 3.07:1 | 2 | `src/components/admin/AdminEnrollmentPage.tsx:338`; `src/components/portal/TasksTab.tsx:536` |
| BORDERLINE | `text-green-600` | icon | 3.30:1 | 3.15:1 | 3.15:1 | 2 | `src/components/portal/StudentProfile.tsx:490`; `src/components/auth/BranchRedirect.tsx:99` |

## Fixed pairs (brand constants, login palette, status colors)

| Status | Pair | Ratio | Bar |
|---|---|---|---|
| PASS | white text on admin navy button | 12.78:1 | 4.5:1 |
| PASS | white text on admin navy hover | 15.06:1 | 4.5:1 |
| PASS | login primary text on login canvas | 12.44:1 | 4.5:1 |
| PASS | login muted text on login canvas | 5.38:1 | 4.5:1 |
| PASS | login primary action text on white | 5.77:1 | 4.5:1 |
| PASS | login accent (focus ring) on white | 3.41:1 | 3.0:1 |
| PASS | white text on bg-blue-600 | 5.17:1 | 4.5:1 |
| PASS | white text on bg-blue-700 | 6.70:1 | 4.5:1 |
| PASS | white text on bg-blue-800 | 8.72:1 | 4.5:1 |
| PASS | white text on bg-red-600 | 4.83:1 | 4.5:1 |
| PASS | white text on bg-red-700 | 6.47:1 | 4.5:1 |
| PASS | white text on bg-slate-900 | 17.85:1 | 4.5:1 |

## Passing combinations (summary)

| Class | Kind | on white | on slate-50 | Uses |
|---|---|---|---|---|
| `text-slate-900` | text | 17.85:1 | 17.06:1 | 162 |
| `text-slate-700` | text | 10.35:1 | 9.90:1 | 124 |
| `text-slate-600` | text | 7.58:1 | 7.24:1 | 93 |
| `text-blue-700` | text | 6.70:1 | 6.41:1 | 75 |
| `text-blue-600` | text | 5.17:1 | 4.94:1 | 26 |
| `text-red-700` | text | 6.47:1 | 6.18:1 | 23 |
| `text-emerald-700` | text | 5.48:1 | 5.24:1 | 17 |
| `text-blue-600` | icon | 5.17:1 | 4.94:1 | 14 |
| `text-red-500` | icon | 3.76:1 | 3.60:1 | 10 |
| `text-slate-800` | text | 14.63:1 | 13.98:1 | 10 |
| `text-violet-700` | text | 7.10:1 | 6.79:1 | 10 |
| `text-slate-600` | icon | 7.58:1 | 7.24:1 | 8 |
| `text-red-600` | icon | 4.83:1 | 4.62:1 | 7 |
| `text-slate-500` | icon | 4.76:1 | 4.55:1 | 6 |
| `text-blue-700` | icon | 6.70:1 | 6.41:1 | 5 |
| `text-amber-800` | text | 7.09:1 | 6.78:1 | 4 |
| `text-slate-700` | icon | 10.35:1 | 9.90:1 | 4 |
| `text-blue-950` | text | 14.69:1 | 14.04:1 | 2 |
| `text-emerald-600` | icon | 3.77:1 | 3.60:1 | 2 |
| `text-red-900` | text | 10.02:1 | 9.58:1 | 2 |
| `text-amber-700` | icon | 5.02:1 | 4.80:1 | 1 |
| `text-blue-500` | icon | 3.68:1 | 3.52:1 | 1 |
| `text-blue-900` | text | 10.36:1 | 9.90:1 | 1 |
| `text-cyan-700` | text | 5.36:1 | 5.12:1 | 1 |
| `text-green-700` | icon | 5.02:1 | 4.79:1 | 1 |
| `text-orange-700` | text | 5.18:1 | 4.95:1 | 1 |
| `text-red-700` | icon | 6.47:1 | 6.18:1 | 1 |
| `text-slate-900` | icon | 17.85:1 | 17.06:1 | 1 |
| `text-teal-700` | text | 5.47:1 | 5.23:1 | 1 |

## Manual review annotations (post-fix)

1. `text-blue-200` (AdminPeoplePage:244) — **false positive**: it renders on the active role chip `bg-[#153357]` (navy), where it measures 12.78:1. Passes in context; no change needed.
2. `text-slate-400` icon usages (43) — **decorative exemption**: the design system reserves Faint (#94A3B8) for decorative glyphs that are redundant with an adjacent text label (chevrons, folder glyphs, table status icons). WCAG 1.4.11 exempts decorative elements. Every functional icon button (close, toggle, clear, dismiss) was raised to `text-slate-500` (4.76:1).
3. `text-slate-300` icon usages (2) — decorative chevron separators (enrollment stepper, events day list). Exempt; unchanged.
4. `text-red-600` — passes on its real surfaces (4.83:1 white, 4.62:1 canvas). The 4.41:1 tinted-badge column is hypothetical: no `bg-red-50` + `text-red-600` pair remains (delete-confirm buttons use red-700).
5. Borderline rows (`slate-500`, `green-700`, `amber-700`, `amber-600`/`green-600` icons) all measure at or above their applicable bar on every surface they appear on.
6. Login palette: muted darkened #6B7785 -> #5D6874 (4.32 -> 5.38:1); accent darkened #2F9ED8 -> #2893CF (3.00 -> 3.41:1) with focus indication carried by the #1769AA border change (5.77:1).
7. White-on-emerald text pairs: both remaining instances raised to `bg-emerald-700` (5.30:1). Emerald-600 survives only as bar/dot fills with adjacent labels.

