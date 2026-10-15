# Faculty portal build plan

Detailed implementation plan for `docs/faculty-roadmap.md`. Phases run in order because each one unlocks the next. All reads stay branch-scoped, all writes keep the existing auth-guard and audit pattern.

Cross-cutting rules for every phase are at the bottom. Verification loop per phase: `npm run lint` clean on touched files, `npx tsc --noEmit`, `npm run build`, browser capture of the touched screens, commit without pushing.

## Phase 1: grade release UI

Why first: submitted grades stall forever without it, and Previous Records needs released data to show anything.

### 1a. Admin seed user

- File: `scripts/seed-mongodb.ts`, next to the `m.reyes` insert around line 400.
- Add one admin doc in `students`: username `admin`, role `admin`, same branch, known dev password. Guard it the same way the script guards live grades. Never wipe existing admin docs on reseed.
- Acceptance: login as admin routes to a working session. Role plumbing already handles `admin` in `use-portal-route.ts`.

### 1b. Release screen

- New component: `src/components/admin/AdminReleasePage.tsx`. Keep it plain: one table of submitted periods grouped by subject code, term, and period, with counts. One release button per row plus one release-all-per-subject button.
- Data: new `GET` on the release route file or a small `GET /api/grades/pending?username=` returning submitted groups with counts. Reuse the query shapes in `src/app/api/grades/release/route.ts:27`.
- Writes go through the existing `POST /api/grades/release` unchanged. Body already supports per-period and all-period release.
- Route: admin sees the release page at their dashboard or a dedicated view. Do not reuse faculty grade encoding for this. Admin and faculty actions must stay visually distinct because the audit log records `performedBy`.
- Harden while here: the release route only checks the admin role when `performedBy` is present (`route.ts:17`). Make `performedBy` required and reject missing values with 403.
- Acceptance: faculty submits a period, admin sees exactly that group with the right count, releases it, student view shows the period, audit log gains one `release` row per student subject with the admin username.
- Edge cases: releasing an already-released group changes nothing and reports zero. Partial periods release independently. Never touch other branches.

## Phase 2: real Previous Records

Why second: needs released data from phase 1 plus one released seed term.

### 2a. History endpoint

- New: `GET /api/faculty/history?username=` in `src/app/api/faculty/history/route.ts`.
- Steps inside: load faculty by username, find `subjects` where `branch` matches and `professor === faculty.fullName`, keep rows where all three per-period statuses are released or `gradeStatus` is released. Group by academic year then semester. Exclude the current term. Never include draft or submitted rows.
- Professor-switch detection: for each code in history, check whether any row for the same code and term names a different professor. Mark sections `current` or `former` and attach the current professor name for former ones.
- Shape per section: code, title, room, schedule, yearLevel, enrolled count, class average over numeric finals, assignment flag, current professor note.
- Index: add `{ branch: 1, professor: 1, academicYear: 1, semester: 1 }` on `subjects` next to the existing audit index.
- Acceptance: response for `m.reyes` groups correctly, counts match the database, no current-term rows, no unreleased rows, branch filter holds.

### 2b. Page rewrite

- File: `src/components/faculty/FacultyPreviousRecordsPage.tsx`. Keep layout, filters, and styling. Replace the `previousRecords` const with a fetch to the new endpoint keyed on username.
- Wire the three dead controls: export CSV builds from fetched rows the same way My Students exports, View opens a read-only section drawer showing roster counts and averages, summary chips compute from fetched data.
- Loading state stays `DashboardSkeleton`. Empty state: plain message naming the cause, no released history for this professor yet.
- Acceptance: year filter, assignment filter, search, export, and View all work against live data. Selecting AY 2026-2027 shows nothing because it is the current term.

### 2c. Seed

- File: `scripts/seed-mongodb.ts`. Add one released prior term for `m.reyes`, small roster, numeric grades, all per-period statuses released. Keep the existing guard that protects live grades. Keep every other seed row exactly as is.
- Acceptance: fresh seed shows real rows on Previous Records and the student view shows those released periods.

## Phase 3: My Students follow-up

Why third: independent of phases 1 and 2, first real interactivity win in the roster.

- Pagination: page through sections with 25 or more students inside `FacultyStudentsPage.tsx`. Page state lives with the existing filter state so search plus status filter plus page compose. Reset page on filter change.
- Attendance first: new `attendance` collection, one doc per section session with present or absent per username. Minimal UI: Take attendance button opens the section roster with toggles and a save action. New endpoints `GET` and `POST /api/attendance`, branch-scoped, faculty-only writes using the grade-write guard pattern.
- Leave Message section, Upload materials, Announce quiz, Attendance history, and In/Out log as stubs until their backends exist.
- Acceptance: large roster pages cleanly, saved attendance reloads identically, writes from another branch or role get 403.

## Phase 4: announcements write side

Why fourth: needs the faculty-or-admin guard pattern once, then schedule and tasks copy it.

- New: `POST /api/announcements`, faculty and admin only, same guard shape as `src/app/api/grades/update/route.ts:18`. Validate title, body, category against `ANNOUNCEMENT_STYLES` keys.
- UI: create form reachable from the faculty dashboard. Fields: title, body, category, priority. On success the new card appears in both decks without a reload.
- Enable the Announcements nav item for faculty in `src/lib/aics/nav-config.ts` only when both endpoint and form ship together.
- Acceptance: faculty post renders in student and faculty decks, author recorded, other roles get 403 on POST.

## Phase 5: schedule and tasks

Why last: both are read-filter plus create flows with no cross dependencies.

- Schedule: filter the existing schedule query to the faculty member's sessions only, render with `ScheduleGrid`. Enable the Schedule nav item for faculty.
- Tasks: faculty create flow for their subjects, plus the `submissionsClosed` toggle per task. Endpoints `POST`, `PATCH /api/tasks`, faculty-scoped to their subject codes.
- Acceptance: no disabled sidebar entries remain in the faculty portal. Every button on these two screens does something real.

## Faculty identity cleanup

Small batch, fits any time after phase 2. Profile hides COE, documents, and enrollment copy for faculty. Settings and Topbar show the faculty identifier instead of `studentNumber`. Dashboard My Subjects filters to the current term. Acceptance: no student-only text or numbers on any faculty screen, verified by clicking every faculty tab in the browser.

## Cross-cutting rules

- Branch scoping: every query filters by `branch`. Every new endpoint test includes a cross-branch read and a cross-branch write, both denied or empty.
- Auth: faculty-only writes check role faculty in the same branch, admin-only checks role admin. `performedBy` is required, never optional.
- Audit: every grade state change writes `grade_audits` with branch, student, code, term, period, old value, new value, action, performer, timestamp.
- Shell: new screens render inside `PortalShell`. New tabs touch only the `View` type, `use-portal-route.ts`, `nav-config.ts`, and one page component.
- Layering: page content stays under Topbar z-20. Stacked widgets wrap in `isolate` with single-digit internal z. Fixed overlays above the Topbar are intentional and documented at the call site.
- Seed safety: reseed never wipes live grades, users, or audit rows. New seed blocks follow the existing guard pattern.
- Verification per phase: lint clean on touched files, typecheck, production build, browser login as student plus faculty, screenshot plus scrolled state for changed screens, commit without pushing unless asked.
