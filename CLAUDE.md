# CLAUDE.md: AICS Portal Agent Guide

> Single source of truth for AI coding agents in this repo.
> `AGENTS.md` delegates here. Read this file before any code task.
> Always apply `unslop` to output (no AI tells / slop).

## 1. Project Identity & Overview

**AICS StudentFacultyAdmin Portal**: digital student information system for Asian Institute of Computer Studies (AICS), replacing paper enrollment, grades, schedules, and document requests.

Stack: **Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind CSS 4 + shadcn/ui (New York, Radix) + MongoDB Atlas (native driver v7) + Framer Motion + Lucide + jsPDF + Sonner + Vercel Analytics**. See `package.json`.

Key domain (single-context, see `@CONTEXT.md`):
- `branch` tenant string (e.g. `commonwealth`) on every doc, all reads filter `{branch, ...}`. No DB per branch.
- `student` / `faculty` both live in `students` collection, distinguished by `role`. `faculty.fullName` must match `subjects.professor`.
- `subject enrollment` = one doc per `studentUsername x code x academicYear/semester` with `prelim/midterm/finals/finalGrade/remarks` + per-period `*Status` (`''|draft|submitted|released`).
- `section` source of truth is `students.section`, not `subjects`. Roster groups by `code|academicYear|semester`.
- `INC` stored as string `"INC"`, counts as 0 in final math: `final = prelim*0.3 + midterm*0.3 + finals*0.4`.
- `grade audit` in `grade_audits` per save/submit/release with `branch/studentUsername/subjectCode/academicYear/semester/period/oldValue/newValue/action/performedBy/performedAt/note`.

Core flows:
- Auth `POST /api/auth/login` → scrypt verify (legacy plaintext upgrades on login), issues a signed session JWT (jose HS256, httpOnly cookie, 8 h, `tv` revocation counter). `src/proxy.ts` enforces it on every `/api` + `/portal` route; each route re-verifies `tokenVersion` via `getAuthedSession`. Client localStorage (`aics_username`/`branch`/`role`, `useAuth` via `useSyncExternalStore`) is display state only, never a source of authority.
- Faculty roster `GET /api/faculty?username=` → subjects where `professor===fullName` + branch → unique students.
- Grade workflow per period: `PATCH /api/grades/update` (draft) → `POST /api/grades/submit` (draft→submitted) → `POST /api/grades/release` (submitted→released). Student API only shows `released` periods.

## 2. Current Focus

> Update this section on every phase change. Keep 3-5 lines max.

