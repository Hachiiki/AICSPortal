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
- [x] **Mobile responsive** — Phone blocker was already removed (8a0caff, #17). Sidebar drawer, schedule grid horizontal scroll, tasks/grades table scroll containers, mobile vertical enrollment tracker, and the swipeable card deck were already in place. Remaining real gaps fixed: the Academics mini-tab switcher (382px) and Settings section tabs overflowed the 375px viewport — both now scroll horizontally inside a clipped container with no visible scrollbar (d9420a8, 9af5119). Every student page verified at 375px with zero page-level overflow: login, dashboard, academics all four tabs, events, enrollment, professors, profile, settings, help.
- [x] **Help & Support page** — Shared HelpSupportPage with role-specific FAQs plus IT and registrar contact card. Enabled in nav for every role. Verified in browser as faculty and student.
- [ ] **Dark mode** — The CSS infrastructure exists (`@custom-variant dark`). Wire the theme toggle in the topbar. Deferred by owner (2026-10-14) — do not start until picked up explicitly.
- [x] **Profile photo upload** — Settings has a real uploader: browser square-crops/downscales to a 512px JPEG, uploads direct to Cloudinary with a server-signed signature (POST /api/student/photo, folder `aics-portal/photos/<branch>/<username>`, identity from session, never client input), saves via PATCH /api/student/update, then fire-and-forget destroys the replaced asset (POST /api/student/photo/cleanup, folder-prefix scoped). DELETE /api/student/photo removes and clears. Avatars render in Topbar, profile hero, and ID card; useStudentData's patchStudent merges photoUrl live so every avatar updates without a remount. Works for faculty too (same students collection). Verified 30/30 by scripts/verify-photo-upload.sh (local mongod + prod server + browser flow; evidence in docs/done/qa_evidence/ui-ux/photo-0*.png).
- [x] **Notification system activation** — Section-targeted bell inbox live. Faculty posts fan out to their sections only via POST /api/notifications, admin posts stay on the deck (POST /api/announcements is admin-only), students read and clear in the Topbar bell. Verified in browser with section in and out groups, then test docs deleted.

## Faculty Portal (current state: core tabs live, history is real)

### Remaining
- [ ] **Close the student-teacher interaction loop** — see `docs/student-faculty-interaction-plan.md` and epic #31. Task grading (#32 done 2026-09-12), attendance history wiring (#33 done 2026-09-12), message section (#34 done 2026-09-12 as notification reuse), upload materials (#35 done 2026-09-12 as Cloudinary + link fallback), stub cleanup (#36 done 2026-09-12).

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

## Admin Portal (core surfaces live)

### Done
- [x] Admin seed user (role: admin) — seeded as dmin / dmin123, release queue page live as the first admin screen.
- [x] **Admin dashboard** — GET /api/admin/stats aggregates every collection across all branches (read-only): totals, enrollment counts by status/year/program, GPA distribution over released final grades (PH 1.00-best scale, dean's lister cutoff 1.75), fee collection status, per-branch overview, upcoming events, and recent announcements. Dashboard renders clickable stat cards, CSS bar charts, and the branch table. Admin routing is per-view now (dashboard / release-queue / shared settings-help-profile), URLs reuse the student words scoped by the role segment.
- [x] **Manage events** — POST/PATCH/DELETE /api/events (admin-session-gated, branch-scoped). PATCH merges onto the existing doc so start/end ranges stay coherent; endDate null clears back to single-day. Manage page: category + upcoming/past filters, add/edit modal, two-click delete.
- [x] **Manage announcements** — GET ?all=1 lists every post including expired (admin-only); PATCH edits mutable fields with author/postedDate frozen; DELETE removes the post plus its announcement_reads markers. Manage page with active/expired filters, urgent badges, dimmed expired rows.
- [x] **Manage professors** — POST/PATCH/DELETE /api/professors with duplicate-name 409s and per-field validation. Edit modal warns when a rename would sever the subject.professor join; deletions only remove the directory card.
- [x] **View all students/faculty across branches** — GET /api/admin/people lists every account school-wide with passwords/tokenVersion projected out. Directory page with role chips (77 accounts), branch dropdown, search, sortable columns, 25-per-page pager.
- [x] **Enrollment management** — GET /api/admin/enrollment lists records joined with student identity plus a no-record count. PATCH overrides the step tracker (statuses recompute exactly as the student tracker renders). POST posts payments capped at the remaining balance, updates the assessment aggregate, and appends to a payments[] audit trail (typed in mongodb/types.ts). Manage page: summary strip, override modal with live preview, payment modal with full-balance shortcut, full-record view with payment history.
- [x] **Verification** — scripts/verify-admin-portal.sh runs the whole surface in one invocation (57/57 passing): auth gates on every endpoint, CRUD cycles, override/payment semantics, browser flows for every page, and zero page-level overflow at 375px on all seven admin pages (evidence in docs/done/qa_evidence/ui-ux/admin-*.png).

### Remaining
- [ ] **Bulk actions** — e.g. select multiple announcements to delete, CSV export of the people directory.

## Infrastructure

### Done
- [x] MongoDB connection (Atlas, lazy singleton, branch-scoped)
- [x] Seed script (auto-loads .env.local via dotenv)
- [x] Vercel deployment (build script fixed, Analytics + Speed Insights)
- [x] .gitignore cleanup (removed .next/, build artifacts, agent folders)
- [x] Code quality (fallow health: maintainability 92.0, duplication 6.1%)

### Done
- [x] **Password hashing** — scrypt (Node crypto, no new deps) with `scrypt$salt$hash` storage, hash-on-login upgrades for legacy docs, and change-password always hashing. Bulk rehash of the dev DB executed 2026-10-15 (76 legacy accounts, 13/13 checks; encrypted backup + key retained in db/backups/). Seeds hash at birth. Production run remains owner-gated: docs/password-rehash-runbook.md has the full procedure.
- [x] **Input validation (2026-10-15)** — Zod on every route. src/lib/validation.ts (parseBody/parseQuery + shared schemas) is the single entry point; all 28 API route files converted; unknown keys stripped; operator objects can never reach Mongo filters; HttpError re-thrown so 400s stop masking as 500s. Hardening notes: garbage grade periods no longer fall through to release-ALL; audits ?limit can't leak NaN.
- [x] **Error boundaries (2026-10-15)** — full stack: in-shell ErrorBoundary per view (retry card, shell stays alive, resetKey resets on navigation), portal segment error.tsx, root error.tsx, global-error.tsx (own html/body), not-found.tsx. Verified in-browser with a real injected crash: 14/14 (dev-branch QA pass; evidence retained on the development branch).
- [x] **CI/CD (2026-10-15)** — workflow authored at docs/ci-workflow.yml — lint + typecheck on PRs/pushes to main and main-full-dev (bun toolchain); ONE OWNER STEP remains: create .github/workflows/ci.yml from it via the GitHub web UI (the repo API token lacks the workflow scope to push it). tsconfig/eslint scoped to real source (sandbox dirs excluded); react-hooks v6 perf heuristics downgraded to warnings with rationale; typecheck script added; BUG-016 closed — ignoreBuildErrors:false, type errors now fail builds (verified with production build).
- [x] **Environment configs (2026-10-15)** — src/lib/env.ts classifies development/staging/production (APP_ENV > VERCEL_ENV > NODE_ENV). Staging (Vercel Preview) requires AUTH_SECRET and defaults MONGODB_DB to aics_portal_staging — previews can never silently write production data. DevBanner is env-aware (production: none). example.env.local rewritten as the canonical template; docs/environments.md has the full matrix. One boot diagnostic per process logs env+db.

### Remaining
- [ ] **Production password rehash** — owner-gated window; runbook ready (docs/password-rehash-runbook.md). Hash-on-login converts accounts organically meanwhile.
- [ ] **Rate limiting** — login + change-password have in-memory fixed-window throttles (BUG-013); no general API rate limiting. Revisit before scaling beyond one node.

## Design Polish

### Remaining
- [ ] **Superdesign integration** — Design system .md and replica HTML files exist in `.superdesign/`. Use the Superdesign CLI to generate improved UI drafts for the profile and dashboard pages.
- [ ] **Consistent empty states** — Some pages show plain text, others use icon + message. Standardize.
- [ ] **Table responsiveness** — Grade tables, task tables, and subject tables overflow on mobile. Need horizontal scroll or card layout.
- [ ] **Color contrast audit** — Run WCAG AA check on all text/background combinations.
