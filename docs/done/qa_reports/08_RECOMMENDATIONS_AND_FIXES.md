[⬅️ Back to Index](./00_INDEX.md)

# 08 Recommendations and fixes

Fix order matters more than usual here, because each layer makes the next one simpler. Sessions first, then the injection hole, then password hashing, then the endpoint guards. Code sketches target this repo's actual file layout.

## Priority 1: server-side sessions and middleware (fixes BUG-009, shrinks 001/002/004/005/006/007)

<a id="fix-bug-009"></a>
1. Install `jose` (or accept the dependency of next-auth). On login success, set an httpOnly, SameSite=Lax, secure cookie containing a signed JWT with `{sub: username, role, branch, exp}`.
2. Add `src/middleware.ts` that verifies the JWT for `/portal/*` and `/api/*` except `/api/auth/login` and static assets, and rejects mismatched role/branch claims.
3. In every route, replace the caller-supplied `username`/`performedBy` with the verified claims from the cookie. Delete those parameters from the API surface.
4. Keep the URL shape if you like it, but treat it as display-only. The data hook must fetch the session user, never the path username.

```ts
// src/middleware.ts (sketch)
import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

const PUBLIC = ['/api/auth/login', '/', '/_next', '/favicon']
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  if (PUBLIC.some((p) => pathname.startsWith(p))) return NextResponse.next()
  const token = req.cookies.get('aics_session')?.value
  try {
    const { payload } = await jwtVerify(token!, new TextEncoder().encode(process.env.AUTH_SECRET!))
    const res = NextResponse.next()
    res.headers.set('x-aics-user', String(payload.sub))
    res.headers.set('x-aics-role', String(payload.role))
    res.headers.set('x-aics-branch', String(payload.branch))
    return res
  } catch {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
  }
}
export const config = { matcher: ['/portal/:path*', '/api/:path*'] }
```

Routes then read identity from `request.headers.get('x-aics-user')` (set only by middleware, so it is trustworthy inside the app) instead of query/body.

## Priority 2: kill the login injection (fixes BUG-001, BUG-010)

<a id="fix-bug-001"></a>
Coerce every body field to its expected primitive before it touches a filter. A four-line helper covers the whole app:

```ts
// src/lib/http.ts
export function asString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) throw new HttpError(400, `${field} is required.`)
  return v
}
```

Apply it in `auth/login`:

```ts
const username = asString(body.username, 'username')
const password = asString(body.password, 'password')
```

...and to every body field currently read from `tasks`, `notifications`, `attendance`, `grades/*`, `announcements`, and `announcements/read` (that last one also stops the `[object Object]` rows). Regression test:

```ts
// tests/login-injection.test.ts
it('rejects non-string credentials', async () => {
  const res = await POST(req({ username: { $ne: null }, password: { $ne: null } }))
  expect(res.status).toBe(400)
})
```

## Priority 3: hash passwords (fixes BUG-003)

<a id="fix-bug-003"></a>
1. Add `bcryptjs`. New writes hash at cost 12: change-password and any account-creation path.
2. Login compares with `bcrypt.compare`.
3. Migrate existing plaintext values without a reset campaign: add a `passwordHash` column strategy of hash-on-first-login, or run a one-time script that hashes all current values (plaintext is readable today, so this is possible) and flips a `passwordVersion` flag.

```ts
const ok = await bcrypt.compare(password, student.passwordHash)
```

Keep the regression test: after seeding, `db.students.findOne({ password: { $exists: true } })` must return null.

## Priority 4: grade endpoint guards (fixes BUG-002, BUG-008, parts of 006/007)

<a id="fix-bug-002"></a>
1. With sessions in place, delete the optional `performedBy` pattern. Identity comes from the session; `requireRole('faculty')` and `requireRole('admin')` become one-liners.
2. Enforce professor-of-record honestly instead of the empty if-block:

```ts
if (performer.role === 'faculty' && existing.professor !== performer.fullName && !overrideRequested) {
  return NextResponse.json({ ok: false, error: 'Not your section' }, { status: 403 })
}
// if overrideRequested: still write, but insert an audit entry with action: 'override'
```

<a id="fix-bug-008"></a>
3. Validate grade values before they reach `$set`:

```ts
function validGrade(v: string) {
  return /^(100|[0-9]{1,2}(\.\d{1,2})?|INC)$/.test(v)
}
```

