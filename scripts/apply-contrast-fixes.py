#!/usr/bin/env python3
"""
Applies the WCAG AA contrast fixes identified by scripts/wcag-contrast-audit.py.

Every replacement is asserted against an exact expected string + occurrence
count so a drifted codebase fails loudly instead of silently mis-editing.

Run from repo root: python3 scripts/apply-contrast-fixes.py
"""

import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
os.chdir(ROOT)

FIXES = [
    # (file, old, new, expected_count)
    # --- admin announcements ---
    ('src/components/admin/AdminAnnouncementsPage.tsx',
     '<p className="text-xs text-slate-400">{a.author}</p>',
     '<p className="text-xs text-slate-500">{a.author}</p>', 1),
    ('src/components/admin/AdminAnnouncementsPage.tsx',
     '<span className="text-xs text-slate-400">No expiry</span>',
     '<span className="text-xs text-slate-500">No expiry</span>', 1),
    ('src/components/admin/AdminAnnouncementsPage.tsx',
     'font-normal text-slate-400">(optional',
     'font-normal text-slate-500">(optional', 1),
    ('src/components/admin/AdminAnnouncementsPage.tsx',
     "'text-red-600 hover:bg-red-50'",
     "'text-red-700 hover:bg-red-50'", 1),
    # --- admin people ---
    ('src/components/admin/AdminPeoplePage.tsx',
     'text-xs text-slate-400">\u2014<',
     'text-xs text-slate-500">\u2014<', 1),
    ('src/components/admin/AdminPeoplePage.tsx',
     "roleFilter === key ? 'text-blue-200' : 'text-slate-400'",
     "roleFilter === key ? 'text-blue-200' : 'text-slate-500'", 1),
    ('src/components/admin/AdminPeoplePage.tsx',
     'text-[11px] text-slate-400 tabular-nums',
     'text-[11px] text-slate-500 tabular-nums', 1),
    # --- admin enrollment ---
    ('src/components/admin/AdminEnrollmentPage.tsx',
     "'bg-slate-100 text-slate-400'",
     "'bg-slate-100 text-slate-600'", 2),
    ('src/components/admin/AdminEnrollmentPage.tsx',
     'text-slate-400', 'text-slate-500', None),  # remaining text spots (9)
    ('src/components/admin/AdminEnrollmentPage.tsx',
     'text-emerald-600">completed',
     'text-emerald-700">completed', 1),
    ('src/components/admin/AdminEnrollmentPage.tsx',
     'bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700',
     'bg-emerald-700 text-white text-sm font-semibold hover:bg-emerald-800', 1),
    # --- admin dashboard ---
    ('src/components/admin/AdminDashboardPage.tsx',
     'text-slate-400">({pct}%)',
     'text-slate-500">({pct}%)', 1),
    ('src/components/admin/AdminDashboardPage.tsx',
     'text-xs text-slate-400 font-mono',
     'text-xs text-slate-500 font-mono', 1),
    ('src/components/admin/AdminDashboardPage.tsx',
     'text-slate-400 text-xs">\u2014<',
     'text-slate-500 text-xs">\u2014<', 1),
    ('src/components/admin/AdminDashboardPage.tsx',
     "deans ? 'bg-emerald-500' : 'bg-blue-600'",
     "deans ? 'bg-emerald-600' : 'bg-blue-600'", 1),
    ('src/components/admin/AdminDashboardPage.tsx',
     'bg-emerald-500" />', 'bg-emerald-600" />', 1),
    ('src/components/admin/AdminDashboardPage.tsx',
     'font-semibold text-emerald-600 tabular-nums',
     'font-semibold text-emerald-700 tabular-nums', 1),
    # --- admin professors ---
    ('src/components/admin/AdminProfessorsPage.tsx',
     'text-[11px] text-amber-600',
     'text-[11px] text-amber-700', 1),
    ('src/components/admin/AdminProfessorsPage.tsx',
     "'text-red-600 hover:bg-red-50'",
     "'text-red-700 hover:bg-red-50'", 1),
    # --- admin events ---
    ('src/components/admin/AdminEventsPage.tsx',
     'text-xs text-slate-400 tabular-nums',
     'text-xs text-slate-500 tabular-nums', 1),
    ('src/components/admin/AdminEventsPage.tsx',
     'font-normal text-slate-400">(optional',
     'font-normal text-slate-500">(optional', 2),
    ('src/components/admin/AdminEventsPage.tsx',
     "'text-red-600 hover:bg-red-50'",
     "'text-red-700 hover:bg-red-50'", 1),
    # --- admin release ---
    ('src/components/admin/AdminReleasePage.tsx',
     'bg-emerald-600 text-white hover:bg-emerald-700',
     'bg-emerald-700 text-white hover:bg-emerald-800', 1),
    # --- portal ---
    ('src/components/portal/EventsPageParts.tsx',
     'text-amber-600', 'text-amber-700', 1),
    ('src/components/portal/StudentIdCard.tsx',
     'text-red-500', 'text-red-600', 1),
    ('src/components/portal/TasksTab.tsx',
     'text-amber-500', 'text-amber-600', 1),
    ('src/components/portal/TasksTab.tsx',
     'text-slate-400 flex-shrink-0 transition-transform',
     'text-slate-500 flex-shrink-0 transition-transform', 1),
    ('src/components/portal/TasksTab.tsx',
     'text-slate-400 hover:bg-slate-100 hover:text-slate-900',
     'text-slate-500 hover:bg-slate-100 hover:text-slate-900', None),
    ('src/components/portal/AnnouncementsWidget.tsx',
     'text-slate-400 hover:bg-white/50 hover:text-slate-600',
     'text-slate-500 hover:bg-white/50 hover:text-slate-600', 2),
    ('src/components/portal/SettingsPage.tsx',
     'text-slate-400', 'text-slate-500', 3),
    ('src/components/portal/SettingsPage.tsx',
     'text-red-600 border border-red-200',
     'text-red-700 border border-red-200', 1),
    ('src/components/portal/GlobalSearch.tsx',
     'text-slate-400 hover:text-slate-700',
     'text-slate-500 hover:text-slate-700', 1),
    # --- faculty ---
    ('src/components/faculty/FacultyGradeEncodingPage.tsx',
     'text-amber-600', 'text-amber-700', 1),
    ('src/components/faculty/FacultyGradeEncodingPage.tsx',
     'text-slate-400 hover:bg-slate-100 hover:text-slate-900',
     'text-slate-500 hover:bg-slate-100 hover:text-slate-900', 1),
    ('src/components/faculty/AttendanceModal.tsx',
     'text-slate-400 hover:bg-slate-100 hover:text-slate-900',
     'text-slate-500 hover:bg-slate-100 hover:text-slate-900', 1),
    ('src/components/faculty/FacultyStudentsPage.tsx',
     'text-slate-400 hover:bg-slate-100 hover:text-slate-900',
     'text-slate-500 hover:bg-slate-100 hover:text-slate-900', None),
    ('src/components/faculty/FacultyPreviousRecordsPage.tsx',
     'text-slate-400 hover:bg-slate-100 hover:text-slate-900',
     'text-slate-500 hover:bg-slate-100 hover:text-slate-900', 1),
    # --- error pages ---
    ('src/app/error.tsx',
     'font-mono text-xs text-slate-400',
     'font-mono text-xs text-slate-500', 1),
    ('src/app/portal/error.tsx',
     'font-mono text-xs text-slate-400',
     'font-mono text-xs text-slate-500', 1),
    # --- auth ---
    ('src/components/auth/FaceIdPanel.tsx',
     'text-red-400', 'text-red-600', 1),
    ('src/components/portal/EnrollmentPage.tsx',
     'text-red-300', 'text-red-500', 1),
    # --- task status icon map (icons on 100-tint circles) ---
    ('src/lib/aics/tasks.ts',
     "GRADED: 'bg-green-100 text-green-600'",
     "GRADED: 'bg-green-100 text-green-700'", 1),
    ('src/lib/aics/tasks.ts',
     "PENDING: 'bg-amber-100 text-amber-600'",
     "PENDING: 'bg-amber-100 text-amber-700'", 1),
    ('src/lib/aics/tasks.ts',
     "MISSING_OPEN: 'bg-red-100 text-red-600'",
     "MISSING_OPEN: 'bg-red-100 text-red-700'", 1),
    ('src/lib/aics/tasks.ts',
     "NEEDS_ATTENTION: 'bg-blue-100 text-blue-600'",
     "NEEDS_ATTENTION: 'bg-blue-100 text-blue-700'", 1),
]

