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
