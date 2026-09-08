# Faculty portal roadmap

Sequenced build order for the faculty portal. Each phase unlocks the next. Status marked as phases land.

## Phase 1: grade release UI

Goal: submitted grades can become released, so the grade lifecycle actually completes.

- Add an admin seed user. None exists today.
- Add a minimal release screen for admin. List submitted periods per subject and term, one release action each. Reuse `POST /api/grades/release`, which already exists.
- Acceptance: a faculty-submitted period shows up for admin and flips to released. Student view shows the period after release.

## Phase 2: real Previous Records

Goal: replace the mock history page with database-backed records.

- Add `GET /api/faculty/history?username=`. Return this professor's sections grouped by academic year and term, released grades only, branch-scoped.
- Derive currently-teaching vs formerly-taught by comparing `subjects.professor` across terms for the same code.
- Rewrite `FacultyPreviousRecordsPage.tsx` against the endpoint. Wire the export CSV button, the per-section View action, and the summary counts. Drop the hardcoded `previousRecords` const.
- Seed at least one released prior term so the page is not empty on a fresh database.
- Acceptance: year filter, assignment filter, search, export, and View all work against real data. Current term never appears as history.

## Phase 3: My Students follow-up

Goal: roster stays usable as sections grow.

- Add pagination for sections with 25 or more students.
- Make one bulk action real. Attendance first: per-section session record, present or absent per student.
- Message section, Upload materials, Announce quiz stay as stubs until their backends exist.
- Acceptance: a 25-plus roster pages without layout breakage, attendance for a section saves and reloads.

## Phase 4: announcements write side

Goal: faculty can publish announcements instead of only reading them.

- Add faculty-only `POST /api/announcements` with the same auth guard pattern as grade writes.
- Add a create form reachable from the faculty dashboard. Enable the Announcements nav item for faculty once both ship.
- Acceptance: a faculty post appears in the student and faculty decks.

## Phase 5: schedule and tasks

Goal: fill the last two disabled nav items.

- Schedule: weekly calendar filtered to the faculty member's sessions only. Reuse `ScheduleGrid`.
- Tasks: faculty create flow plus the `submissionsClosed` toggle, which exists in schema with no UI.
- Acceptance: both nav items enabled, no dead sidebar entries left in the faculty portal.

## Faculty identity cleanup

Goal: stop showing student-specific UI to faculty. Small batch, fits anywhere after phase 2.

- Profile: hide COE, documents, and enrollment copy for faculty, or show a faculty-appropriate variant.
- Settings and Topbar: show faculty identifier instead of `studentNumber`.
- Dashboard: filter My Subjects to the current term.
- Acceptance: no student-only text or numbers visible on any faculty screen.

## Non-goals for this roadmap

Production hardening lives in TODO.md infrastructure and blocks launch, not these phases: password hashing, session tokens, rate limiting, input validation, error boundaries, CI.
