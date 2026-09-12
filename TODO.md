# AICS Portal — Project TODO

## Student Portal (current state: functional)

### Done
- [x] Login page (credentials + Face ID mock)
- [x] Dashboard (hero stats, grades table, weekly schedule, today's classes, global search)
- [x] Academics page (grades/subjects/tasks tabs, PDF export, task submit flow)
- [x] Events page (custom calendar, task-due overlay, upcoming rail, category filters)
- [x] Professors page (directory cards with office hours, room, email)
- [x] Enrollment page (step tracker, fee assessment, requirements, registrar)
- [x] Profile page (hero, personal info, digital ID, COE, documents)
- [x] Settings page (profile edit, password change, notification toggles)
- [x] Announcements (MongoDB collection, API, swipeable card deck on dashboard)
- [x] Role-based auth model (student/faculty/admin, role-aware URL routing)
- [x] Skeleton loading states (shimmer animation on all pages)
- [x] Centralized navigation (single `onNavigate` function, no per-page branching)

### Remaining
- [ ] **Mobile responsive** — Remove the phone blocker. Make schedule grid, tasks table, enrollment tracker, and card deck work on phones. This is the last gap before the student portal is complete.
- [x] **Help & Support page** — Shared HelpSupportPage with role-specific FAQs plus IT and registrar contact card. Enabled in nav for every role. Verified in browser as faculty and student.
- [ ] **Dark mode** — The CSS infrastructure exists (`@custom-variant dark`). Wire the theme toggle in the topbar.
- [ ] **Profile photo upload** — Settings page has a placeholder. Needs a file upload endpoint + image storage.
- [x] **Notification system activation** — Section-targeted bell inbox live. Faculty posts fan out to their sections only via POST /api/notifications, admin posts stay on the deck (POST /api/announcements is admin-only), students read and clear in the Topbar bell. Verified in browser with section in and out groups, then test docs deleted.

## Faculty Portal (current state: core tabs live, history is real)

### Remaining
- [ ] **Close the student-teacher interaction loop** — see `docs/student-faculty-interaction-plan.md` and epic #31. Task grading (#32 done 2026-09-12), attendance history wiring (#33), message section (#34, blocked on owner scope decision), upload materials (#35, blocked on owner scope decision), stub cleanup (#36).

### Done
- [x] Faculty seed user (`m.reyes` / `faculty123`, role: faculty)
- [x] Faculty API (`GET /api/faculty?username=`)
- [x] Faculty dashboard shell (hero, stats, My Subjects table, announcements deck)
- [x] Faculty sidebar (Dashboard active, others SOON)
- [x] Role-based routing (faculty gets FacultyDashboard, students get StudentDashboard)

### Next
- [x] **My Students** — Roster view showing all students enrolled in the faculty's subjects. Click a student to see their full record (grades, contact, enrollment status). Needs a faculty-specific route and page component.
- [x] **Grade Encoding** — Editable grade table where faculty inputs midterm/finals grades per student. Needs a PATCH endpoint to update grades in the subjects collection. This is the highest-value faculty feature.
- [x] **Section/room-based My Students** — Per roadmap: accordion per `code|AY|sem` with room, schedule, yearLevel, student roster, click-to-view drawer. Implemented via `useFacultyRows` (`src/lib/aics/use-faculty-rows.ts:85`), branch-scoped, `student.section` as source of truth, `subjects.section` dropped.
- [x] **Per-period grade workflow** — Teacher saves per period as `draft` (teacher only), submits per period as `submitted`, admin releases per period as `released`. Student API checks `prelimStatus`/`midtermStatus`/`finalsStatus` per period (`src/app/api/student/route.ts:39`). `INC` counts as 0 in final math (`src/lib/aics/use-faculty-rows.ts:47`). `2026-2027 1st Sem` seeded as `INC` with no status.
- [x] **Shared faculty rows hook** — `src/lib/aics/use-faculty-rows.ts` centralizes `sections`/`enrichedStudents`/`gradeRows` + `computedFinalINCasZero`; both My Students and Grade Encoding use it (removes duplicate rebuilds).
- [x] **Real audit log** — `grade_audits` collection (`src/lib/mongodb/types.ts:110`) written on `PATCH /api/grades/update`, `POST /api/grades/submit`/`release`; read via `GET /api/grades/audits` (`src/app/api/grades/audits/route.ts:1`). Index on `branch, subjectCode, studentUsername, performedAt`. Human-readable history drawer now live (was API-only).
- [x] **Auth guard on grade writes** — `performedBy` must be `faculty` (update/submit) or `admin` (release) in same `branch`; 403 otherwise (`src/app/api/grades/update/route.ts:18`).
- [x] **Faculty teaches more subjects** — `m.reyes` now teaches CS 101 (26), CS 102 (24), CS 201 (22) plus CS 208/209 for demo students (78 rows for `2026-2027`).
- [x] **Small history drawer** — API `GET /api/grades/audits` + slide-over per student per subject in `FacultyGradeEncodingPage` (`History` button per row, fetches `branch`/`subjectCode`/`studentUsername`, shows plain English `m.reyes saved Prelim from INC to 85 for Juan...`). Added `History` column, `AnimatePresence` drawer. `My Students` drawer remains simple by design.
- [x] **Hide Dropped/Transferred in Grade Encoding** — `useFacultyRows` + `Grade Encoding` filtered out `enrollmentStatus` `dropped`/`transferred` (kept visible in My Students). Header shows `X hidden (Dropped/Transferred)` count.
- [x] **My Students sorting + shared styling** — Sortable `Student`/`Student #`/`Prelim` headers with `↑`/`↓` (`src/components/faculty/FacultyStudentsPage.tsx:274`), `INC` sorts last, dropdowns unified to `My Students` look (`h-10` `rounded-xl` `font-medium` with `ChevronDown`) for both `My Students` and `Grade Encoding`/`Previous Records` (verified build). Grade Encoding search now `h-10` to match dropdown.
- [x] **Unified portal shell** — One `PortalShell` (`src/components/portal/PortalShell.tsx`) plus one nav config (`src/lib/aics/nav-config.ts`) for student and faculty. Fixed settings rendering the student sidebar for faculty and the `lg:pl-64` vs `lg:pl-60` drift. New tabs only touch nav config, routes, and one page component.
- [x] **Announcement deck layering** — Deck cards capped at z 3/2/1 inside an `isolate` wrapper so scrolling cards slide under the sticky Topbar (z-20) on student and faculty dashboards. Z-index scale documented in `PortalShell`.
- [x] **Deck dismissal persistence plus drag** — Reads persist per user in nnouncement_reads, so dismissed cards stay gone across refreshes and the caught-up screen sticks. Drag-to-dismiss works with reduced motion on, verified mid-drag in browser with the READ stamp showing.
- [x] **Previous Records backend** — Live GET /api/faculty/history groups released rows by term, drops the current term, flags current vs former holders. Page wires search, year, assignment filters, CSV export, read-only View drawer, and live summary counts. History is lifted into the wrapper and fetched at most once per session, so tab revisits render instantly with no refetch (verified: one request across two visits). Released CS 105 seed term included.
- [x] **Grade release UI** — Admin seed (dmin / dmin123) plus release queue page (src/components/admin/AdminReleasePage.tsx). Pending-groups endpoint (GET /api/grades/release) lists submitted periods with counts. Release requires performedBy and admin role. Full flow verified in browser on scratch data: draft to submitted to released to student-visible, then scratch removed.
- [x] **Redesign My Students follow-up — pagination plus attendance** — Roster pages at 25 per expanded section with pager, page resets on filter or sort change. Take attendance is real: per-section modal with date picker, present or absent toggles, POST /api/attendance (faculty-only, branch-scoped, unique per section plus date). Verified in browser on a test date, then the test session was deleted. Message section plus Upload materials, Announce quiz, Attendance history, In/Out log stay stubs.
- [x] **Announcements (write side)** — Admin posts to the deck via POST /api/announcements (admin-only). Faculty notify sections via POST /api/notifications with per-section checkboxes, nothing checked by default, Select All included. Form left, sent history right. Verified in browser, then test docs deleted.
- [x] **Schedule** — FacultySchedulePage reuses ScheduleGrid filtered to the faculty member’s session codes. Verified in browser: only her classes render.
- [x] **Task management** — POST /api/tasks fans out one doc per enrolled student, PATCH /api/tasks flips submissionsClosed, GET /api/faculty/tasks groups by assignment. FacultyTasksPage posts and toggles. Verified in browser: posted to 3 students, closed renders as Missing on the student side, then test docs deleted.
- [x] **SubmissionsClose toggle** — Close and Reopen buttons per task group, wired to the same PATCH endpoint.
- [x] **Faculty identity cleanup** — Profile hides COE, documents, Digital ID, GPA stats, and Year plus Section for faculty, showing department facts instead. Topbar and profile hero read Faculty plus ID number. Dashboard subjects table filters to the current term. Verified in browser for both roles.
- [x] **Prefetch plus instant tabs plus shared transition plus search RBAC** — History and task groups prefetch at portal load, so first tab visits render with zero new requests. One fade-up transition lives in the shell for every tab. GlobalSearch is role-aware: faculty see their pages, subjects, roster, and tasks only, students keep their index, admins get pages only.

## Admin Portal (not started)

### Planned
- [x] Admin seed user (role: admin) — seeded as dmin / dmin123, release queue page live as the first admin screen.
- [ ] Admin dashboard (school-wide stats: enrollment counts, GPA distribution, branch overview)
- [ ] Manage events (CRUD for the events collection)
- [ ] Manage announcements (CRUD for announcements)
- [ ] Manage professors directory (CRUD for professors collection)
- [ ] View all students/faculty across branches
- [ ] Enrollment management (override step tracker, post payments)

## Infrastructure

### Done
- [x] MongoDB connection (Atlas, lazy singleton, branch-scoped)
- [x] Seed script (auto-loads .env.local via dotenv)
- [x] Vercel deployment (build script fixed, Analytics + Speed Insights)
- [x] .gitignore cleanup (removed .next/, build artifacts, agent folders)
- [x] Code quality (fallow health: maintainability 92.0, duplication 6.1%)

### Remaining
- [ ] **Password hashing** — Currently plaintext. Use bcrypt before production.
- [ ] **Session tokens** — Currently localStorage only. Consider JWT or server sessions for security.
- [ ] **Rate limiting** — No rate limiting on API routes. Add before production.
- [ ] **Input validation** — API endpoints accept raw input. Add Zod schemas.
- [ ] **Error boundaries** — Add React error boundaries to prevent full-page crashes.
- [ ] **CI/CD** — Add GitHub Actions for lint + typecheck on PRs.
- [ ] **Environment configs** — Separate .env for dev/staging/production.

## Design Polish

### Remaining
- [ ] **Superdesign integration** — Design system .md and replica HTML files exist in `.superdesign/`. Use the Superdesign CLI to generate improved UI drafts for the profile and dashboard pages.
- [ ] **Consistent empty states** — Some pages show plain text, others use icon + message. Standardize.
- [ ] **Table responsiveness** — Grade tables, task tables, and subject tables overflow on mobile. Need horizontal scroll or card layout.
- [ ] **Color contrast audit** — Run WCAG AA check on all text/background combinations.
