# ADR 0004 — Real grade audit log

Date: 2026-08-30

## Context

`Grade Encoding` had local-only save. No history. `Previous Records` was mock.

## Decision

Create `grade_audits` collection (`src/lib/mongodb/types.ts:110`). Every `PATCH /api/grades/update`, `POST /api/grades/submit`, `POST /api/grades/release` writes docs with `branch`, `studentUsername`, `subjectCode`, `academicYear`, `semester`, `period`, `oldValue`, `newValue`, `action`, `performedBy`, `performedAt`, `note`. Add `GET /api/grades/audits` for reads. Index `branch, subjectCode, studentUsername, performedAt`.

## Consequences

Good: real history, branch-scoped, ties to faculty username.
Bad: extra writes per save. Need UI to surface it beyond the simple `Audit` column.

## Status

Accepted. Writes live; read API exists; UI still shows inline audit cell, full log viewer to follow.
