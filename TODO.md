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
- [ ] **Help & Support page** — FAQ + IT contact form. Last disabled sidebar item.
- [ ] **Dark mode** — The CSS infrastructure exists (`@custom-variant dark`). Wire the theme toggle in the topbar.
- [ ] **Profile photo upload** — Settings page has a placeholder. Needs a file upload endpoint + image storage.
- [ ] **Notification system activation** — Settings page has toggles for email/SMS/event/task notifications. These are local-only. Needs a backend notifications service to actually send alerts.

## Faculty Portal (current state: shell only)

### Done
- [x] Faculty seed user (`m.reyes` / `faculty123`, role: faculty)
- [x] Faculty API (`GET /api/faculty?username=`)
- [x] Faculty dashboard shell (hero, stats, My Subjects table, announcements deck)
- [x] Faculty sidebar (Dashboard active, others SOON)
- [x] Role-based routing (faculty gets FacultyDashboard, students get StudentDashboard)

### Next
- [x] **My Students** — Roster view showing all students enrolled in the faculty's subjects. Click a student to see their full record (grades, contact, enrollment status). Needs a faculty-specific route and page component.
- [x] **Grade Encoding** — Editable grade table where faculty inputs midterm/finals grades per student. Needs a PATCH endpoint to update grades in the subjects collection. This is the highest-value faculty feature.
- [ ] **Redesign My Students as section/room-based view** — Per the project roadmap, teachers should see students organized by their assigned rooms/classes, not a flat list. Each section should show: room number, schedule, student roster, with click-to-view student detail. Current implementation is a flat table — needs accordion or card-per-section layout.
- [ ] **Grade approval workflow** — Per the project roadmap: (1) Teacher saves grades as "draft" (only visible to teacher), (2) Teacher submits all grades for a subject (status: "submitted"), (3) Admin reviews and releases (status: "released"), (4) Only "released" grades are visible to students. Currently grades save directly and are immediately visible to students. Needs: `gradeStatus` field on subjects collection, submit/release API endpoints, status badges on the grade encoding page, student API filtering by `gradeStatus === 'released'`.
- [ ] **Faculty teaches more subjects** — Seed data only has m.reyes teaching CS 101 (1st Year). Add more subjects where m.reyes teaches 2nd Year classes so the grade encoding page and My Students show more data.
- [ ] **Announcements (write side)** — Form where faculty can create new announcements. Needs a POST `/api/announcements` endpoint and a create-announcement UI. Faculty and admin only.
- [ ] **Schedule** — Faculty's weekly calendar. Reuses ScheduleGrid filtered to their sessions only.
- [ ] **Task management** — Faculty can create tasks for their subjects (the write side of the existing tasks system). Needs POST/PATCH/DELETE endpoints.
- [ ] **SubmissionsClose toggle** — Faculty can close submissions on individual tasks (the `submissionsClosed` field already exists in the schema, but there's no UI to toggle it).

## Admin Portal (not started)

### Planned
- [ ] Admin seed user (role: admin)
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
