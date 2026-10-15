# Environments — dev / staging / production

The portal has three runtime environments. One module decides which one
is active — `src/lib/env.ts` — and every env-sensitive consumer
(session signing, Mongo connection, the DevBanner) reads from it.

## How the environment is resolved

First match wins:

1. `APP_ENV` — explicit override (`development` | `staging` | `production`).
   Use it when neither of the below says the truth: a bare `next start`
   on a self-hosted staging box, or local production drills.
2. `VERCEL_ENV` — Vercel sets `production` for the main deployment,
   `preview` for every PR/preview deployment, `development` for `vercel dev`.
   **Preview deployments classify as staging.**
3. `NODE_ENV=production` — a production build served outside Vercel.
4. Otherwise — `development`.

## The matrix

| | development | staging (Vercel Preview) | production (Vercel) |
|---|---|---|---|
| Where vars live | `.env.local` (gitignored) | Vercel → Settings → Environment Variables, **Preview** scope | Vercel → Settings → Environment Variables, **Production** scope |
| `MONGODB_URI` | local mongod / Atlas QA cluster | Atlas QA cluster | Atlas production cluster |
| `MONGODB_DB` | `aics_portal` (seeded) | **`aics_portal_staging`** (auto-default) | `aics_portal` (set it explicitly) |
| `AUTH_SECRET` | optional (insecure fallback + warning) | **required** — login refuses without it | **required** |
| Cloudinary | fake values OK (upload features 503) | QA cloud if exercising uploads | production cloud |
| Banner | amber "UNDER DEVELOPMENT" | sky "STAGING PREVIEW" | none |
| Deploy | `bun run dev` | automatic per PR | automatic on merge to main |

Key safety properties (enforced in `src/lib/env.ts`):

- **Staging can never silently write production data.** When
  `MONGODB_DB` is unset, staging defaults to `aics_portal_staging`;
  production keeps the `aics_portal` default (existing Vercel deploys
  rely on it) but logs a loud warning so the gap is visible.
- **Shared URLs never sign sessions with the dev fallback secret.**
  `AUTH_SECRET` shorter than 16 chars throws in staging and
  production; only localhost development gets the fallback warning.
- **One boot diagnostic per process**: the first Mongo connection logs
  `[mongo] connected — env=… db=… authSecret=…`, so "which environment
  am I actually on" is answerable from the logs at a glance.

## Setting up a new environment

1. Local: `cp example.env.local .env.local`, fill in real values.
   Seed with `node scripts/seed-mongodb.ts`.
2. Staging: in Vercel set `MONGODB_URI`, `AUTH_SECRET`,
   `MONGODB_DB=aics_portal_staging` (+ Cloudinary if needed) with
   **Preview** scope. Open any PR — the preview URL now runs against
   the staging database with the sky banner.
3. Production: same vars with **Production** scope;
   `MONGODB_DB=aics_portal` explicitly. Atlas credentials live only in
   Vercel — never in the repo.

## QA / throwaway databases

Verification harnesses (`scripts/verify-*.sh`) and drills can point
`MONGODB_DB` at scratch databases (`aics_portal_qa`) without touching
dev/staging/prod. The password-rehash tooling additionally refuses to
run at all unless `MONGODB_DB` is set explicitly — the printed `db:`
line is the last human check before `--apply`.

## Related

- `example.env.local` — the committed template (all vars, per-env notes)
- `scripts/rehash-passwords.ts` + `docs/password-rehash-runbook.md` —
  environment-aware operations tooling
- `.github/workflows/ci.yml` — CI gates (lint + typecheck)
