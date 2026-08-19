# Contributing to AICS Student Portal

Thank you for your interest in contributing! This project is a capstone initiative to digitize student information systems at the **Asian Institute of Computer Studies (AICS)**. Whether you're fixing a bug, adding a feature, or improving documentation, your help is welcome.

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
   git clone https://github.com/<your-username>/loginAICSPortal.git
   cd loginAICSPortal
   ```
3. **Add the upstream remote** so you can sync with the main repo:
   ```bash
   git remote add upstream https://github.com/Hachiiki/loginAICSPortal.git
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

```bash
node --experimental-strip-types scripts/seed-mongodb.ts
```

### Start the development server

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

**Demo credentials** (development mode only):
- Username: `juan.santos`
- Password: `student123`

### Run the linter

```bash
npm run lint
```

---

## Making Changes

1. **Create a branch** off `main`:
   ```bash
   git checkout main
   git pull upstream main
   git checkout -b <feature-branch-name>
   ```

2. **Make your changes.** Keep commits focused and atomic.

3. **Test your changes** — verify the dev server still runs and the linter passes:
   ```bash
   npm run lint
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
5. Keep PRs small and focused — one logical change per PR is ideal.
6. A maintainer will review your PR and may request changes before merging.

---

## Reporting Bugs

If you find a bug, please [open an issue](https://github.com/Hachiiki/loginAICSPortal/issues/new) with the following information:

- **Description** — what happened and what you expected to happen
- **Steps to reproduce** — how to trigger the bug
- **Environment** — OS, browser, Node.js version
- **Screenshots** — if applicable, include a screenshot or screen recording

---

## Requesting Features

Feature requests are welcome! Please [open an issue](https://github.com/Hachiiki/loginAICSPortal/issues/new) and describe:

- **The problem** you're trying to solve
- **Your proposed solution** (if you have one)
- **Any alternatives** you've considered

Check the [roadmap](./aics/AICS%20StudentFacultyAdmin%20Portal%20ROADMAP.txt) first — your idea may already be planned.

---

Thank you for contributing to AICS Student Portal!
