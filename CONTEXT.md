# AICS Portal — Context

Single-context app. One branch field on every doc. One portal shell that switches by role.

## Glossary

- branch — tenant string, e.g. `commonwealth`. Stored on every doc in every collection. All reads filter by `{branch, ...}`. Not a separate database.
- student — a doc in `students` with `role='student'`. Holds profile, program, yearLevel, section, gpa, credentials.
- faculty — a doc in `students` with `role='faculty'`. Same collection as student. `fullName` must match `subjects.professor` for their teaching assignments.
- subject enrollment — one doc in `subjects` per `studentUsername` x `code` x `academicYear`/`semester`. Holds `prelim`, `midterm`, `finals`, `finalGrade`, `remarks` plus per-period statuses `prelimStatus`, `midtermStatus`, `finalsStatus`. Kept branch-scoped.
- section — class grouping like `BSCS 1-A`. Source of truth is `students.section`. Not stored on `subjects`. Faculty roster groups by `code|academicYear|semester` and derives section from enrolled students.
- gradeStatus — legacy overall status. Prefer per-period statuses. Values: `''` not set, `draft` teacher editing, `submitted` awaiting admin, `released` visible to students.
- INC — incomplete grade. Stored as string `"INC"` in `prelim`/`midterm`/`finals`/`finalGrade`/`remarks`. In final math, INC counts as 0: `final = prelim*0.3 + midterm*0.3 + finals*0.4` with INC=0. Badge shows `INC` with amber style.
- grade audit — doc in `grade_audits` per save/submit/release. Fields: `branch`, `studentUsername`, `subjectCode`, `academicYear`, `semester`, `period`, `oldValue`, `newValue`, `action`, `performedBy`, `performedAt`, `note`.

## Core flows

- Auth — `POST /api/auth/login` checks `students` by `username`/`password`. Client stores `aics_username`/`branch`/`role` in localStorage. `useAuth` hydrates via `useSyncExternalStore`. No session token yet.
- Faculty roster — `GET /api/faculty?username=` finds faculty, then `subjects` where `professor===fullName` and `branch`, then unique `students` for those usernames. Used by My Students and Grade Encoding.
- Grade workflow — per period. Teacher edits a period → `PATCH /api/grades/update` sets that period's `*Status='draft'` and writes audit. Teacher submits period → `POST /api/grades/submit` with `period` flips `draft→submitted` per subject+term and writes audit. Admin releases → `POST /api/grades/release` `submitted→released`. Student API only shows a period when its status is `released`, else `-` / `Pending`.

## Non-goals

- No separate DB per branch.
- No per period release until this ADR; now it is the rule.
