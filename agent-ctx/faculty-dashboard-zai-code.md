# Task: Faculty Dashboard Shell + Faculty Seed User + Faculty API

**Branch:** `feature/faculty-dashboard`
**Agent:** Z.ai Code (main agent — single agent run)
**Status:** Complete

## Summary

Added a faculty-facing dashboard shell on top of the existing AICS portal.
Faculty users are stored in the same `students` collection as students
(with `role='faculty'`) and reach the new dashboard through the existing
`/portal/{branch}/faculty/{username}` URL pattern. The faculty dashboard
fetches its own data via a new `/api/faculty` endpoint (subjects taught +
enrolled student roster), reuses the existing Topbar / AnnouncementsDeck /
DashboardSkeleton, and shows a "My Subjects" table grouped by code with
per-subject enrolled counts.

## Files Created

| File | Purpose |
|---|---|
| `src/lib/aics/faculty.ts` | Client-side `FacultyMember` and `FacultyStudent` types |
| `src/app/api/faculty/route.ts` | GET endpoint that returns faculty info + subjects taught + enrolled students + branch courses/sessions |
| `src/components/faculty/FacultySidebar.tsx` | Faculty nav sidebar (mirrors student Sidebar.tsx pattern); only Dashboard is enabled, others are "Soon" |
| `src/components/faculty/FacultyDashboard.tsx` | Faculty landing page — hero + stats + "My Subjects" table + announcements deck |

## Files Modified

| File | Change |
|---|---|
| `scripts/seed-mongodb.ts` | Inserted `m.reyes` / `faculty123` faculty user (role='faculty', fullName='Engr. Maria Cristina Reyes') right after the student insertion. Added `Faculty: m.reyes / faculty123` line to the final summary. |
| `src/app/page.tsx` | Imported `FacultyDashboard`. Added a branch at the top of the route-render block: when `route.view === 'dashboard' && route.role === 'faculty'`, render `<FacultyDashboard>` instead of `<StudentDashboard>`. All other views (profile, settings, etc.) fall through to the existing student pages. |

## Key Implementation Notes

### Faculty seed user naming
The faculty member's `fullName` MUST match the `professor` field on the
`subjects` collection rows they teach (the `/api/faculty` query filters
`professor === faculty.fullName`). I used `'Engr. Maria Cristina Reyes'`
which matches the existing CS 101 row in term 1 and the matching entry in
the `professors` collection. The faculty dashboard will therefore show
1 subject (CS 101) and 1 enrolled student (Juan Santos). More subject
assignments can be added by inserting additional `subjects` rows with
`professor: 'Engr. Maria Cristina Reyes'`.

### Faculty API query approach
Subjects in MongoDB are student-scoped (one doc per student per subject).
For faculty we want "every subject enrollment row where this professor
teaches", so we query the `subjects` collection directly with
`{ branch, professor: faculty.fullName }` instead of using the existing
`getSubjectsForStudent` helper (which filters by `studentUsername`).

### FacultySidebar nav items
The `View` type doesn't include `'announcements'`, so the "Announcements"
nav item reuses `'events'` as its `view` value. Since the item is disabled
(coming soon), the value is never reached by the router.

### Page.tsx role narrowing
The condition is `route.view === 'dashboard' && route.role === 'faculty'`
(view check first). This is important because `PortalRoute` is a discriminated
union and only the non-login variants have a `role` field — putting the view
check first narrows the union so TypeScript accepts `route.role`.

### FacultyDashboard data flow
- The faculty member's *basic* info comes via the existing `useStudentData`
  hook (returned as a `Student` object because faculty live in the `students`
  collection). The parent `StudentDataWrapper` passes this `student` down.
- The faculty *dashboard* data (subjects taught + roster) is fetched
  in-band by `FacultyDashboard` via `fetch('/api/faculty?username=...')`.
  While loading, the shared `DashboardSkeleton` is shown so the chrome
  stays visible.

## Verification

```
$ npx eslint src/components/faculty/ src/app/api/faculty/route.ts \
             src/lib/aics/faculty.ts src/app/page.tsx scripts/seed-mongodb.ts
(exit 0 — clean)

$ npx tsc --noEmit
(no errors after filtering out skills/ and FitText)
```

The remaining `bun run lint` errors are pre-existing in
`AnnouncementsWidget.tsx`, `GlobalSearch.tsx`, etc. and are unrelated to
this task (verified by `git stash` on `main` — same 18 errors present).

## Notes for Next Agent

- The faculty seed only teaches CS 101 right now (Juan Santos's term 1
  subject). To make the dashboard look richer, add more `subjects` rows
  in `scripts/seed-mongodb.ts` with `professor: 'Engr. Maria Cristina Reyes'`
  for additional CS 20x courses / sections / students.
- LoginView.tsx was intentionally NOT modified — faculty log in by typing
  `m.reyes` / `faculty123` manually. The existing one-click "Test Student
  Login" button stays as `juan.santos`. If a faculty quick-login button
  is desired later, copy the pattern in `CredentialsForm.tsx` and call
  `onLogin('m.reyes', 'faculty123')`.
- BranchRedirect works for both roles without changes.
- Faculty can navigate to /profile, /settings, etc. — they reuse the
  student pages. The Topbar's profile dropdown and global search work
  unchanged because they take the `student` object.
