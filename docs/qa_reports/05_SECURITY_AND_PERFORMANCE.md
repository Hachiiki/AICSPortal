[⬅️ Back to Index](./00_INDEX.md)

# 05 Security and performance

## The auth model, stated plainly

There is none. Concretely:

- No sessions, cookies, JWTs, or tokens exist anywhere in `src/`. No auth library is installed.
- Login returns `{ok, username, branch, role}` and the client stores those three strings in localStorage. That is the whole "session".
- Every server route that needs identity reads a `username` or `performedBy` string from the query string or JSON body and trusts it.
- There is no `middleware.ts`. `/portal/*` has no server-side protection; the portal page is a client shell.
- Role checks that do exist (faculty-only task creation, admin-only announcements and grade release) verify the role of the *named* user in the database. They confirm the named user's permissions, not the caller's identity. Supplying a privileged username is enough.

Consequences already confirmed live: [BUG-001](./06_BUG_REGISTRY.md#bug-001) (injection login bypass), [BUG-002](./06_BUG_REGISTRY.md#bug-002) (no-credential grade writes), [BUG-004](./06_BUG_REGISTRY.md#bug-004) (IDOR reads), [BUG-005](./06_BUG_REGISTRY.md#bug-005) (IDOR writes), [BUG-006](./06_BUG_REGISTRY.md#bug-006) (roster PII), [BUG-007](./06_BUG_REGISTRY.md#bug-007) (audit trail), [BUG-009](./06_BUG_REGISTRY.md#bug-009) (localStorage spoof).

## Injection surfaces

| Surface | Status |
| :--- | :--- |
| Query-string params into Mongo filters | Safe. `searchParams.get()` always yields strings, so `{"$ne":null}` style objects cannot arrive this way |
| JSON body fields into Mongo filters | Vulnerable. `username`, `performedBy`, `branch`, `subjectCode`, `sectionKeys`, `announcementId` reach filters as-is ([BUG-010](./06_BUG_REGISTRY.md#bug-010)). Login is the worst case: full auth bypass ([BUG-001](./06_BUG_REGISTRY.md#bug-001)) |
| SQL injection | Not applicable (MongoDB, no SQL layer) |
| XSS | React escapes by default; I found no `dangerouslySetInnerHTML` in the codebase. The stored-junk path (`"[object Object]"`) renders as inert text |
| Path traversal | No file upload/download handlers exist; nothing to traverse |
| CSRF | Currently moot: no cookies are used, so a cross-site request carries no ambient credentials. Relevant again the moment session cookies are introduced; set SameSite then |

## Secrets and configuration

- Plaintext password storage and comparison: [BUG-003](./06_BUG_REGISTRY.md#bug-003) (Critical)
- `DEV_CREDENTIALS` (`juan.santos/student123`) bundled into client JS regardless of environment; Face ID panel auto-logs-in with it: [BUG-012](./06_BUG_REGISTRY.md#bug-012)
- `.env.local` is gitignored (verified) and the committed `example.env.local` holds a placeholder only. Good hygiene there.
- `next.config.ts`: `typescript.ignoreBuildErrors: true` (type errors ship silently), `reactStrictMode: false`, `allowedDevOrigins: ["*.space-z.ai"]`. No security headers anywhere: live response check showed no CSP, no HSTS, no X-Frame-Options, no X-Content-Type-Options, no Referrer-Policy, plus `X-Powered-By: Next.js`. See [BUG-016](./06_BUG_REGISTRY.md#bug-016)
- `Caddyfile` adds no headers either; its `XTransformPort` query-param hop is a dev convenience worth reviewing before any production deploy
- The MongoDB credential in the test brief is a real username/password pair for the cluster. It reached me in plaintext and works. Recommend rotating it and, for production, scoping the DB user to the specific database with least privilege. Redacted here per the safety rules.

## Rate limiting and abuse

- Login and change-password accept unlimited attempts. 8 rapid failures produced 8 normal 401s, no 429, no lockout ([BUG-013](./06_BUG_REGISTRY.md#bug-013))
- Change-password requires exactly one guessable secret (the current plaintext password) and has no throttle, so online brute force is practical
- No CAPTCHA or backoff anywhere

## Performance observations

Single-request latencies on localhost (dev server, warm):

| Endpoint | Observed |
| :--- | :--- |
| GET `/api/faculty?username=m.reyes` | 40 to 77 ms |
| GET `/api/student?username=juan.santos` | 21 to 27 ms |

Fast enough locally, but the shapes matter at scale:

- `/api/faculty` runs at least 4 sequential collection queries plus an in-memory roster assembly per request; it also queries subjects by `professor: <full name string>`, so every request depends on exact string equality with a display name. Renaming a professor orphans their classes (currently consistent, checked in [03](./03_DATABASE_FINDINGS.md))
- `/api/grades/update` does `findOne` + `updateOne` per row in a loop: N rows means 2N round trips, no transaction. Fine for a class of 30, worth batching if a section ever exceeds a few hundred
- `createIndex` calls run inside request handlers (notifications, announcements/read, attendance): [BUG-017](./06_BUG_REGISTRY.md#bug-017)
- No pagination on list endpoints (tasks, announcements, audits capped at 200). Fine at current volumes; audits has a limit, the others do not
- No caching layer exists; nothing caches sensitive data (also nothing to invalidate). Acceptable

## Observability

- Server-side `console.error` logging exists in every catch block, which is the right instinct. Nothing structured, no request IDs, no log levels
- The grade audit trail is a good idea undermined by silent failure: `try { insertMany(audits) } catch {}` in three routes ([BUG-011](./06_BUG_REGISTRY.md#bug-011))
- No health endpoint beyond the `/api` hello-world stub, no metrics, no alerting. For a school portal this is tolerable now, worth one health route that pings MongoDB

## What is done right

Worth protecting these while fixing the rest:

- Generic error messages everywhere; no stack traces reached the client in 75 probes
- Per-period release gating enforced server-side in `/api/student`
- Atomic task-submit guard (`submitted: false` + `submissionsClosed` in the filter)
- Teaching-load scoping for task creation and notifications (sections outside the performer's load are rejected)
- Consistent 400/401/403/404 semantics on the well-guarded endpoints
- Unique indexes where they matter (usernames, enrollment per term, attendance per session)