- All three portals feature-complete: student (incl. profile photo upload), faculty (teaching loop closed, epic #31), admin (dashboard stats, release queue, students & faculty directory, professors/events/announcements/enrollment management). Details in `@TODO.md`.
- Infra hardening done: session auth + revocation, scrypt hashing, tiered rate limits, Zod on every route, error boundaries, CI (lint + typecheck + whitelist guard). Remaining: in-memory rate limiter → Redis at scale.
- Sign-in flow: Route Trail progress animation + workspace-assemble post-login flow in production (PRs #53/#54, 2026-10-20); `/dev/auth-preview` retired, no dev-only auth surfaces remain.
- Content moderation live (English + Filipino) on every persisting write; Filipino reviewer sign-off still open (owner action, `@TODO.md`).
- QA: Sep-2026 audit closed. 18 bugs (3 Critical) fixed or accepted, archived in `docs/done/qa_reports/`.
- Authorization review (2026-10-21): 5-phase RBAC/ABAC centralization under way. Phases 1-3 live in `docs/authz/` (enforcement map with findings C1..L6, centralized design, implementation plan with commit slicing and the sign-off checklist). Phase 4 implementation waits on owner sign-off of that checklist; no route code touched yet, all work on `main-full-dev` only.
- Unslop content pass (2026-10-21): em dashes and curly quotes removed from every user-visible string and all living docs per `.agents/skills/unslop`; legal pages, README, CLAUDE/CONTEXT/TODO, docs/ tree. Owner follow-ups: legal name spelling (Willard vs Wilard), lawyer review of policy pages.
- Deferred by owner: dark mode toggle (2026-10-14), real Face ID, In/Out log. Do not start unprompted.

## 3. Build and Test Commands / Common Terminal Commands

```bash
npm install
npm run dev          # next dev -p 3000 → http://localhost:3000
npm run build        # next build (must pass before PR)
npm start            # next start (prod preview)
npm run lint         # eslint . (eslint-config-next core-web-vitals + typescript)
npm run typecheck    # tsc --noEmit (CI runs lint + typecheck on every PR/push)

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
AICSPortal/
├── src/
│   ├── app/
│   │   ├── layout.tsx, page.tsx, globals.css
│   │   ├── portal/[...slug]/   # SPA catch-all for refresh support
│   │   └── api/                # auth (+session/logout/change-password/demo), student
│   │                           #   (+update, photo, photo/cleanup), tasks (+submit,
│   │                           #   grade), faculty (+tasks/submissions, history),
│   │                           #   grades (update/submit/release/audits), attendance,
│   │                           #   events, professors, enrollment, announcements
│   │                           #   (+read, bulk-delete), notifications (+sent,
│   │                           #   cleanup), materials (+sign, [id]),
│   │                           #   admin (stats/people/enrollment)
│   ├── components/
│   │   ├── auth/    # LoginView, CredentialsForm, FaceIdPanel, post-login/
│   │   │            #   (PostLoginTransition: Route Trail + WorkspaceAssemble)
│   │   ├── portal/  # Dashboard, profile, academics, events, sidebar, topbar,
│   │   │            #   PortalShell, assemble-entrance, announcements deck
│   │   ├── faculty/ # FacultyDashboard, FacultyStudentsPage, FacultyGradeEncodingPage, etc.
│   │   ├── admin/   # AdminDashboardPage, AdminReleasePage, AdminPeoplePage,
│   │   │            #   AdminProfessorsPage, AdminEventsPage,
│   │   │            #   AdminAnnouncementsPage, AdminEnrollmentPage
│   │   └── ui/      # shadcn/ui primitives (button, dialog, dropdown, sonner) — do not hand-edit
│   └── lib/
│       ├── utils.ts              # cn() — use everywhere for classes
│       ├── session.ts            # JWT sign/verify, cookie helpers, spoofCheck
│       ├── session-auth.ts       # getAuthedSession + tokenVersion revocation
│       ├── password.ts           # scrypt hash/verify, legacy upgrade-on-login
│       ├── rate-limit.ts         # tiered limiter (auth/read/write) + route throttles
│       ├── env.ts, http.ts, validation.ts   # env matrix, HttpError, Zod schemas
│       ├── moderation/           # EN + Filipino engine, url-policy, allowlist, log
│       ├── aics/                 # types, nav-config.ts, use-faculty-rows.ts,
│       │                         #   use-student-data.ts, use-portal-route.ts
│       └── mongodb/              # connection.ts (lazy singleton), queries.ts, types.ts
├── scripts/seed-mongodb.ts + verify-* runbooks (dev branch only)
├── public/, aics/ (roadmap), docs/, .superdesign/, graphify-out/
├── Caddyfile (port 81 reverse proxy), components.json, tailwind.config.ts, next.config.ts
```

Architecture rules:
- One `PortalShell` (`src/components/portal/PortalShell.tsx`) + one nav config (`src/lib/aics/nav-config.ts`). New tabs only touch nav config + routes + one page component.
- Shared faculty logic lives in `src/lib/aics/use-faculty-rows.ts` (`sections/enrichedStudents/gradeRows/computedFinalINCasZero`). Do not duplicate roster/grade rebuilds.
- Branch-scoped queries always. `student.section` is source of truth, never `subjects.section`.
- Deck cards `z 3/2/1` inside `isolate`, Topbar `z-20`. Do not break layering.

## 5. Code Style and Conventions / Coding Conventions & Style

- TypeScript 5, React 19, App Router server/client boundary respected. `'use client'` only where needed (portal shell, interactive pages).
- Styling: Tailwind 4 + `cn()` from `src/lib/utils.ts`. shadcn New York style, Radix primitives. Icons Lucide only. Animations Framer Motion: single fade-up in shell, `AnimatePresence` for drawers, and the sanctioned post-login pair. Route Trail sign-in journey (`src/components/auth/post-login/`) + workspace-assemble entrance (`src/components/portal/assemble-entrance.tsx`). Dark variant exists (`@custom-variant dark`) but toggle not wired, do not half-wire.
- Naming: `PascalCase` components (`FacultyGradeEncodingPage`), `camelCase` hooks/utils (`useFacultyRows`, `computedFinalINCasZero`), API routes `route.ts` with exported `GET/POST/PATCH`. Types in `src/lib/mongodb/types.ts` + `src/lib/aics/`.
- Grades: `INC` string, badge amber, sorts last. `remarksFor()` / `badgeForRemarks()` helpers. Reuse, don't reinvent.
- No `any` drift beyond existing lint relaxations. `eslint.config.mjs` currently off for many rules. Do not rely on that. Write clean typed code.
- Comments: concise, no chain-of-thought essays. No emojis unless asked.
- File ops: use Read/Edit/Write/Glob/Grep tools, never `cat/sed/echo` via bash. Bash is for `npm/gh/next` commands only.
- Todos: use TodoWrite for 3+ step work, exactly one `in_progress`, mark `completed` only after verification.

## 6. Workflow and Boundaries

- Plan before code: `Request -> Plan -> Execute -> Verify -> Deliver`. Break large work into testable chunks, small PRs.
- Orchestration: on complex tasks use `project-orchestrator` to analyze, map to best skill(s), announce `To accomplish this, I will use: [...]`, always include `unslop`.
- Commits: ALWAYS commit every change made (standing user instruction). Before commit inspect `git status/diff/log --oneline -10`, stage only intended files, never commit secrets/`.env.local`/`.next/`. Never `--force`, `--no-verify`, or config changes unless asked. PRs/pushes only when explicitly requested.
- Never: modify `.env.local`, rotate keys, edit `src/components/ui/` primitives by hand, create `*.md` docs unless asked, ` subjects.section` writes, unchecked `Select All` on faculty notify (default nothing checked).
- Sensitive: credentials are never logged or exposed to the client; passwords are scrypt-hashed with legacy upgrade-on-login. Any auth change must preserve `performedBy` role check (faculty for update/submit, admin for release, same branch, 403 otherwise).

### 6a. Branch topology, main is production, main-full-dev is dev (HARD RULE)

`main` carries production files ONLY. The whitelist is `src/`, `public/`, `.vscode/`, `.github/` (CI) plus the 15 root files (`.gitignore`, `CONTRIBUTING.md`, `Caddyfile`, `LICENSE`, `README.md`, `components.json`, `eslint.config.mjs`, `example.env.local`, `next-env.d.ts`, `next.config.ts`, `package.json`, `postcss.config.mjs`, `tailwind.config.ts`, `tsconfig.json`, `vercel.json`). Everything else is a dev artifact and NEVER goes to main.

`main-full-dev` carries the same code plus the tracked dev artifacts: `.agents/`, `.superdesign/`, `aics/`, `docs/`, `graphify-out/`, `scripts/`, `AGENTS.md`, `CLAUDE.md`, `CONTEXT.md`, `TODO.md`, `skills-lock.json` (this file is itself a dev artifact, it does not exist on main). `.gitignore` anchors all 11 dev paths at the repo root: on any main-based branch they do not exist and a stray `git add .` cannot pick them up; on main-full-dev they are tracked, and tracked files are unaffected by ignore rules. History: PR #39 leaked dev files into main via a branch cut from a pre-cleanup main; fixed by PR #41.

**Golden rule.** Port dev work onto main, never merge dev into main:

1. `git checkout main && git pull`
2. `git checkout -b feature/<short-name>`: cut FROM MAIN, so dev files do not exist on it
3. Port ONLY the changed files: `git checkout main-full-dev -- <explicit paths>`, list every path, never bare `-- .`
4. Review `git status`. The PR carries exactly the paths you list, nothing else
5. Local gate (optional, runs from any branch): `git show main-full-dev:scripts/check-pr-whitelist.sh | bash`
6. Push and open the PR into `main`. CI (`.github/workflows/ci.yml` on main) enforces lint + typecheck + a full-tree whitelist guard. The PR fails if ANY tracked file sits outside the whitelist, which catches even branches cut from an old main (how the PR #39 leak happened).
7. After the PR merges, sync the safe direction only: `git checkout main-full-dev && git pull && git merge main && git push`. Main -> dev merges never delete dev files.

Forbidden moves: PR, merge, or rebase FROM `main-full-dev` INTO `main`. CI notes: GitHub only recognizes workflow files that sit DIRECTLY in `.github/workflows/` (a `docs/` subfolder there is dead weight); the source of truth is parked at `docs/ci-workflow.yml` on main-full-dev; API tokens without `workflow` scope cannot touch `.github/workflows/**`, that file is created or changed only through the GitHub web UI by the repo owner.

## 7. Behavioral Guardrails & Rules (hard constraints)

1. Always filter Mongo reads by `branch`. Missing branch filter = bug.
2. Grade writes require `performedBy` + role check server-side. Never trust client role alone. `update/submit` faculty-only, `release` admin-only, same branch.
3. Per-period statuses only (`prelimStatus/midtermStatus/finalsStatus`). Never use legacy `gradeStatus` for new logic.
4. `INC = 0` in final math, display `INC` badge. Never coerce to NaN.
5. Hide `dropped/transferred` in Grade Encoding, keep visible in My Students with `X hidden` count.
6. Student API must gate each period on `released`, else `-`/`Pending`.
7. Audit every grade save/submit/release to `grade_audits`. Silent audit failure = bug.
8. No `createIndex` inside request handlers. No raw `$ne`/operator injection. Sanitize login input (see QA BUG-001).
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

## 9. Agent Skills & Memory Routing (mandatory)

Session-start checklist. Do this every session/task and state skill names explicitly:
1. `memory search` (scope `project` first, then `all-projects`) + `memory profile` for prefs/QA findings before touching auth/grades.
2. Codebase question? → `graphify` query on `graphify-out/` BEFORE Glob/Grep.
3. Pick 1+ skills from router below, announce them. Never generic when a specialized skill exists.
4. `TodoWrite` for 3+ step work. `unslop` on all output.

Router: task type → skill(s). 26 on-disk skills in `.agents/skills/`, mirrored in `skills-lock.json`:
- Understand: `graphify`, how does X work, architecture, file relations. God nodes: `Student (48), View (37), Task (35), PortalEvent (32), Professor (31), cn() (20), getCollection() (16)`.
- Decide: `grilling`, vague plan/decision stress-test (design-tree rounds/frontier). `wayfinder`, work >1 session → map + decision tickets. `to-spec`, conversation → spec to tracker, no interview.
- Track: `triage`, issues/PRs via `needs-triage/needs-info/ready-for-agent/ready-for-human/wontfix` (PRs NOT a request surface here).
- Build: `coding-agent`, all impl plan→execute→verify. `writing-plans`, spec ready, before code, saves `docs/plans/`. `tdd`, test-first/red-green, agree seams first. `diagnosing-bugs`, broken/slow, build pass/fail loop, redact secrets. `resolving-merge-conflicts`, mid-merge/rebase, never `--abort`. `agent-browser`, browser navigate/click/type/snapshot to verify login→roster→grades flows.
- Design: `superdesign`, mandatory for new pages/flows/design-system (canvas first, check `.superdesign/design-system.md`). `redesign-existing-projects`, upgrade existing UI scan→diagnose→fix, no rewrite. `webdesign-ui`, quick review/guide for Tailwind/CSS/typography. `ui-ux-pro-max`, full UX deliverable + impl plan. `visual-design-foundations`, tokens/type/color/spacing/dark-mode. `web-design-guidelines`: Vercel audit, `file:line` output. `charts`, charts/diagrams/dashboards (no matplotlib for diagrams). `web-shader-extractor`: ONLY on URL + rip-shader request.
- Setup/knowledge/docs: `wizard`, human-only secrets/setup/migration (bash wizard, never for agent-doable steps). `writing-for-agents`, editing skills/`CLAUDE.md`/`AGENTS.md`. `web-search` / `web-reader` / `VLM`, backend-only z-ai SDK (search, extract URL, vision chat). `seo-content-writer`, public pages/help articles only (portal is auth-gated).
- `opencode-mem` plugin: always consult before starting; `memory add` durable learnings (tags: `qa, faculty-portal, auth, grades`). Sep-2026 QA (18 bugs, 3 Critical) + PR #14 live in memory.
- `unslop`: always in plan, applied to all text/code output.

Domain doc consumption (single-context): before exploring read `@CONTEXT.md`, then `docs/adr/` touching the area. Use glossary vocabulary verbatim in titles/tests/proposals. If output contradicts an ADR, surface explicitly: `_Contradicts ADR-000X (...), but worth reopening because…_`. Missing CONTEXT/ADR files → proceed silently, create lazily via `/domain-modeling` only when terms resolve.

Issue tracker ops (`gh` inside clone infers repo):
- List: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
- View: `gh issue view <n> --comments` (+ labels via jq); bare `#42` may be PR. Try `gh pr view 42` fallback.
- Write: `gh issue create/comment/edit/close` per `@docs/agents/issue-tracker.md`. Wayfinding map/claim/resolve flows per that file.

## 10. References to Documentation

- `@CONTEXT.md`: glossary, core flows, non-goals
- `@TODO.md`: phase status, remaining gaps
- `@README.md`: setup, API table, roadmap
- `@docs/agents/issue-tracker.md`: gh conventions, PR policy (no), wayfinding ops
- `@docs/agents/domain.md`: single-context layout, ADR/glossary rules
- `@docs/agents/triage-labels.md`: canonical roles → label strings
- `@docs/adr/`: 0001 branch-as-field … 0006 auth-on-grade-writes
- `@docs/faculty-build-plan.md`: `@docs/faculty-roadmap.md`
- `@docs/done/qa_reports/` + `@docs/done/qa_evidence/`: Sep-2026 QA verdict + logs/snapshots
- `@graphify-out/GRAPH_REPORT.md` + `graph.json`, code graph, communities, god nodes
- `@.superdesign/design-system.md`: design tokens, replica templates
- `@src/lib/mongodb/types.ts`: `@src/lib/mongodb/queries.ts`, `@src/lib/mongodb/connection.ts`
- `@src/lib/aics/use-faculty-rows.ts`: `@src/lib/aics/nav-config.ts`
- `@src/components/portal/PortalShell.tsx`
- `@aics/AICS StudentFacultyAdmin Portal ROADMAP.txt`: 11-phase roadmap
- `@components.json`: `@tailwind.config.ts`, `@next.config.ts`, `@tsconfig.json`

## 11. Preserved AGENTS.md content (canonical, now delegated)

### Issue tracker
Issues and specs live in GitHub issues. See `docs/agents/issue-tracker.md`.

### Domain docs
Single-context layout. See `docs/agents/domain.md`.

### Triage labels
Default triage roles mapped to issue labels. See `docs/agents/triage-labels.md`.
