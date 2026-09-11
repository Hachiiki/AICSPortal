# Student-faculty interaction completion plan

Epic: #31. Child issues: #32, #33, #34, #35, #36. Updated: 2026-09-12.

Scope: everything a student and a teacher need to do to each other inside the portal. The point of this plan is to close the loop. Most one-way flows already ship. The two-way ones do not, and one of them (task grading) is half-built in a way that hides the gap.

## What already works (do not rebuild)

| Interaction | Direction | Flow | Status |
|---|---|---|---|
| Grades | faculty to student | encode per period, draft, submit, admin release, student view, `grade_audits` trail | done, verified |
| Task posting | faculty to student | fan-out per enrolled student, current-term visibility | done |
| Task submission | student to faculty | submit flips `submitted`, close/reopen enforced server side, Missing vs Overdue | done |
| Notifications | faculty to student | section-targeted bell inbox, read state persists | done |
| Announcements | admin to everyone | deck cards, drag dismissal, undo | done |
| Attendance (write) | faculty record | per section per date, upsert, 409 on duplicate | done |

## The hidden gap

Task grading is half a feature. The schema carries `score`, `maxScore`, and `feedback` (`src/app/api/tasks/route.ts:158-161`), and the student side already renders score and a GRADED status (`src/components/portal/TasksTab.tsx:79-90,558`). No endpoint anywhere writes those fields. The faculty Tasks page shows `{group.graded} graded` (`src/components/faculty/FacultyTasksPage.tsx:328`), permanently 0. Faculty also see submission counts, never names.

So a student submits work that no teacher can score, and feedback cannot reach anyone. This is the highest-value item in the plan and the only one where the UI already pretends the feature exists.

## Task list

| Issue | Priority | Size | What | Key acceptance |
|---|---|---|---|---|
| #32 | high | ~1 day | Task grading flow: `PATCH /api/tasks/[taskId]/grade`, submissions drawer in FacultyTasksPage, feedback shown in student task detail | faculty grade shows on student side, counters flip, 403/400 guards hold |
| #33 | medium | ~half day | Wire Attendance history button to existing `GET /api/attendance` | sessions list + records render, test session deleted after |
| #34 | decision, then days or hours | scope first | Message section: in-app messaging, notification reuse, or remove | decided, no dead button |
| #35 | decision, then days or ~1 day | scope first | Upload materials: Cloudinary, link-only, or remove | decided, students see materials if built |
| #36 | low | ~1 hour | Announce quiz duplicates Tasks (type Quiz exists), In/Out log has no data source | no coming-soon toasts left in FacultyStudentsPage |

Build order: #32 first (closes the core teaching loop), #33 second (backend exists, trivial), then decide #34 and #35 before building either. #36 any time.

## Scope decisions needed from owner

1. Message section (#34). In-app messaging is a real subsystem (new collection, threads, unread counts). Notification reuse is hours. Removing the button is minutes. Decide before anyone writes code.
2. Upload materials (#35). Cloudinary was in the original stack but nothing is wired. Link-only materials get most of the value for a fraction of the work.
3. In/Out log (#36). There is no data source for a campus entry/exit log. If the school does not keep one, remove the button.
4. Optional, not tracked in an issue: should students see their own attendance? The data exists after #33. Separate small feature if wanted.

## Non-goals

- Rebuilding anything in the done table above.
- Admin portal work. That is tracked separately in TODO.md.
- Two-way messaging (student replies) in v1 of #34 if option A is chosen. One-way faculty to section only.
- Task grading writing `grade_audits` rows. Tasks are not grades. If audit history is wanted for task scores, record that decision in #32.

## Acceptance gates (every issue)

`npm run lint` clean in touched files, `npm run build` passes, browser verification with both roles on the seed users, test documents deleted after verification, no secrets or `.env.local` in the diff.
