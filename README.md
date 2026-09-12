# AICS Portal

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com/)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev/)
[![Cloudinary](https://img.shields.io/badge/Cloudinary-uploads-3448C5?logo=cloudinary)](https://cloudinary.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

A multi-role web portal for the **Asian Institute of Computer Studies (AICS)**: a full student portal, a full faculty portal, and a grade-release queue for administrators. The author, a student at the school, built it independently as a project for a course covering system information applications, motivated by how much of the campus still ran on paper. AICS did not sponsor, commission, or endorse it. The original design notes and project paper live in [`aics/`](./aics/). Deployed live on Vercel.

---

## Overview

AICS ran on paper for enrollment records, grade reports, schedules, and document requests. This portal digitizes all of it. Students view released grades, submit tasks, read section notifications, and download their Certificate of Enrollment. Faculty encode and submit grades per period, post tasks, grade submissions, take attendance, and share course materials. Admins review submitted periods and release them to students.

The app is branch-scoped and multi-tenant: one deployment serves every campus branch. Every document in every MongoDB collection carries a `branch` field and every query filters on it. There is one portal shell that switches navigation and permissions by role, not three separate apps. See [`CONTEXT.md`](./CONTEXT.md) for the data model and core flows, and [`docs/adr/`](./docs/adr/) for the decisions behind them.

### Current status (2026-09-12)

| Area | State | Notes |
| --- | --- | --- |
| Student portal | Feature complete | All pages live and QA-verified. Remaining polish: dark mode toggle, profile photo upload |
| Faculty portal | Feature complete | Full teaching loop shipped: encode, submit, release, task grading, attendance + history, materials, messaging |
| Admin portal | Release queue only | Grade release queue and announcements are live; dashboard stats and CRUD management are the next build |
| Security | QA campaign closed | 18 findings, 17 fixed and verified: injection, IDOR, plaintext passwords, client-only auth, rate limiting |
| Interaction loop | Epic #31 closed | Task grading, attendance history, message section, materials, stub cleanup all done |
| Deployment | Live on Vercel | Production smoke tests passed 10/10 on 2026-09-10 |

---

## Features

### Students
- **Credentials login** with scrypt-hashed passwords, plus a demo login button in development
- **Dashboard**: current-term GPA, units, grades table, weekly schedule grid, today's classes, global search, announcement card deck
- **Academics**: grades (released periods only), subject list, tasks with live status (Graded, Pending, Missing, Needs Attention), in-app submission, score and feedback display, **Materials tab** with per-subject files and links from faculty, PDF export
- **Events**: monthly calendar with four categories, task-due overlay, day detail panel
- **Professors**: directory cards with office hours, room, and email
- **Enrollment**: step tracker, fee assessment, requirements, registrar contacts
- **Profile**: personal info, digital ID card, Certificate of Enrollment PDF download
- **Settings**: profile editing, password change, notification toggles
- **Notifications**: section-targeted bell inbox with persistent read state

### Faculty
- **Dashboard**: current-term subjects, stats, announcement deck
- **My Students**: section roster with pagination and sorting, student file drawer, **take attendance**, **attendance history**, **message the section** (notification fan-out), **materials manager** (Cloudinary upload or link), announce-quiz handoff to the Tasks composer
- **Grade Encoding**: per-period grade inputs (prelim, midterm, finals), Fill column, per-period submit (draft → submitted), INC counts as zero in final math, per-row audit history drawer, Dropped/Transferred students hidden
- **Tasks**: post to a subject (fans out to every enrolled student), close/reopen submissions, **submissions drawer with per-student score and feedback grading**, closed tasks side panel
- **Announcements**: notify selected sections, sent history
- **Schedule**: weekly calendar filtered to the faculty member's own sessions
- **Previous Records**: released grades from past terms with search, filters, and CSV export

### Admin
- **Release Queue**: every submitted period per subject and term with student counts, one-click release
- **Announcements**: post to the card deck every role sees

### Platform and security
- Role-aware **session auth**: signed JWT in an httpOnly cookie, revocation via `tokenVersion`, middleware enforcement on every `/api` and `/portal` route
- **scrypt password hashing** with automatic upgrade of legacy plaintext accounts on next login
- **Rate limiting** on the login and auth routes
- **Branch scoping** on every query, IDOR guards on every read and write
- **Grade audit log**: every encode, submit, and release writes a `grade_audits` row
- **Cloudinary signed uploads** for course materials (secret never leaves the server; link-only mode works without Cloudinary configured)

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | [TypeScript 5](https://www.typescriptlang.org/) |
| UI Library | [React 19](https://react.dev/) |
| Styling | [Tailwind CSS 4](https://tailwindcss.com/) + [tw-animate-css](https://github.com/Jerome176/tw-animate-css) |
| Components | [shadcn/ui](https://ui.shadcn.com/) (New York style, Radix UI primitives) |
| Icons | [Lucide React](https://lucide.dev/) |
| Animation | [Framer Motion](https://www.framer.com/motion/) |
| Database | [MongoDB Atlas](https://www.mongodb.com/atlas) (native driver v7) |
| Sessions | [jose](https://github.com/panva/jose) (HS256 JWT, httpOnly cookies) |
| File storage | [Cloudinary](https://cloudinary.com/) (signed direct uploads) |
| PDF generation | [jsPDF](https://github.com/parallax/jsPDF) + [jsPDF-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable) |
| Toasts | [Sonner](https://sonner.emilkowal.dev/) |
| Analytics | [Vercel Analytics](https://vercel.com/analytics) + [Vercel Speed Insights](https://vercel.com/speed-insights) |

---

## Getting started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ (or [Bun](https://bun.sh/))
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (or a local MongoDB instance)
- Optional: a [Cloudinary](https://cloudinary.com/) account, only needed for file uploads in the Materials tab

### 1. Clone the repository

```bash
git clone https://github.com/Hachiiki/AICSPortal.git
cd AICSPortal
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Create a `.env.local` file in the project root (see [`example.env.local`](./example.env.local)):

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/
MONGODB_DB=aics_portal
AUTH_SECRET=<16+ character random string, e.g. output of: openssl rand -hex 32>

# Optional — enable file uploads in the Materials tab.
# Without these, signing returns 503 and the link-only flow keeps working.
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

| Variable | Required | Description |
| --- | --- | --- |
| `MONGODB_URI` | yes | MongoDB connection string |
| `MONGODB_DB` | in production | Database name, must be `aics_portal`. Tooling aborts when unset |
| `AUTH_SECRET` | in production | JWT signing secret, 16+ chars. Production login refuses to run without it; dev falls back with a warning |
| `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` | no | Cloudinary credentials for material file uploads |
| `CLOUDINARY_FOLDER` | no | Base upload folder, default `aics-portal/materials`. Files land in `<folder>/<branch>/<SUBJECT-CODE>/` |
| `BACKUP_KEY` | no | 64-hex-char key for the encrypted backup mode of `scripts/rehash-passwords.ts` maintenance runs |

Never commit `.env.local`. Values live only in your local file and your Vercel project settings.

### 4. Seed the database

```bash
node --experimental-strip-types scripts/seed-mongodb.ts
```

The script auto-loads `.env.local` and populates the **commonwealth** branch: 77 scrypt-hashed accounts (students, faculty, admin), subjects with per-period grade statuses, courses, schedule sessions, tasks, events, announcements, notifications, and one released prior term so Previous Records is not empty.

**Seed logins:**

| Role | Username | Password |
| --- | --- | --- |
| Student | `juan.santos` | `student123` |
| Faculty | `m.reyes` | `faculty123` |
| Admin | `admin` | `admin123` |

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). In development the login page also offers a demo login button that issues a student session without credentials. In production builds (`NODE_ENV=production`) that endpoint returns 404 and session cookies switch to `Secure`.

Other useful commands: `npm run build` (production build), `npm run lint` (ESLint), `npx tsc --noEmit` (type check).

## Using the portal

### Logging in

Enter a username and password. The login route verifies the scrypt hash, issues a signed session cookie, and the app routes by role: students land on the student dashboard, faculty on the faculty workspace, admin on the release queue. Logout revokes the session instantly (it bumps `tokenVersion` in the database, killing every previously issued token for that account).

### As a student (`juan.santos`)

1. The dashboard shows GPA, units, the grades table, the weekly schedule, and the announcement deck. Drag a deck card to dismiss it, dismissals persist per account.
2. Academics holds four tabs. **Grades** shows only periods an admin has released, anything pending displays as `Pending`. **Tasks** lists activities per subject with live status, open one to submit before the due date, after submissions close it turns Missing. **Materials** lists files and links your professors posted per subject.
3. The bell in the topbar is the notification inbox, messages your professors sent to your section land there and keep their read state across refreshes.
4. Profile has the digital ID card and the Certificate of Enrollment PDF download. Settings edits contact info, changes your password, and toggles notification types.

### As faculty (`m.reyes`)

1. **My Students**: expand a section to see the roster. From the section footer you can take attendance, view attendance history, message the whole section, and manage materials (upload files to Cloudinary or post links). Clicking a student opens their full record.
2. **Grade Encoding**: pick a period, type grades, use Fill to copy one grade down, then Submit locks the period pending release. The History button on any row shows the full audit trail of who changed what and when.
3. **Tasks**: post an assignment to a subject, it fans out to every enrolled student. Open the submissions drawer to see who submitted and grade each one with a score and feedback. Close and reopen submissions per task.
4. **Previous Records** shows released grades from past terms, with search, filters, and CSV export.

### As admin (`admin`)

1. **Release Queue** lists every submitted period per subject and term with student counts. Releasing a period makes it visible to every student in that subject.
2. Post announcements from the Announcements page, they appear on every role's card deck.

---

## How the major functions work

The source files carry these explanations as comments in place. These are the actual excerpts.

### Sessions — `src/lib/session.ts`

Login issues a signed JWT in an httpOnly cookie. Every API route derives identity from the session, never from caller-supplied strings.

```ts
export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, branch: claims.branch, tv: claims.tv ?? 0 })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECS}s`)  // 8 hours
    .sign(getAuthSecret())
}
```

The `tv` claim is the revocation counter. It is compared against the user's current `tokenVersion` in the database on every authed request. Logout and password change bump the database value, instantly killing all previously issued tokens.

### Route protection — `src/middleware.ts`

Every `/api` route except the three auth entry points requires a valid session cookie. `/portal` pages bounce anonymous visitors to the login view.

```ts
const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value || '')
if (!session) {
  return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
}
```

When a caller also supplies a legacy identity string (`username` / `performedBy`), `spoofCheck` requires it to match the session or the request is rejected as a spoof attempt.

### Password verification — `src/lib/password.ts`

Hashes use Node's `scrypt` in the format `scrypt$<saltHex>$<hashHex>` with a timing-safe compare. Legacy plaintext accounts still verify, and get upgraded to a hash on that same login.

```ts
// Legacy plaintext fallback — caller should upgrade to hash on success.
if (stored === plain) {
  return { ok: true, upgradedHash: await hashPassword(plain) }
}
```

### Grade workflow and the release gate — `src/app/api/student/route.ts`

Grades move through per-period statuses: teacher saves a period as `draft`, submits it as `submitted`, admin releases it as `released`. Students only ever see released periods, from the student API:

```ts
// Per-period workflow: each period visible only when its status is 'released'.
// '' / draft / submitted → hidden as '-' / Pending.
prelim: prelimStatus === 'released' ? (x.prelim ?? '-') : '-',
midterm: midtermStatus === 'released' ? x.midterm : '-',
```

Every encode, submit, and release appends a row to the `grade_audits` collection (who, what, old value, new value, when) which feeds the History drawer in Grade Encoding.

### Task fan-out — `src/app/api/tasks/route.ts`

One task document is inserted per enrolled student, so each student's submission, score, and feedback stay independent, and closing submissions flips every copy at once:

```ts
const docs: MongoTask[] = usernames.map((studentUsername) => ({
  branch, studentUsername, subjectCode,
  term: { academicYear, semester, yearLevel },
  title, type, description, dueDate, postedDate: now,
  submitted: false, score: null, maxScore: max, feedback: null,
  submissionsClosed: false,
}))
```

Teaching-load is enforced server-side: the `requireTeachingFaculty` helper checks that the session user is faculty, in the same branch, and actually teaches that subject this term.

### Task grading — `src/app/api/tasks/[taskId]/grade/route.ts`

Faculty grade a single student's task with a score (validated against `maxScore`) and optional feedback. From the route header:

```text
Body: { score, feedback?, performedBy?, branch? }
  score: number, 0..maxScore (required)
  feedback: string up to 2000 chars, or null to clear (optional;
    omitted leaves existing feedback untouched)
Faculty only (session). Branch match + teaching-load check via
the shared requireTeachingFaculty helper.
Decision (plan non-goal, refs #32): task scores do NOT write
grade_audits rows. Tasks are not grades.
```

### Materials uploads — `src/app/api/materials/sign/route.ts`

Files upload straight from the browser to Cloudinary using a server-signed signature, so the API secret never reaches the client. From the route header:

```text
Faculty only (session) + teaching-load check. Returns the
signature for ONE direct browser→Cloudinary upload into the
portal's folder tree. The API secret never leaves the server;
only cloudName/apiKey (public identifiers) go to the client.
Without CLOUDINARY_* configured, signing is refused (503)
and the link-only flow remains available.
```

Files are capped at 10 MB with a type allowlist, and deletes destroy the Cloudinary asset with CDN invalidation.

---

## API routes

| Endpoint | Method | Description |
| --- | --- | --- |
| `/api` | GET | Health check |
| `/api/auth/login` | POST | Authenticate, set session cookie |
| `/api/auth/logout` | POST | Revoke session (bumps tokenVersion) |
| `/api/auth/session` | GET | Current session or 401 |
| `/api/auth/demo` | POST | Dev-only demo login, 404 in production |
| `/api/auth/change-password` | POST | Change own password |
| `/api/student` | GET | Student profile, subjects (released periods only), courses, sessions |
| `/api/student/update` | PATCH | Edit own profile |
| `/api/tasks` | GET / POST / PATCH | List own tasks, post (fan-out), close/reopen submissions |
| `/api/tasks/[taskId]/submit` | PATCH | Student submits a task |
| `/api/tasks/[taskId]/grade` | PATCH | Faculty grades one submission (score + feedback) |
| `/api/faculty` | GET | Faculty profile + teaching load |
| `/api/faculty/history` | GET | Released grades grouped by past term |
| `/api/faculty/tasks` | GET | Task groups with submitted/graded counts |
| `/api/faculty/tasks/submissions` | GET | Per-student submission rows for grading |
| `/api/grades/update` | PATCH | Teacher encodes a period (sets draft, writes audit) |
| `/api/grades/submit` | POST | Teacher submits a period (draft → submitted) |
| `/api/grades/release` | GET / POST | Admin: list pending releases / release a period |
| `/api/grades/audits` | GET | Audit trail for grade writes |
| `/api/attendance` | GET / POST | Session history / record attendance per section and date |
| `/api/notifications` | GET / POST / PATCH | Bell inbox / faculty send to sections / mark read |
| `/api/announcements` | GET / POST | Deck announcements, admin posts |
| `/api/announcements/read` | POST / DELETE | Mark deck cards read / undo dismissal |
| `/api/events` | GET | Branch calendar events |
| `/api/professors` | GET | Professor directory |
| `/api/enrollment` | GET | Enrollment steps, fees, requirements |
| `/api/materials` | GET / POST | Role-aware material list / post file record or link |
| `/api/materials/sign` | POST | Cloudinary upload signature (faculty only) |
| `/api/materials/[id]` | DELETE | Delete material and destroy the Cloudinary asset |

All write routes enforce: valid session, role check, branch match, and (for faculty teaching actions) the teaching-load check.

---

## Project structure

```
AICSPortal/
├── scripts/
│   ├── seed-mongodb.ts          # Database seeder (reads .env.local)
│   ├── rehash-passwords.ts      # Bulk scrypt rehash maintenance tool
│   └── verify-tasks.ts          # Task data verification
├── src/
│   ├── middleware.ts            # Session enforcement for /api and /portal
│   ├── app/
│   │   ├── page.tsx             # SPA entry: login view + portal shell
│   │   ├── layout.tsx           # Root layout (fonts, Toaster, Analytics)
│   │   ├── portal/[...slug]/    # Catch-all route for refresh support
│   │   └── api/                 # All routes from the table above
│   ├── components/
│   │   ├── auth/                # Login, credentials form, Face ID panel, branch redirect
│   │   ├── portal/              # Shared shell + student pages (dashboard, academics,
│   │   │                        #   tasks, materials, events, profile, settings...)
│   │   ├── faculty/             # Faculty pages (students, grade encoding, tasks,
│   │   │                        #   previous records, announcements, schedule)
│   │   ├── admin/               # Admin release queue page
│   │   └── ui/                  # shadcn/ui primitives
│   └── lib/
│       ├── session.ts           # JWT sign/verify, cookie helpers, spoofCheck
│       ├── session-auth.ts      # Authed session + tokenVersion revocation check
│       ├── password.ts          # scrypt hash/verify with legacy upgrade
│       ├── rate-limit.ts        # In-memory fixed-window limiter for auth routes
│       ├── aics/                # Domain: nav-config, hooks (use-faculty-rows,
│       │                        #   use-student-data, use-portal-route), types
│       └── mongodb/             # Connection singleton, document types, queries
├── docs/
│   ├── adr/                     # Architecture decision records
│   ├── done/                    # QA campaign reports and evidence
│   ├── faculty-roadmap.md       # Faculty build phases (all complete)
│   ├── student-faculty-interaction-plan.md   # Epic #31 campaign (all complete)
│   └── UI_UX_IMPLEMENTATION_TRACKER.md       # Audit fixes (all complete)
├── aics/                        # The author's source material: project paper, roadmap, pseudocode
└── Caddyfile                    # Self-host reverse proxy config
```

---

## Deployment

### Vercel (current)

The project is deployed at aics-portal.vercel.app. To deploy your own:

1. In Vercel project settings, set `MONGODB_URI`, `MONGODB_DB=aics_portal`, a fresh `AUTH_SECRET` (`openssl rand -hex 32`), and the `CLOUDINARY_*` values if you want file uploads.
2. In Atlas Network Access, allow `0.0.0.0/0` (Vercel has no static egress IPs).
3. Deploy. Production builds disable the demo login endpoint and switch cookies to `Secure`.

### Self-hosted (Caddy)

A `Caddyfile` is included for reverse-proxying the app behind [Caddy](https://caddyserver.com/) on port 81. Caddy provisions HTTPS automatically:

```bash
caddy run
```

---

## What's next

- **Admin portal**: school-wide dashboard stats, events and announcements and professors CRUD, cross-branch student and faculty management, enrollment overrides (tracked in `TODO.md`)
- **Dark mode toggle** (CSS infrastructure exists, the topbar switch is stubbed)
- **Profile photo upload** (placeholder in Settings)
- **Real face recognition** via face-api.js (the Face ID login is currently a mock convenience layer)
- **In/Out log** stays a disabled placeholder until a campus entry/exit data source exists
- **Operational**: rotate the MongoDB credential before real student data goes in (see `docs/done/qa_reports/16_GOLIVE_RUNBOOK.md`), and the rate limiter is in-memory per instance, fine at school scale, revisit before scaling out

---

## Acknowledgments

This is an independent project. AICS did not sponsor, fund, commission, or endorse it, and no school office was involved in building it. The author is a student who wrote it for a course covering system information applications, starting from the things the campus was missing: grade reports printed by hand, scores shuffled between spreadsheets, no single place for schedules, tasks, or documents.

- **Wilard James Paluga** ([@Hachiiki](https://github.com/Hachiiki)): author and maintainer
- The [`aics/`](./aics/) folder keeps the source material: the project paper, the first roadmap, and the core pseudocode
- Built with [Next.js](https://nextjs.org/), [shadcn/ui](https://ui.shadcn.com/), [Tailwind CSS](https://tailwindcss.com/), [MongoDB](https://www.mongodb.com/), and [Cloudinary](https://cloudinary.com/)

---

## License

This project is licensed under the MIT License — see the [LICENSE](./LICENSE) file for details.

