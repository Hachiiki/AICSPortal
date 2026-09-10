[⬅️ Back to Index](./00_INDEX.md)

# 01 Scope and environment

## Application

- Repo: `https://github.com/Hachiiki/AICSPortal`, cloned to `/home/z/my-project/AICSPortal`
- Branch: `main`, commit `198741b` (merge of PR #14, faculty-previous-records)
- Stack: Next.js 16.3.4 (App Router, Turbopack), React 19, TypeScript, Tailwind 4, shadcn/ui, MongoDB driver 7.5.0. No auth library is installed.
- Server: `npm run dev` on `http://localhost:3000`, running from the cloned working tree with no code changes

## Environment type

Local development. The app ran with `NODE_ENV=development`, which is why the demo login button is visible. Production behavior may differ for UI-only details (the dev-only badge, the demo autofill), but every API finding here is independent of NODE_ENV.

## Database

- The app read its connection string from `.env.local`, which I created from the credentials supplied in the test brief.
- Per the brief's instruction to use a separate database for testing, I set `MONGODB_DB=aics_portal_qa`. The default the app would otherwise use is `aics_portal`. All writes during testing (test artifacts, grade mutations) landed in `aics_portal_qa` only.
- I then restored every mutated document to its pre-test state and deleted all test artifacts. The cleanup log is in the worklog and the restore script is `AICSPortal/scripts/qa-cleanup.ts`. Final verification showed the four touched subject docs back at `prelim: 'INC'`, statuses empty, and zero QA_TEST rows remaining.

## Test accounts (seeded by the repo's own seed script into the QA database)

| Account | Password | Role |
| :--- | :--- | :--- |
| `juan.santos` | `student123` | student (2nd Year, CS-2A) |
| `maria.cruz` | `student123` | student |
| `jose.garcia` | `student123` | student |
| `m.reyes` | `faculty123` | faculty |
| `admin` | `admin123` | admin |
| 72 prototype roster students | `student123` | student |

## Data volume in the QA database

11 collections, 241 documents: 77 students, 92 subjects, 21 courses, 13 tasks, 11 sessions, 10 events, 8 professors, 5 announcements, 3 programs, 1 enrollment, 0 grade_audits (before my tests).

## What I could not test

- Cross-branch enforcement on `/api/grades/release`: the database only contains the `commonwealth` branch, so I could not produce a second branch to release against. The missing branch-mismatch check is confirmed by code reading (see [BUG-008](./06_BUG_REGISTRY.md#bug-008) context and the release route), not by a live cross-branch write.
- Face ID login end-to-end: the headless browser has no camera. The panel's "Camera Unavailable" state renders correctly. The mock auto-login behavior is confirmed at code level in `FaceIdPanel.tsx`.
- Load and stress behavior: out of scope per the safety rules. The numbers in [05](./05_SECURITY_AND_PERFORMANCE.md) are single-request latencies on localhost.
- Email/SMS/external side effects: none exist in the codebase, so none could be triggered.

## Assumptions

- The seeded data model reflects intended production structure (branch-scoped documents, per-student subject docs, per-period grade status fields).
- `aics_portal` (the default database name) is treated as the real database. I never connected to it; all evidence comes from `aics_portal_qa`.
- The GitHub token in the test brief was redacted before it reached me. No git push or commit was performed, which matches the brief's rules anyway.

## Safety rules followed

- Database writes only against the disposable `aics_portal_qa` database, with a pre-test snapshot and a verified restore afterwards.
- No destructive commands against any shared resource. The two `deleteMany` calls inside the repo's own seed script ran only against the QA database.
- Secrets redacted in this report. The MongoDB password and any tokens appear as `[REDACTED]`.
