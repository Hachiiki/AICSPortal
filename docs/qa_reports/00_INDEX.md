[⬅️ Back to Index](./00_INDEX.md)

# QA report index

**Overall status: Critical issues found**

App tested: AICSPortal (student/faculty/admin portal), branch `main`, commit `198741b`
Environment: local dev server (Next.js 16.3.4) against isolated test database `aics_portal_qa`
Date: 2026-09-08

## Executive summary

The portal renders well and the happy paths work. Students can log in, see their dashboard, grades, tasks, announcements, and enrollment data. Faculty can log in, see sections, encode grades with correct auto-compute math, take attendance, and post tasks. Error messages are generic and do not leak stack traces. The data I inspected was consistent: no duplicate usernames, no orphaned records, and every subject professor exists in the professor directory.

The security model is the problem. The API has no authentication layer at all. There are no sessions, cookies, or tokens. Every endpoint that "knows" who the caller is trusts a `username` or `performedBy` string supplied by the caller. I confirmed three critical issues live: a NoSQL operator injection that logs me in as an arbitrary user without a password, grade writes and grade-status changes that succeed with no credentials at all, and plaintext password storage across all 77 accounts. Anyone who can reach the API can read any student's profile, fees, and notifications, edit anyone's contact info, and read the full grade audit trail.

The client adds a second weakness: "authentication" is three localStorage flags, and I demonstrated full account takeover in the browser by editing one of them. Screenshots are in `../qa-evidence/screenshots/`.

If this app is ever exposed beyond localhost, fix the auth layer first. The recommended order is in [08_RECOMMENDATIONS_AND_FIXES.md](./08_RECOMMENDATIONS_AND_FIXES.md): sessions plus middleware, then password hashing, then the grade endpoint guards.

## Quick stats

| Metric | Value |
| :--- | :--- |
| API requests executed | 75 (60 first pass + 15 corrected-shape retests) |
| Read-only DB integrity checks | 12 |
| UI flows exercised | 5 (login, student dashboard, faculty dashboard, grade encoding, mobile) |
| Screenshots captured | 11 |
| Confirmed bugs | 18 total: 3 Critical, 6 High, 5 Medium, 3 Low, 1 Info |
| Severity of worst finding | Critical (authentication bypass, live-confirmed) |

Positive results worth noting: admin-only and faculty-only role checks work on announcements, task creation, grade release, and notifications when `performedBy` is supplied honestly. Input validation on task fields, attendance dates, and record maps rejects malformed data with 400s. Grade auto-compute math (30/30/40, INC as 0) is correct in both code and UI. No endpoint leaked a stack trace.

## Master navigation

- [01 Scope and environment](./01_SCOPE_AND_ENVIRONMENT.md): what was tested, test accounts, out-of-scope areas, assumptions
- [02 API findings](./02_API_FINDINGS.md): endpoint-by-endpoint results with request/response evidence
- [03 Database findings](./03_DATABASE_FINDINGS.md): collection inventory, integrity checks, indexes, schema-vs-code
- [04 UI and vision findings](./04_UI_AND_VISION_FINDINGS.md): screen-by-screen notes with screenshots, including the localStorage spoof demo
- [05 Security and performance](./05_SECURITY_AND_PERFORMANCE.md): the auth model analysis, injection surfaces, config, and performance observations
- [06 Bug registry](./06_BUG_REGISTRY.md): all 18 bugs with severity, evidence, root cause, and impact
- [07 Test coverage matrix](./07_TEST_COVERAGE_MATRIX.md): what was tested, what passed, what was not covered
- [08 Recommendations and fixes](./08_RECOMMENDATIONS_AND_FIXES.md): prioritized fixes with code sketches
- [09 Fix plan](./09_FIX_PLAN.md): master issue table, root causes, strategy, acceptance criteria
- [10 Fix phases](./10_FIX_PHASES.md): phased execution with statuses and evidence
- [11 Post-fix verification](./11_POST_FIX_VERIFICATION.md): retest results and remaining work
- [12 Phase 6 verification (sessions)](./12_SESSIONS_VERIFICATION.md): 32/32 live probes close 004/005/009 (+012 full)
- [13 Phase 7 pre-flight (QA rehearsal)](./13_PHASE7_PREFLIGHT.md): hardened tool, scope audit, rollback drill, exact prod commands
- [14 Phase 7 window report (prod)](./14_PHASE7_WINDOW_REPORT.md): 77/77 rehashed, 0 plaintext, BUG-003 Fixed-Verified
- [15 Campaign closeout draft (Task 8 — do NOT execute)](./15_CAMPAIGN_CLOSEOUT.md): merge/deploy plan, registry table

## Top priorities

1. [BUG-001](./06_BUG_REGISTRY.md#bug-001): NoSQL injection on `/api/auth/login` returns 200 for `{"username":{"$ne":null},"password":{"$ne":null}}`
2. [BUG-002](./06_BUG_REGISTRY.md#bug-002): `/api/grades/update` and `/api/grades/submit` skip the role check entirely when `performedBy` is omitted
3. [BUG-003](./06_BUG_REGISTRY.md#bug-003): All 77 accounts store passwords in plaintext