4. `/api/grades/release`: add `if (performer.branch !== branch) return 403` to match tasks/announcements (cross-branch gap, code-confirmed).
5. Stop swallowing audit failures (BUG-011): replace `try { insertMany } catch {}` with a logged failure and a response flag, or make the audit write part of the same transaction as the grade write (MongoDB 7 replica sets support multi-doc transactions).

Regression test for the whole group:

```ts
it('rejects unauthenticated grade writes', async () => {
  const res = await patchJSON('/api/grades/update', { updates: [{}] }, { auth: null })
  expect(res.status).toBe(401)
})
```

## Priority 5: rate limiting (fixes BUG-013)

<a id="fix-bug-013"></a>
No Redis in the stack, so start with an in-memory fixed-window limiter per IP+username in middleware for `/api/auth/*` (10 failures per 15 minutes, then 429 with Retry-After). Note the limit is per server instance; fine for a single-node deployment, revisit before scaling out. Add lockout counters on the student document if you want persistent lockout.

## Priority 6: IDOR cleanup sweep (fixes BUG-004, BUG-005)

<a id="fix-bug-004"></a>
Once middleware sets `x-aics-user`, every handler that currently reads `searchParams.get('username')` switches to it. Student routes additionally assert `role === 'student' || role === 'faculty'` where faculty need read access. Faculty routes (BUG-006) get `requireRole('faculty' | 'admin')`. `/api/grades/audits` (BUG-007) gets `requireRole('faculty' | 'admin')` plus branch scoping. Profile update (BUG-005) allows only the session user, or an admin.

## Priority 7: smaller items

<a id="fix-bug-005"></a><a id="fix-bug-006"></a><a id="fix-bug-007"></a>
- BUG-012: move `DEV_CREDENTIALS` behind `if (process.env.NODE_ENV === 'development')` with a dynamic import, or delete the Face ID mock path before any real deployment.
- BUG-014: return `207`-style semantics or set top-level `ok: successCount > 0` plus a `status` code that reflects failure when everything failed; document whichever you choose in the client hook.
- BUG-015: in the attendance POST, when an attendance doc already exists for the key, require `mode: 'update'` in the body and append `{ updatedAt, updatedBy, changedFields }` to a small `history` array on the doc.
- BUG-016: add headers in `next.config.ts`:

```ts
async headers() {
  return [{ source: '/:path*', headers: [
    { key: 'X-Frame-Options', value: 'DENY' },
    { key: 'X-Content-Type-Options', value: 'nosniff' },
    { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
    { key: 'Permissions-Policy', value: 'camera=(self)' },
  ]}]
}
```

  and set `poweredByHeader: false`, `reactStrictMode: true`, `typescript.ignoreBuildErrors: false`. Add a CSP once you can enumerate the script sources (Next injects inline bootstrap scripts; use nonce-based CSP or start report-only).
- BUG-017: delete the three per-request `createIndex` calls; the seed script already creates them, and the QA run confirmed the full index set exists after seeding.
- BUG-018: wrap seed index creation with retries and a timeout, log progress ("creating index 3/13"), and make the script exit non-zero on failure instead of hanging. Run index creation as a separate `npm run db:indexes` step so data seeding can complete even when index builds stall.

<a id="regression-tests"></a>
## Regression tests

The repo has no test runner. Suggested minimal setup: `vitest` for unit/integration (route handlers can be tested by importing them and passing mocked `NextRequest`s) and Playwright for the two E2E flows that matter (student login to dashboard, faculty grade encode to release). The highest-value first five, in order:

1. Login rejects `{"$ne":null}` bodies with 400 (BUG-001)
2. Grade update/submit without a session cookie return 401 (BUG-002)
3. `GET /api/student` without a cookie returns 401; with student A's cookie and student B's username returns 403 (BUG-004)
4. Faculty-only and admin-only endpoints return 403 to the wrong roles (BUG-006 group)
5. Attendance duplicate POST does not silently replace records (BUG-015)

## Operational follow-ups

- Rotate the MongoDB credential that was shared in the test brief; it reached me in plaintext and has write access to the cluster.
- Check the real `aics_portal` database's index list (BUG-018) to confirm the students unique index exists there.
- Add a `/api/health` route that runs `db.command({ ping: 1 })` and reports connection status.
- Consider structuring logs (JSON with route, status, duration) while touching the catch blocks for BUG-011.
