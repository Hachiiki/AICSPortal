# Contributing to AICS Student Portal

Thank you for your interest in contributing! This is an independent, student-built portal for the **Asian Institute of Computer Studies (AICS)**, not a school initiative. Whether you're fixing a bug, adding a feature, or improving documentation, your help is welcome.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Commit Messages](#commit-messages)
- [Pull Requests](#pull-requests)
- [Reporting Bugs](#reporting-bugs)
- [Requesting Features](#requesting-features)

---

## Code of Conduct

Be respectful and constructive. This project is built by and for the AICS community. Treat fellow contributors, maintainers, and the broader school community with respect. Discriminatory, harassing, or otherwise inappropriate behavior will not be tolerated.

---

## Getting Started

1. **Fork** the repository on GitHub.
2. **Clone** your fork locally:
   ```bash
   git clone https://github.com/<your-username>/AICSPortal.git
   cd AICSPortal
   ```
3. **Add the upstream remote** so you can sync with the main repo:
   ```bash
   git remote add upstream https://github.com/Hachiiki/AICSPortal.git
   ```

---

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+ or [Bun](https://bun.sh/)
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster or local MongoDB instance

### Install dependencies

```bash
npm install
```

### Environment variables

Create a `.env.local` file in the project root:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/?appName=Cluster0
```

### Seed the database

The seeder is maintenance tooling that ships on the dev branch (`main-full-dev`), not on `main`. From a checkout of the dev branch:

```bash
node --experimental-strip-types scripts/seed-mongodb.ts
```

### Start the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

**Demo accounts** (development mode only, after seeding the dev branch):

| Role | Username |
| --- | --- |
| Student | `juan.santos` |
| Faculty | `m.reyes` |
| Admin | `admin` |

Demo passwords are no longer published in this contributor guide. The
local dev seed uses fixed documented defaults (ask the project owner, or
see the dev branch's seed script and agent guide, where the
local-testing values still appear), and any remote/production seed
requires the values to be injected via environment variables — see
`docs/authz/credential-rotation-runbook.md` on the dev branch. Git
history still contains the previously published values, so treat the
demo credentials as public until the runbook's rotation phase is
executed; removing this table only stops re-publishing them here.

### Run the linter and type checker

```bash
npm run lint
npm run typecheck
```

CI runs both on every pull request, plus a production whitelist guard and the authorization unit tests. PRs into `main` must only touch source and root config files (dev tooling lives on the dev branch) — with one tracked exception: the focused authorization suites (`src/lib/authz/scopes.test.ts`, the route-level wiring suite `src/lib/authz/grades-update-write.test.ts`, and their shared `bun-test.d.ts` type shim) ship on `main`, so the ownership and grading-period write-guard regressions run in CI on production branches too. The wiring suite substitutes the database and session seams with mocks, so it runs without a database. The remaining authz test files stay dev-only unless the maintainers explicitly port them.

---

## Making Changes

1. **Create a branch** off `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b <feature-branch-name>
   ```

2. **Make your changes.** Keep commits focused and atomic.

3. **Test your changes**: verify the dev server still runs, the linter passes, types check, and (if you have Bun installed — CI uses it) the focused authorization suite passes:
   ```bash
   npm run lint
   npm run typecheck
   bun test src/lib/authz/
   ```

4. **Sync with upstream** before opening a PR:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/) for consistency:

```
<type>(<scope>): <description>

[optional body]
```

**Types:**
| Type | Purpose |
| --- | --- |
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, whitespace, CSS changes (no logic change) |
| `refactor` | Code restructuring without behavior change |
| `perf` | Performance improvement |
| `test` | Adding or updating tests |
| `chore` | Build, config, or tooling changes |

**Examples:**
```
feat(academics): add PDF export for grade history
fix(auth): handle expired session gracefully
docs: update README with new API routes
refactor(schedule): extract grid constants to lib/schedule.ts
```

---

## Pull Requests

1. Open a PR against the `main` branch from your feature branch.
2. Give the PR a clear, descriptive title (use the same convention as commit messages).
3. In the PR description, explain:
   - **What** the change does
   - **Why** the change is needed
   - **How** to test it
4. Link any related issues with `Fixes #<issue>` or `Closes #<issue>`.
5. Keep PRs small and focused. One logical change per PR is ideal.
6. A maintainer will review your PR and may request changes before merging.

---

## Reporting Bugs

If you find a bug, please [open an issue](https://github.com/Hachiiki/AICSPortal/issues/new) with the following information:

- **Description**: what happened and what you expected to happen
- **Steps to reproduce**: how to trigger the bug
- **Environment**: OS, browser, Node.js version
- **Screenshots**: if applicable, include a screenshot or screen recording

---

## Requesting Features

Feature requests are welcome! Please [open an issue](https://github.com/Hachiiki/AICSPortal/issues/new) and describe:

- **The problem** you're trying to solve
- **Your proposed solution** (if you have one)
- **Any alternatives** you've considered

Check the roadmap on the dev branch (`main-full-dev`) first. Your idea may already be planned.

---

Thank you for contributing to AICS Student Portal!
