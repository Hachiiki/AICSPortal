# ADR 0008. Grade write state machine

Date: 2026-10-22

## Context

Before the 2026-10-21 authorization review, a faculty encode reset submitted or released grades back to draft (finding H1a): the change vanished from the student view and the release queue with no audit trace, and a re-encode after release silently un-released it. On top of that, the professor-of-record check was skipped whenever a faculty record lacked a full name (H1b), and any same-branch faculty could submit any subject's grades (C1).

## Decision

Grade period states are forward-only: `''` / `draft` -> `submitted` -> `released`, decided in the `grade.period` case of `src/lib/authz/policies.ts`.

- Encoding (update) is allowed only while the touched period is `''` or `draft`.
- A `submitted` period can be withdrawn by its teaching faculty (action `withdraw`), which writes a `grade_audits` row.
- A `released` period is immutable to faculty. Correction is the admin-only unrelease action (`grade.releaseQueue` action `unrelease`, released -> submitted, same-branch parity), also audited.
- The professor-of-record check is unconditional and fails closed on a missing `fullName` (H1b); `grades/submit` and the write scope carry the professor key so the filter itself is professor-scoped (C1).

## Consequences

Good: grades never silently disappear or un-release; every state change is audited; students see consistent released data; the release queue cannot be drained by a re-encode.

Bad: correcting a released grade needs an admin round trip. That is deliberate, the owner's sign-off condition on FIX-H1a (phase-3-plan section 9.1): the explicit, audited correction workflow is part of the deliverable.

## Status

Accepted. Landed in C3.1, C3.2, C3.3 (issues #57, #59, #58); each commit flipped exactly its own golden rows in `docs/authz/goldens.tsv`.
