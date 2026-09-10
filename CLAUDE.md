# CLAUDE.md — AICS Portal Agent Guide

> Single source of truth for AI coding agents in this repo.
> `AGENTS.md` delegates here. Read this file before any code task.
> Always apply `unslop` to output (no AI tells / slop).

## 1. Project Identity & Overview

**AICS StudentFacultyAdmin Portal** — digital student information system for Asian Institute of Computer Studies (AICS), replacing paper enrollment, grades, schedules, and document requests.

Stack: **Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui (New York, Radix) + MongoDB Atlas (native driver v7) + Framer Motion + Lucide + jsPDF + Sonner + Vercel Analytics**. See `package.json`.

Key domain (single-context, see `@CONTEXT.md`):
- `branch` tenant string (e.g. `commonwealth`) on every doc, all reads filter `{branch, ...}`. No DB per branch.
- `student` / `faculty` both live in `students` collection, distinguished by `role`. `faculty.fullName` must match `subjects.professor`.
- `subject enrollment` = one doc per `studentUsername x code x academicYear/semester` with `prelim/midterm/finals/finalGrade/remarks` + per-period `*Status` (`''|draft|submitted|released`).
- `section` source of truth is `students.section`, not `subjects`. Roster groups by `code|academicYear|semester`.
- `INC` stored as string `"INC"`, counts as 0 in final math: `final = prelim*0.3 + midterm*0.3 + finals*0.4`.
- `grade audit` in `grade_audits` per save/submit/release with `branch/studentUsername/subjectCode/academicYear/semester/period/oldValue/newValue/action/performedBy/performedAt/note`.

Core flows:
- Auth `POST /api/auth/login` → client `localStorage aics_username/branch/role`, `useAuth` hydrates via `useSyncExternalStore`. No session token yet (plaintext passwords — see guardrails).
- Faculty roster `GET /api/faculty?username=` → subjects where `professor===fullName` + branch → unique students.
- Grade workflow per period: `PATCH /api/grades/update` (draft) → `POST /api/grades/submit` (draft→submitted) → `POST /api/grades/release` (submitted→released). Student API only shows `released` periods.

## 2. Current Focus

> Update this section on every phase change. Keep 3-5 lines max.

- Student portal: functional, gaps are mobile-responsive, dark mode wiring, profile photo upload.
- Faculty portal: core tabs live, previous-records live, attendance live. History drawer + release queue verified.
- Admin portal: only release queue + seed admin (`admin/admin123`) live. Dashboard / CRUD not started.
- Infra debt: password hashing, session tokens, rate limiting, Zod validation, error boundaries, CI/CD — all open, see `@TODO.md`.
- QA: 18 confirmed bugs (3 Critical) in `docs/done/qa_reports/` (all fixed or accepted, archived Sep-2026), top was NoSQL injection on login + plaintext passwords + grade role-check gap. Fix order was: sessions+middleware → hashing → grade guards.

## 3. Build and Test Commands / Common Terminal Commands

```bash
npm install
npm run dev          # next dev -p 3000 → http://localhost:3000
npm run build        # next build (must pass before PR)
npm start            # next start (prod preview)
npm run lint         # eslint . (eslint-config-next core-web-vitals + typescript)

# DB (Prisma scripts exist but runtime uses native mongodb driver v7 via src/lib/mongodb/connection.ts)
npm run db:push
npm run db:generate
npm run db:migrate
npm run db:reset

# Seed / verify (requires .env.local with MONGODB_URI, MONGODB_DB=aics_portal)
node --experimental-strip-types scripts/seed-mongodb.ts
node --experimental-strip-types scripts/verify-tasks.ts  # if present, replaces tsc check for tasks data

# GitHub issues (issue tracker)
gh issue list --state open --json number,title,body,labels,comments
gh issue view <number> --comments
gh issue create --title "..." --body "..."
```

