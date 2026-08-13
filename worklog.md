# AICS Portal — Worklog

---
Task ID: tasks-tab-fixes
Agent: main (claude)
Task: PHASES 1-5 of the "TASKS TAB FIXES" spec — add submissionsClosed schema, 5-variant status matrix, server-side 403 enforcement, needs-attention card scope fix, action column redesign, seed update, verification.

Work Log:
- Read existing code: `src/lib/aics/tasks.ts`, `src/lib/mongodb/types.ts`, `src/lib/mongodb/queries.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[taskId]/submit/route.ts`, `src/components/portal/AcademicsPage.tsx` (905 lines), `scripts/seed-mongodb.ts`.
- **PHASE 1.1**: Added `submissionsClosed?: boolean` to `MongoTask` (`src/lib/mongodb/types.ts`) and to client `Task` (`src/lib/aics/tasks.ts`).
- **PHASE 1.2**: Rewrote `src/lib/aics/tasks.ts`:
  - Added `TaskVariant` type: `'GRADED' | 'PENDING' | 'MISSING_CLOSED' | 'MISSING_OPEN' | 'NEEDS_ATTENTION'`
  - `computeStatus()` now returns `{ status, variant, sub }` with the exact 5-variant matrix from the spec.
  - Added `VARIANT_COLORS` (slate for MISSING_CLOSED, red for MISSING_OPEN, green/amber/blue for the rest).
  - Reworked `STATUS_ICON_COLORS` to be keyed by `TaskVariant`.
  - Added `canSubmit(task)` and `canViewDetails(task)` helpers.
  - Added the TEACHER CONTROL comment above `computeStatus`.
- **PHASE 1.3/1.4**: Updated submit endpoint (`src/app/api/tasks/[taskId]/submit/route.ts`):
  - Returns HTTP 403 with `"Submissions for this task are closed."` when `submissionsClosed === true`.
  - Returns 404 for genuinely not-found task IDs.
  - Added TEACHER CONTROL comment block.
  - Updated `submitTask()` in `src/lib/mongodb/queries.ts` to use `ObjectId` (fixed pre-existing bug where string IDs never matched) and to atomically reject closed tasks (`submissionsClosed: { $ne: true }`).
- **PHASE 1 (GET)**: Updated `src/app/api/tasks/route.ts` to pass `submissionsClosed` field through to the client.
- **PHASE 2**: Updated Needs Attention card to filter ONLY unsubmitted tasks (MISSING_CLOSED + MISSING_OPEN + NEEDS_ATTENTION); PENDING rows are excluded. Order: MISSING rows first (dueDate asc), then NEEDS_ATTENTION (dueDate asc).
- **PHASE 3**: Course table action column:
  - Fixed width `w-28`, `pr-6` right padding on both header and body cells.
  - GRADED and PENDING rows: circular `Info` icon button (replaced `MoreHorizontal` kebab).
  - MISSING_CLOSED rows: muted slate text "Closed" (no button).
  - MISSING_OPEN rows: red "Submit (Late)" button.
  - NEEDS_ATTENTION rows: blue "Submit" button.
  - Fixed pluralization: "1 task" / "N tasks" in both course accordion header and overview card.
  - Updated all pill icons: `Lock` for MISSING_CLOSED, `AlertTriangle` for MISSING_OPEN, `Calendar` for NEEDS_ATTENTION.
- **PHASE 4**: Updated `scripts/seed-mongodb.ts`:
  - Set CS 208 "Activity 1: Users & Permissions" `submissionsClosed = true`.
  - All other current-term tasks have `submissionsClosed = false` (including CS 206 ERD Modeling).
  - Added inline comments explaining the expected variant for each test task.
- Created `.env.local` with MongoDB URI (was missing in sandbox).
- Ran seed script: 11 current-term + 2 previous-term tasks inserted.
- Created `scripts/verify-tasks.ts` to confirm seeded counts.
- **PHASE 5 verification**:
  - Lint: all 7 modified/new files pass `eslint` with zero errors.
  - Typecheck: `npx tsc --noEmit` reports zero errors on modified files (only pre-existing errors in unrelated `examples/`, `skills/`, `FitText.tsx`, `connection.ts`).
  - API verification:
    - GET `/api/tasks?username=juan.santos` returns 11 tasks with `submissionsClosed` field.
    - PATCH `/api/tasks/{CS 208 id}/submit` → HTTP 403 "Submissions for this task are closed." (idempotent on repeat).
    - PATCH `/api/tasks/{CS 206 id}/submit` → HTTP 200 success; task flipped to `submitted=true`, `submittedAt` set.
  - Counts verified: Total 11, Graded 4, Pending 2, Missing 2 (1 closed + 1 open), Needs attention 3 → Needs Attention card = 5 rows.