# ---------------------------------------------------------------
# login tokens: pick AA-compliant values programmatically
# ---------------------------------------------------------------
def _lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

def lum(h):
    h = h.lstrip('#')
    r, g, b = (int(h[i:i+2], 16) for i in (0, 2, 4))
    return 0.2126 * _lin(r) + 0.7152 * _lin(g) + 0.0722 * _lin(b)

def ratio(fg, bg):
    l1, l2 = lum(fg), lum(bg)
    if l1 < l2:
        l1, l2 = l2, l1
    return (l1 + 0.05) / (l2 + 0.05)

CANVAS = '#F7F9FB'
muted_new, accent_new = None, None
for cand in ['#5D6874', '#5A6572', '#57626E', '#545F6B']:
    if ratio(cand, CANVAS) >= 4.55 and ratio(cand, '#FFFFFF') >= 4.55:
        muted_new = cand
        break
for cand in ['#2893CF', '#2489C9', '#2182C2']:
    if ratio(cand, '#FFFFFF') >= 3.1:
        accent_new = cand
        break
assert muted_new and accent_new, 'no AA-compliant token found'
print(f'login tokens: muted #6B7785 -> {muted_new} ({ratio(muted_new, CANVAS):.2f}:1 on canvas), '
      f'accent #2F9ED8 -> {accent_new} ({ratio(accent_new, "#FFFFFF"):.2f}:1 on white)')

FIXES.append(('src/components/auth/login-tokens.ts',
              "muted: '#6B7785', // secondary text / icons",
              f"muted: '{muted_new}', // secondary text / icons (AA: {ratio(muted_new, CANVAS):.2f}:1 on bg)", 1))
FIXES.append(('src/components/auth/login-tokens.ts',
              "accent: '#2F9ED8', // small accents, focus ring, scan line",
              f"accent: '{accent_new}', // small accents, focus ring, scan line (3:1+ on white)", 1))

# ---------------------------------------------------------------
# apply
# ---------------------------------------------------------------
failed = []
for path, old, new, expected in FIXES:
    try:
        s = open(path, encoding='utf-8').read()
    except FileNotFoundError:
        failed.append(f'MISSING FILE {path}')
        continue
    n = s.count(old)
    if n == 0:
        failed.append(f'NOT FOUND in {path}: {old[:70]}')
        continue
    if expected is not None and n != expected:
        failed.append(f'COUNT MISMATCH in {path}: {old[:60]} found {n}, expected {expected}')
        continue
    open(path, 'w', encoding='utf-8').write(s.replace(old, new))
    print(f'OK {path}: {n}x  {old[:52]} -> {new[:52]}')

if failed:
    print('\nFAILURES:')
    for f in failed:
        print(' -', f)
    sys.exit(1)
print('\nAll contrast fixes applied cleanly.')