Env: `MONGODB_URI` required, `MONGODB_DB` default `aics_portal`, `NODE_ENV=development` enables demo login (`juan.santos/student123`, `m.reyes/faculty123`, `admin/admin123`). Never commit `.env.local`. See `example.env.local`.

No unit test runner configured. Verification = `npm run build` + `npm run lint` + manual browser check + API curl against local dev. Do not invent `npm test`.

## 4. Project Structure

```
loginAICSPortal/
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── portal/[...slug]/   # SPA catch-all for refresh support
│   │   └── api/                # auth, student, faculty, faculty/tasks, faculty/history,
│   │                           # tasks, tasks/[taskId]/submit, events, professors,
│   │                           # enrollment, announcements, announcements/read,
│   │                           # notifications, attendance, grades/update|submit|release|audits
│   ├── components/
│   │   ├── auth/    # Login, credentials form, FaceId panel, branch redirect
│   │   ├── portal/  # Dashboard, profile, academics, events, sidebar, topbar, PortalShell
│   │   ├── faculty/ # FacultyDashboard, FacultyStudentsPage, FacultyGradeEncodingPage, etc.
│   │   ├── admin/   # AdminReleasePage
│   │   └── ui/      # shadcn/ui primitives (button, dialog, dropdown, sonner) — do not hand-edit
│   └── lib/
│       ├── utils.ts              # cn() — use everywhere for classes
│       ├── schedule.ts
│       ├── aics/                 # types, nav-config.ts, use-faculty-rows.ts, formatting, palette
│       └── mongodb/              # connection.ts (lazy singleton), queries.ts, types.ts
├── scripts/seed-mongodb.ts, verify-tasks.ts
├── public/, aics/ (roadmap), docs/, .superdesign/, graphify-out/
├── Caddyfile (port 81 reverse proxy), components.json, tailwind.config.ts, next.config.ts
```

Architecture rules:
- One `PortalShell` (`src/components/portal/PortalShell.tsx`) + one nav config (`src/lib/aics/nav-config.ts`). New tabs only touch nav config + routes + one page component.
- Shared faculty logic lives in `src/lib/aics/use-faculty-rows.ts` (`sections/enrichedStudents/gradeRows/computedFinalINCasZero`). Do not duplicate roster/grade rebuilds.
- Branch-scoped queries always. `student.section` is source of truth, never `subjects.section`.
- Deck cards `z 3/2/1` inside `isolate`, Topbar `z-20` — do not break layering.

## 5. Code Style and Conventions / Coding Conventions & Style

- TypeScript 5, React 19, App Router server/client boundary respected. `'use client'` only where needed (portal shell, interactive pages).
- Styling: Tailwind 4 + `cn()` from `src/lib/utils.ts`. shadcn New York style, Radix primitives. Icons Lucide only. Animations Framer Motion (single fade-up in shell, `AnimatePresence` for drawers). Dark variant exists (`@custom-variant dark`) but toggle not wired — do not half-wire.
- Naming: `PascalCase` components (`FacultyGradeEncodingPage`), `camelCase` hooks/utils (`useFacultyRows`, `computedFinalINCasZero`), API routes `route.ts` with exported `GET/POST/PATCH`. Types in `src/lib/mongodb/types.ts` + `src/lib/aics/`.
- Grades: `INC` string, badge amber, sorts last. `remarksFor()` / `badgeForRemarks()` helpers — reuse, don't reinvent.
- No `any` drift beyond existing lint relaxations. `eslint.config.mjs` currently off for many rules — do not rely on that, write clean typed code.
- Comments: concise, no chain-of-thought essays. No emojis unless asked.
- File ops: use Read/Edit/Write/Glob/Grep tools, never `cat/sed/echo` via bash. Bash is for `npm/gh/next` commands only.
- Todos: use TodoWrite for 3+ step work, exactly one `in_progress`, mark `completed` only after verification.

## 6. Workflow and Boundaries

