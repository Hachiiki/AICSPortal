# ADR 0006 — Auth check on grade writes

Date: 2026-08-30

## Context

Grade APIs trusted `branch` from client. Any user could post.

## Decision

Require `performedBy` (faculty username) on `PATCH /api/grades/update`, `POST /api/grades/submit`, and `POST /api/grades/release`. Lookup `students` doc, check `role==='faculty'` (or `admin` for release) and `branch` match. Return 403 otherwise. `src/app/api/grades/update/route.ts:18`, `submit/route.ts:12`, `release/route.ts:12`.

## Consequences

Good: basic branch guard without full session tokens.
Bad: still plaintext password auth, `performedBy` can be spoofed until we add signed sessions. Next step is proper session/JWT.

## Status

Accepted. Minimal guard in place.
