# ADR 0005 — Student section is source of truth

Date: 2026-08-30

## Context

`students.section` and `subjects.section` duplicated the class grouping. They drifted.

## Decision

Keep `students.section` as source. Drop `section` from `subjects` (`src/lib/mongodb/types.ts:96`). Roster grouping uses `code|academicYear|semester` and derives display section from enrolled students via `useFacultyRows` (`src/lib/aics/use-faculty-rows.ts:85`). Seed no longer writes `section` to subjects.

## Consequences

Good: one place to edit section.
Bad: subjects alone no longer tell you section; you must join to students.

## Status

Accepted. Verified live DB has 0 docs with `section` field.