- Plan before code: `Request -> Plan -> Execute -> Verify -> Deliver`. Break large work into testable chunks, small PRs.
- Orchestration: on complex tasks use `project-orchestrator` — analyze, map to best skill(s), announce `To accomplish this, I will use: [...]`, always include `unslop`.
- Commits: ALWAYS commit every change made (standing user instruction). Before commit inspect `git status/diff/log --oneline -10`, stage only intended files, never commit secrets/`.env.local`/`.next/`. Never `--force`, `--no-verify`, or config changes unless asked. PRs/pushes only when explicitly requested.
- Never: modify `.env.local`, rotate keys, edit `src/components/ui/` primitives by hand, create `*.md` docs unless asked, ` subjects.section` writes, unchecked `Select All` on faculty notify (default nothing checked).
- Sensitive: passwords plaintext today — do not log them, do not expose in client bundle, do not add new plaintext flows. Any auth change must preserve `performedBy` role check (faculty for update/submit, admin for release, same branch, 403 otherwise).

## 7. Behavioral Guardrails & Rules (hard constraints)

1. Always filter Mongo reads by `branch`. Missing branch filter = bug.
2. Grade writes require `performedBy` + role check server-side. Never trust client role alone. `update/submit` faculty-only, `release` admin-only, same branch.
3. Per-period statuses only (`prelimStatus/midtermStatus/finalsStatus`). Never use legacy `gradeStatus` for new logic.
4. `INC = 0` in final math, display `INC` badge. Never coerce to NaN.
5. Hide `dropped/transferred` in Grade Encoding, keep visible in My Students with `X hidden` count.
6. Student API must gate each period on `released`, else `-`/`Pending`.
7. Audit every grade save/submit/release to `grade_audits`. Silent audit failure = bug.
8. No `createIndex` inside request handlers. No raw `$ne`/operator injection — sanitize login input (see QA BUG-001).
9. Faculty identity: hide COE/documents/Digital ID/GPA/Year+Section for faculty; show department facts. Topbar/profile read `Faculty + ID number`.
10. GlobalSearch is role-aware (faculty: pages+subjects+roster+tasks only; students: own index; admins: pages only).
11. Prefetch history + task groups once per session at portal load; tab revisits must not refetch.
12. Verify everything before delivery (see §8). Never deliver untested code.

## 8. Definition of Done (machine-checkable)

- [ ] `npm run lint` passes (no new warnings in touched files)
- [ ] `npm run build` passes (`next build` clean)
- [ ] Branch filter present on every new Mongo query (`grep branch`)
- [ ] Grade endpoints enforce `performedBy` role + same-branch (403 path tested)
- [ ] `INC` math + badge + sort-last verified
- [ ] Student visibility gated on `released` (manual curl as student)
- [ ] Audit doc written for grade writes (check `grade_audits`)
- [ ] Role-aware UI verified in browser as student + faculty (+ admin if touched), screenshots for UI changes
- [ ] No secrets in diff, no `.env.local`/`.next/` committed
- [ ] TodoWrite items marked `completed` only after above

## 9. Agent Skills & Memory Routing

Route via `project-orchestrator`. Never generic when a specialized skill exists.

