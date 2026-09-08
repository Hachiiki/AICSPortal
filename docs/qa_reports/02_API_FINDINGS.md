[⬅️ Back to Index](./00_INDEX.md)

# 02 API findings

Full evidence log: `../qa-evidence/api-tests.log` and `../qa-evidence/api-retests.log`. Status codes below are HTTP results from the live server.

## Authentication and session

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| AUTH-01 | POST `/api/auth/login`, valid student creds | 200 `{"ok":true,"role":"student"}` | Pass |
| AUTH-02 | POST login, wrong password | 401 generic message | Pass |
| AUTH-03 | POST login, empty fields | 400 | Pass |
| AUTH-04 | POST login, `{"username":{"$ne":null},"password":{"$ne":null}}` | **200, logged in as `maria.cruz`** | [BUG-001](./06_BUG_REGISTRY.md#bug-001) Critical |
| AUTH-05 | POST login, numeric types `123`/`123` | 401 | Pass |
| AUTH-06 | POST login, `{"username":{"$regex":"^m\\.reyes"},"password":{"$ne":"zzz"}}` | **200, logged in as `m.reyes167`** (a student account) | [BUG-001](./06_BUG_REGISTRY.md#bug-001) |
| AUTH-07 | 8 rapid failed logins | 8x 401, no 429 | [BUG-013](./06_BUG_REGISTRY.md#bug-013) |
| CPW-01 | POST `/api/auth/change-password`, valid | 200 | Pass (restored after) |
| CPW-02 | Login with old password after change | 401 | Pass |
| CPW-04 | Change to 3-char password | 400 `min 6 characters` | Pass |
| CPW-05 | Change with wrong current password | 401 | Pass, but see [BUG-013](./06_BUG_REGISTRY.md#bug-013): unlimited guesses allowed |

There is no session, cookie, or token anywhere in the response. The login response body is the entire "session". See [BUG-009](./06_BUG_REGISTRY.md#bug-009).

## Student profile and enrollment

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| STUD-01 | GET `/api/student?username=juan.santos` | 200, full profile | Happy path OK |
| STUD-02 | GET `/api/student?username=maria.cruz` (no auth) | **200, full profile of another student** | [BUG-004](./06_BUG_REGISTRY.md#bug-004) |
| STUD-03 | GET unknown username | 404 | Pass |
| STUD-04 | GET missing username param | 400 | Pass |
| STUD-05 | GET `/api/student?username=m.reyes` | 200, faculty profile with phone | [BUG-004](./06_BUG_REGISTRY.md#bug-004) |
| STUD-06 | PATCH `/api/student/update?username=maria.cruz` (no auth) | **200, phone changed** | [BUG-005](./06_BUG_REGISTRY.md#bug-005) |
| ENR-01 | GET `/api/enrollment?username=juan.santos` | 200, fee assessment, balance, payment status | [BUG-004](./06_BUG_REGISTRY.md#bug-004) (financial data, zero auth) |
| ENR-02 | GET enrollment for student with no record | 404 clean message | Pass |

Positive: `/api/student` enforces per-period release gating server-side (prelim/midterm/finals values are withheld unless the period status is `released`). This is the right kind of control, and it lives in the right place.

## Tasks

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| TASK-01 | GET `/api/tasks?username=juan.santos` | 200, 11 current-term tasks | Happy path OK |
| TASK-02 | GET tasks for a different username (no auth) | 200 | [BUG-004](./06_BUG_REGISTRY.md#bug-004) |
| TASK-03 | GET without username | 400 | Pass |
| TASK-04 | POST task as `m.reyes` for CS 208 | 200, fanned out to 3 enrolled students | Pass |
| TASK-05 | POST task as student `juan.santos` | 403 `faculty only` | Pass |
| TASK-06 | POST with `performedBy: {"$regex":"^m"}` (operator object) | 403, but the operator reached the Mongo query and matched a student doc | [BUG-010](./06_BUG_REGISTRY.md#bug-010) |
| TASK-07 | POST with empty title, bogus type, negative maxScore | 400 with field validation | Pass |
| SUB-01 | PATCH `/api/tasks/{id}/submit?username=juan.santos`, own task | 200, submitted | Pass |
| SUB-02 | PATCH submit with `username=maria.cruz` (no auth, someone else's task) | **200, submitted on her behalf** | [BUG-004](./06_BUG_REGISTRY.md#bug-004) |

Positive: the submit guard itself (`queries.ts:82-96`) is atomic and checks `submissionsClosed`. The flaw is that `username` is caller-supplied.

## Announcements

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| ANN-01 | GET announcements for a username | 200 | Happy path OK |
| ANN-02 | POST as `admin` | 200, created | Pass |
| ANN-03/06 | POST as student | 400 (missing category), then 403 `admin only` with category present | Pass |
| ANN-04 | POST read-marker for another username | 200 | [BUG-004](./06_BUG_REGISTRY.md#bug-004) (low sensitivity) |
| ANN-05 | POST with `announcementId` as an object | 200, `"[object Object]"` stored | [BUG-010](./06_BUG_REGISTRY.md#bug-010) |

## Notifications

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| NOTIF-01 | GET inbox for any username | 200 | [BUG-004](./06_BUG_REGISTRY.md#bug-004) |
| NOTIF-02 | GET `sentBy=m.reyes` sent-mail | 200 | [BUG-004](./06_BUG_REGISTRY.md#bug-004) |
| NOTIF-05 | POST to `CS 208|2026-2027|1st Sem` as `m.reyes` | 200, sent to 3 students | Pass: teaching-load scoping works |
| NOTIF-04 | POST as student | 403 | Pass |

## Faculty

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| FAC-01 | GET `/api/faculty?username=juan.santos` (a student) | **200, faculty-shaped payload** (his own PII, empty roster because the name-join matched nothing) | [BUG-006](./06_BUG_REGISTRY.md#bug-006) |
| FAC-02 | GET as `m.reyes` | 200, 5 subjects, branch-wide roster with emails/phones | [BUG-006](./06_BUG_REGISTRY.md#bug-006): no role check at all |
| FAC-03 | GET `/api/faculty/tasks` as student | 403 | Pass |
| FAC-04 | GET faculty tasks as `m.reyes` | 200, correct per-submission counts | Pass |
| FAC-05/06 | GET `/api/faculty/history` | 200 for student and faculty usernames alike | No role check, lower sensitivity |

## Grades

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| GRD-07 | PATCH `/api/grades/update`, **no `performedBy`**, sets `prelim:"99"` for maria.cruz | **200, "1 updated"** | [BUG-002](./06_BUG_REGISTRY.md#bug-002) Critical |
| GRD-08 | PATCH with `performedBy=m.reyes` on CS 205 (taught by Prof. Anna Lim) | **200, updated. The professor-of-record check is an empty if-block** | [BUG-008](./06_BUG_REGISTRY.md#bug-008) |
| GRD-09 | PATCH grades `999` and `-5`, no auth | **200, both accepted** | [BUG-008](./06_BUG_REGISTRY.md#bug-008) |
| GRD-10 | POST `/api/grades/submit` (period=prelim), **no auth**, after GRD-09 set drafts | **200, "3 grade(s) submitted"** | [BUG-002](./06_BUG_REGISTRY.md#bug-002) Critical |
| GRD-11 | GET `/api/grades/audits?branch=commonwealth` | **200, full audit trail, no auth** | [BUG-007](./06_BUG_REGISTRY.md#bug-007) |
| GRD-03 | POST submit as student | 403 | Pass |
| REL-01 | POST release as faculty | 403 `admin only` | Pass |
| REL-02 | POST release with no `performedBy` | 403 `performedBy is required` | Pass (release is the one write that requires it) |
| REL-03 | GET release queue as faculty | 403 | Pass |
| GRD-04 | PATCH with top-level `branch` (wrong shape) | 200 `0 updated, 1 skipped` | See [BUG-014](./06_BUG_REGISTRY.md#bug-014) |

All grade mutations I made were restored from a pre-test snapshot. Verification output showed `prelim: 'INC'`, `prelimStatus: ''` on all four touched documents.

## Attendance

| Test | Request | Result | Verdict |
| :--- | :--- | :--- | :--- |
| ATT-02 | GET as `m.reyes`, correct sectionKey format | 200, empty before taking | Pass |
| ATT-08 | POST valid session | 200 | Pass |
| ATT-09 | POST same section/date again with different records | **200, silently overwrote the first session** | [BUG-015](./06_BUG_REGISTRY.md#bug-015) |
| ATT-10 | GET after both posts | 200, records match the SECOND payload | Confirms overwrite |
| ATT-05 | POST date `08/09/2026` | 400 `Date must be YYYY-MM-DD` | Pass |
| ATT-11 | POST records as string | 400 | Pass |
| ATT-12 | POST record value `sneaky-value` | 400 `must map usernames to present or absent` | Pass |
| ATT-06 | POST as `admin` | 403 `faculty only` | Works as coded; flag for product: admins are locked out of attendance |

## Cross-cutting error handling

Every endpoint I probed with malformed input returned a JSON error with a generic message. No stack traces, no MongoDB error text, no driver internals reached the client in any of the 75 requests. This is consistently done well.

## Endpoint inventory

21 route files under `src/app/api/`. Methods, identity model, and risk per endpoint:

| Endpoint | Methods | Identity source | Highest-severity issue |
| :--- | :--- | :--- | :--- |
| `/api` | GET | none | none (health stub) |
| `/api/auth/login` | POST | body creds | BUG-001 |
| `/api/auth/change-password` | POST | `username` query + body | BUG-003, BUG-013 |
| `/api/student` | GET | `username` query | BUG-004 |
| `/api/student/update` | PATCH | `username` query | BUG-005 |
| `/api/tasks` | GET/POST/PATCH | `username` query / `performedBy` body | BUG-004, BUG-010 |
| `/api/tasks/[taskId]/submit` | PATCH | `username` query | BUG-004 |
| `/api/notifications` | GET/POST/PATCH | `username`/`sentBy` query, `performedBy` body | BUG-004 |
| `/api/professors` | GET | `username` query | BUG-004 (low sensitivity) |
| `/api/announcements` | GET/POST | `username` query, `performedBy` body | OK on write, BUG-004 read |
| `/api/announcements/read` | POST | `username` body | BUG-010 |
| `/api/events` | GET | `username` query | BUG-004 (low) |
| `/api/enrollment` | GET | `username` query | BUG-004 (financial) |
| `/api/attendance` | GET/POST | `username` query, `performedBy` body | BUG-015 |
| `/api/grades/submit` | POST | `performedBy` body, optional | BUG-002 |
| `/api/grades/release` | GET/POST | `username` query, `performedBy` body (required) | missing branch check, code-confirmed |
| `/api/grades/update` | PATCH | `performedBy` body, optional | BUG-002, BUG-008, BUG-014 |
| `/api/grades/audits` | GET | none | BUG-007 |
| `/api/faculty` | GET | `username` query | BUG-006 |
| `/api/faculty/tasks` | GET | `username` query with role check | OK |
| `/api/faculty/history` | GET | `username` query, no role check | noted in BUG-006 |