Stage Summary:
- 7 files changed: `src/lib/mongodb/types.ts`, `src/lib/aics/tasks.ts`, `src/lib/mongodb/queries.ts`, `src/app/api/tasks/route.ts`, `src/app/api/tasks/[taskId]/submit/route.ts`, `src/components/portal/AcademicsPage.tsx`, `scripts/seed-mongodb.ts`.
- 2 files created: `.env.local`, `scripts/verify-tasks.ts`.
- All counts and HTTP behaviors match the spec exactly.
- Pre-existing bug fix (bonus): submit endpoint now correctly converts string taskId to ObjectId (previously always returned 404).
- Warning modal text left untouched per spec.
- Grades and Subjects tabs not touched per spec.

---
Task ID: tasks-tab-polish
Agent: main (claude)
Task: PHASES 1-3 of the "TASKS TABLE POLISH" spec — remove feedback quote + grey status label, center ACTION column, replace native subject select with custom dropdown. PHASE 4 keep unchanged. PHASE 5 verify.

Work Log:
- Re-read current `src/components/portal/AcademicsPage.tsx` (specifically filter card, needs attention card, course accordion table body, and TaskDetailsModal).
- **PHASE 1.1 (Remove feedback quote)**: Removed the `<p>...italic "feedback"</p>` line from the Task cell in the course table body. Removed the `<DetailRow label="Feedback" ... />` line from `TaskDetailsModal`. The `feedback` field stays in the Task schema and seed data (teacher portal future use).
- **PHASE 1.2 (Remove grey status label)**: Replaced the `<div className="flex flex-col gap-0.5">` wrapper (pill + label) with just the pill `<span>`. The small grey `STATUS_LABELS[status]` text below the pill is gone from every row.
- **PHASE 2 (Center ACTION column)**:
  - Header: changed `text-right w-28` → `text-center w-32` (still has `pr-6` for right breathing room).
  - Body cell: changed `text-right w-28` → `w-32 pr-6` and wrapped all content (Submit button, "Closed" text, info icon button) in `<div className="flex justify-center">`. All three action variants now share one centered vertical axis under the header.
- **PHASE 3 (Custom subject dropdown)**:
  - Added `Check` to lucide-react imports.
  - Added `subjectDropdownOpen` state and `subjectDropdownRef` ref to `TasksTab`.
  - Added a `useEffect` that listens for `mousedown` (outside click) and `keydown` (Escape) to close the dropdown — only attached when dropdown is open.
  - Replaced the native `<select>` with a custom trigger button (`min-w-56`, `rounded-lg`, `border`, `bg-white`, `px-4 py-2.5`, `text-sm`, `text-left`, flexbox with value + chevron). The chevron rotates 180deg when open (transition-transform duration-200).
  - Trigger label: "All Subjects" or `"<code> * <title>"` for the selected subject.
  - Menu: `absolute mt-2 w-full min-w-56 rounded-lg border bg-white shadow-lg z-20 max-h-64 overflow-auto`. Items: "All Subjects" first, then each current-term subject as `"<code> * <title>"`. Selected item: blue text + `Check` icon on the right. Items use `hover:bg-slate-50`.
  - Selecting an item applies the filter, closes the dropdown, and updates the trigger label.
  - Type and Status chip groups left unchanged per spec.
- Cleaned up unused `status` destructures in the Needs Attention and table body `.map()` callbacks (no longer needed after removing the label).
- **PHASE 5 verification**:
  - `npx eslint src/components/portal/AcademicsPage.tsx` → clean, zero errors.
  - `npx tsc --noEmit` on AcademicsPage.tsx → clean, zero errors.
  - Smoke test: dev server starts, `/portal/commonwealth/student/juan.santos/academics` returns HTTP 200, page compiles in 4.5s with no errors.
  - Tasks API still returns 11 tasks.
  - Verified no `task.feedback` rendering remains in student UI (only schema field remains).
  - Verified no `italic` class remains in the file.
  - Verified `STATUS_LABELS[status]` is used exactly once — inside `TaskDetailsModal` (Status row), which is correct per spec.

Stage Summary:
- 1 file changed: `src/components/portal/AcademicsPage.tsx`.
- All three polish phases implemented in one file.
- No new UI libraries, no new files, no schema/seed/endpoint changes (PHASE 4 preserved).
- Build passes, lint clean, typecheck clean, runtime smoke test HTTP 200.
