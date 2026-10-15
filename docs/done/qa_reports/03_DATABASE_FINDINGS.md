[⬅️ Back to Index](./00_INDEX.md)

# 03 Database findings

Database: `aics_portal_qa` on the Atlas cluster supplied in the test brief. All checks read-only unless noted; the only writes were the seed (repo's own script), my marked test artifacts (deleted afterwards), and the verified restore of mutated documents.

## Collections and volumes

| Collection | Docs | Purpose |
| :--- | --- | :--- |
| students | 77 | students + faculty + admin (role field) |
| subjects | 92 | one doc per student per subject per term |
| courses | 21 | catalog, 7 per program |
| tasks | 13 | per-student task fan-out |
| sessions | 11 | weekly class schedule |
| events | 10 | school calendar |
| professors | 8 | directory |
| announcements | 5 | branch notices |
| programs | 3 | BSCS, BSCE, BSENTREP |
| enrollments | 1 | per-term fees/payment (only juan.santos) |
| grade_audits | 0 before tests, 11 created by my grade probes, deleted after | grade change history |

## Index inventory

All 14 collections have the indexes the seed intends: unique on `(branch, username)` for students, `(branch, code)` for courses, `(branch, name)` for professors, `(branch, studentUsername, academicYear, semester)` for enrollments, `(branch, sectionKey, date)` for attendance, `(branch, username, announcementId)` for announcement_reads, plus lookup indexes on subjects, tasks, sessions, events, announcements, notifications, grade_audits, programs.

One operational note: the seed's `createIndex` calls stalled twice on this Atlas tier (see [BUG-018](./06_BUG_REGISTRY.md#bug-018)). The indexes exist now, but a partially-run seed against the real `aics_portal` database could leave it without the students unique index, which is what currently prevents duplicate accounts at the storage layer.

## Integrity checks (all passed)

- Duplicate usernames: 0 (unique index holding)
- Subjects referencing a `studentUsername` that does not exist: 0 orphans
- Tasks referencing a missing student: 0 orphans
- Subjects whose `professor` string has no matching `professors` document: 0 currently
- Students missing `branch`: 0
- Sessions with invalid times or day-of-week: 0
- Announcement categories all within the expected set

## Schema vs code

- `subjects.grade_status_distribution`: 90 docs have empty per-period statuses and no `gradeStatus` field; 2 released history docs have `prelimStatus: 'released'`. This matches the seed's intent: the grade workflow starts at `''` and moves `'' -> draft -> submitted -> released`. The submit endpoint only flips docs at `draft`, so seeded data correctly reports `0 grade(s) submitted` until a faculty member saves grades first. This is coherent, but worth knowing: the empty-string initial state is a fourth state the UI must handle (it does).
- Passwords: all 77 student documents carry a `password` field with observed lengths of 8 to 10 characters. Values are plaintext by design of the code (see [BUG-003](./06_BUG_REGISTRY.md#bug-003)). I did not read or output any password values beyond confirming the field exists and its length range.
- Enrollment coverage: 1 of 77 students has an enrollment document. The other 76 get a clean 404. This is seed scope, not a bug, but it means the Enrollment page's empty state is the common path in production until registrars create records.

## Queries used (representative, read-only)

```js
// duplicate usernames
db.students.aggregate([{ $group: { _id: "$username", n: { $sum: 1 } } }, { $match: { n: { $gt: 1 } } }])
// orphaned subjects
db.subjects.find({ studentUsername: { $nin: usernames } }).count()
// professor name-join integrity
db.subjects.distinct("professor")  // compared against db.professors.distinct("name")
// password field presence (no values read)
db.students.countDocuments({ password: { $exists: true } })
```

Full script: `AICSPortal/scripts/qa-db-analysis.ts`, output saved to `../qa-evidence/db-analysis.json`.

## Data privacy observations

- Plaintext passwords: confirmed, see above and [BUG-003](./06_BUG_REGISTRY.md#bug-003)
- No tokens, sessions, or refresh material are stored anywhere (there is no session layer)
- Student PII (address, emergency contacts, phone, email) sits in `students` and flows to the client through the unauthenticated `/api/student` GET, see [BUG-004](./06_BUG_REGISTRY.md#bug-004)
- Fee and payment status flows through `/api/enrollment` the same way

## Concurrency and transactions

- Task submission uses a single atomic `updateOne` with the guard conditions in the filter (`submitted: false`, `submissionsClosed: { $ne: true }`). Double-submit races are handled correctly at the storage layer.
- Attendance uses an upsert plus a unique index; concurrent duplicate posts can still 409 (index race is caught). Sequential duplicates overwrite silently, see [BUG-015](./06_BUG_REGISTRY.md#bug-015).
- Grade updates loop `findOne` + `updateOne` per row with no transaction. A crash mid-batch leaves partial writes. Low risk for the current scale, noted in [05](./05_SECURITY_AND_PERFORMANCE.md).
- Multi-document fan-outs (task creation to N students, notification fan-out) use `insertMany`, which is atomic per batch on a replica set. Good enough as-is.