- `coding-agent` — all code impl: plan → execute → verify. Check `~/code/memory.md` if exists, store prefs only on explicit `Remember...`.
- `diagnosing-bugs` — slow/broken/failing/throwing reports. Use for QA follow-ups.
- `tdd` — test-first features/fixes when user says red-green-refactor or wants integration tests.
- `triage` — GitHub issues/PRs through `needs-triage/needs-info/ready-for-agent/ready-for-human/wontfix` (see `@docs/agents/triage-labels.md`). This repo: PRs are NOT a request surface.
- `wayfinder` — work too big for one session: map issue (`wayfinder:map`) + child tickets (`wayfinder:<type>`) + native dependencies.
- `grill-with-docs` / `improve-codebase-architecture` / `prototype` / `to-spec` / `to-questionnaire` — specs, ADRs, glossary via `/domain-modeling` lazy creation.
- `graphify` — **mandatory first step for any codebase question** (`how does X work?`, architecture, file relations). Query `graphify-out/` (`graph.json/graph.html/GRAPH_REPORT.md`) before Glob/Grep. God nodes: `Student (48), View (37), Task (35), PortalEvent (32), Professor (31), cn() (20), getCollection() (16)`. 16 communities, 0 import cycles. Treat any input as graph query first.
- `superdesign` — **mandatory for UI design/redesign/prototypes/variants/design-system work**. Check `@.superdesign/design-system.md` + `replica_html_template/` first, design on Superdesign canvas, then implement with shadcn/Tailwind tokens. Also `ui-ux-pro-max` + `visual-design-foundations` + `web-design-guidelines` for review, `redesign-existing-projects` for upgrades.
- `opencode-mem` plugin — **always consult before starting**: search project memory (`memory search`) for prefs, QA findings, prior decisions; `memory profile` for user style; `memory add` to store durable learnings (tags: `qa, faculty-portal, auth, grades`). Scope `project` first, then `all-projects`. The Sep-2026 QA pass (18 bugs, 3 Critical) and PR #14 context live in memory — recall before touching auth/grades.
- `unslop` — always in plan, applied to all text/code output.
- Others available (`fullstack-dev`, `charts`, `pdf`, `xlsx`, `resolving-merge-conflicts`, `wizard`, `writing-plans`, `writing-for-agents`) — pick decisively per task.

Domain doc consumption (single-context): before exploring read `@CONTEXT.md`, then `docs/adr/` touching the area. Use glossary vocabulary verbatim in titles/tests/proposals. If output contradicts an ADR, surface explicitly: `_Contradicts ADR-000X (...), but worth reopening because…_`. Missing CONTEXT/ADR files → proceed silently, create lazily via `/domain-modeling` only when terms resolve.

Issue tracker ops (`gh` inside clone infers repo):
- List: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
- View: `gh issue view <n> --comments` (+ labels via jq); bare `#42` may be PR — try `gh pr view 42` fallback.
- Write: `gh issue create/comment/edit/close` per `@docs/agents/issue-tracker.md`. Wayfinding map/claim/resolve flows per that file.

## 10. References to Documentation

- `@CONTEXT.md` — glossary, core flows, non-goals
- `@TODO.md` — phase status, remaining gaps
- `@README.md` — setup, API table, roadmap
- `@docs/agents/issue-tracker.md` — gh conventions, PR policy (no), wayfinding ops
- `@docs/agents/domain.md` — single-context layout, ADR/glossary rules
- `@docs/agents/triage-labels.md` — canonical roles → label strings
- `@docs/adr/` — 0001 branch-as-field … 0006 auth-on-grade-writes
- `@docs/faculty-build-plan.md`, `@docs/faculty-roadmap.md`
- `@docs/done/qa_reports/` + `@docs/done/qa_evidence/` — Sep-2026 QA verdict + logs/snapshots
- `@graphify-out/GRAPH_REPORT.md` + `graph.json` — code graph, communities, god nodes
- `@.superdesign/design-system.md` — design tokens, replica templates
- `@src/lib/mongodb/types.ts`, `@src/lib/mongodb/queries.ts`, `@src/lib/mongodb/connection.ts`
- `@src/lib/aics/use-faculty-rows.ts`, `@src/lib/aics/nav-config.ts`
- `@src/components/portal/PortalShell.tsx`
- `@aics/AICS StudentFacultyAdmin Portal ROADMAP.txt` — 11-phase roadmap
- `@components.json`, `@tailwind.config.ts`, `@next.config.ts`, `@tsconfig.json`

## 11. Preserved AGENTS.md content (canonical, now delegated)

### Issue tracker
Issues and specs live in GitHub issues. See `docs/agents/issue-tracker.md`.

### Domain docs
Single-context layout. See `docs/agents/domain.md`.

### Triage labels
Default triage roles mapped to issue labels. See `docs/agents/triage-labels.md`.
