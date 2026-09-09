[⬅️ Back to Index](./00_INDEX.md)

# 07 Test coverage matrix

> Post-fix update (2026-09-09): regression probes added as isolated checks (asString, validGrade, rate-limit, scrypt round-trip, attendance 409, envelope 400/207/200 — all PASS, temp file deleted). Full per-bug retest in [11 Post-fix verification](./11_POST_FIX_VERIFICATION.md). Recommended persistent suite (vitest + Playwright) still open per [08](./08_RECOMMENDATIONS_AND_FIXES.md#regression-tests).

75 API requests, 12 database checks, 5 UI flows, 11 screenshots. Evidence logs: `../qa-evidence/api-tests.log`, `../qa-evidence/api-retests.log`, `../qa-evidence/db-analysis.json`, `../qa-evidence/screenshots/`.

## Feature coverage

| Feature | Test type | Representative cases | Result | Evidence | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Login | Auth, negative, injection | AUTH-01..07 | **Fail** | BUG-001, BUG-013 | Valid/invalid/empty/numeric pass; operator objects bypass |
| Change password | Auth, validation | CPW-01..05 | Pass with caveats | BUG-013 | Flow correct; unlimited guesses; plaintext write |
| Session model | Architecture review | storage dump, middleware search | **Fail** | BUG-009 | No sessions exist |
| Student profile read | IDOR | STUD-01..05 | **Fail** | BUG-004 | Any username readable anonymously |
| Profile update | IDOR write | STUD-06 | **Fail** | BUG-005 | Any profile editable anonymously |
| Tasks read | IDOR | TASK-01..03 | **Fail** | BUG-004 | |
| Task creation | Authz, validation | TASK-04..07 | Pass | log | Role check works when performedBy is honest; body injection noted (BUG-010) |
| Task submission | Happy path, IDOR | SUB-01..02 | **Fail** | BUG-004 | Cross-user submit accepted |
| Announcements read/write | Authz | ANN-01..06 | Pass (write), Fail (read scoping) | BUG-004 | Admin-only write confirmed working |
| Read markers | Validation | ANN-04..05 | **Fail** | BUG-010 | Junk ids persisted |
| Notifications | Authz, teaching-load scope | NOTIF-01..05 | Pass (write), Fail (read) | BUG-004 | Section ownership check works |
| Faculty workspace | Role check | FAC-01..04 | **Fail** | BUG-006 | No role check on /api/faculty |
| Faculty history | Role check | FAC-05..06 | **Fail** | BUG-006 | Same gap, lower sensitivity |
| Faculty tasks | Role check | FAC-03..04 | Pass | log | Correct 403 for students |
| Grade update | Authz, business rules, validation | GRD-04..09 | **Fail** | BUG-002, BUG-008, BUG-014 | Unauthenticated writes accepted; no-op professor check; values unvalidated |
| Grade submit | Authz, state machine | GRD-02, GRD-03, GRD-10 | **Fail** | BUG-002 | Draft->submitted flip works anonymously |
| Grade release | Authz | REL-01..03 | Pass | log | performedBy required; admin-only enforced; cross-branch gap code-confirmed only |
| Grade audits | Authz | GRD-01, GRD-11 | **Fail** | BUG-007 | Fully public |
| Audit trail reliability | Code review | BUG-011 | **Fail** | BUG-011 | Silent catch on insert |
| Attendance | Validation, idempotency | ATT-01..12 | Pass (validation), Fail (overwrite) | BUG-015 | Date and record validation solid |
| Enrollment read | IDOR, financial data | ENR-01..02 | **Fail** | BUG-004 | Fees and balance public per username |
| Events, professors | IDOR (low sensitivity) | EVENT-01, PROF-01 | Fail (low impact) | BUG-004 | |
| Database integrity | Read-only checks | dupes, orphans, indexes | Pass | db-analysis.json | See 03 |
| UI login flow | Functional | 01, 02, 03 screenshots | Pass | screenshots | Generic errors, correct redirects |
| UI student dashboard | Functional, visual | 04 screenshot | Pass | screenshot | Correct data, release gating visible |
| UI guard bypass | Security | 05, 06 screenshots | **Fail** | BUG-009 | localStorage spoof |
| UI faculty portal | Functional | 07, 09 screenshots | Pass | screenshots | Grade math verified |
| UI mobile gate | Functional | 08 screenshot | Pass | screenshot | Intentional design |
| Face ID | Functional, code review | 10, 11 screenshots | Partial | BUG-012 | Camera error handled; mock login code-confirmed |
| Security headers | Config | curl -I | **Fail** | BUG-016 | |
| Performance | Single-request timing | PERF spot checks | Pass (local) | log | Shapes noted in 05 |

## Missing tests to write (none exist today)

The repo has no test suite at all: no unit, integration, or E2E tests, and no test runner in package.json. Highest-value first tests are listed with code sketches in [08](./08_RECOMMENDATIONS_AND_FIXES.md#regression-tests), roughly in this order:

1. Login rejects non-string credential types (BUG-001)
2. Grade write endpoints reject requests without an authenticated session (BUG-002)
3. Password hashes are not reversible or readable (BUG-003)
4. User-scoped endpoints 401 without a session and 403 across users (BUG-004)
5. Faculty endpoints 403 for student sessions (BUG-006)
6. Grade values outside 0-100 or non-numeric are rejected (BUG-008)
7. Attendance duplicate post returns 409 or performs a tracked update (BUG-015)

## Regression risks while fixing

- Adding sessions will touch every route. The client stores `username` in the URL path; keep the URLs but derive identity from the session server-side, or deep links will break in new ways.
- Hashing passwords requires a migration path for existing plaintext values (hash-on-first-login or a one-time rehash script). See 08.
- The grades state machine (`'' -> draft -> submitted -> released`) has an empty-string initial state that both submit and the UI special-case. Any change to status values must keep the seeded data working.
