# ADR 0002 — Per-period grade status

Date: 2026-08-30

## Context

Teachers wanted to save and submit prelim alone while midterm stayed untouched. Old model had one `gradeStatus` per enrollment row. That forced tabs to fight the model.

## Decision

Add `prelimStatus`, `midtermStatus`, `finalsStatus` to `subjects` (`src/lib/mongodb/types.ts:102`). Keep `gradeStatus` as legacy fallback. `''` = not set, `draft` = editing, `submitted` = awaiting admin, `released` = visible to students. Each period moves independently. `finalGrade` still follows overall `gradeStatus` for student visibility, but per-period saves set their own status to `draft`.

## Consequences

Good: save/submit per period works without mixing prelim into finals.
Bad: more fields to keep in sync. Student API must check per-period status for prelim/midterm/finals (`src/app/api/student/route.ts:39`).

## Status

Accepted. Seed writes `''` for `2026-2027` initial INC. APIs `update`/`submit`/`release` handle per-period.
