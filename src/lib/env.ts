// Environment layer — the single module that decides what
// "development / staging / production" means and which variables each
// requires. Edge-safe by construction (zod + TextEncoder only, no
// node: imports): imported by the proxy session path as well as
// node-only Mongo code.
//
// Environment derivation (first match wins):
//   1. APP_ENV          — explicit override for non-Vercel deploys and drills
//   2. VERCEL_ENV       — production | preview | development on Vercel
//                         (preview deployments classify as STAGING)
//   3. NODE_ENV=production → production (bare `next start` elsewhere)
//   4. otherwise        — development
//
// Rules enforced here:
//   - AUTH_SECRET: required (16+ chars) in staging and production —
//     shared URLs must never sign sessions with the dev fallback.
//     Development falls back with a loud console warning.
//   - MONGODB_DB: staging defaults to aics_portal_staging so preview
//     deployments cannot silently write production data. Production
//     keeps the aics_portal default (Vercel deploys rely on it) but
//     logs a warning when it falls back — set it explicitly.
// See docs/environments.md for the full matrix and procedures.

export type AppEnv = 'development' | 'staging' | 'production'

export function getAppEnv(): AppEnv {
  const override = process.env.APP_ENV
  if (override === 'development' || override === 'staging' || override === 'production') {
    return override
  }
  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'staging'
  if (process.env.NODE_ENV === 'production') return 'production'
  return 'development'
}

const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-change-in-production'

/** Session signing secret. Throws in staging/production when unset or too short. */
export function getAuthSecret(): Uint8Array {
  const configured = process.env.AUTH_SECRET
  if (configured && configured.length >= 16) {
    return new TextEncoder().encode(configured)
  }
  const appEnv = getAppEnv()
  if (appEnv !== 'development') {
    throw new Error(
      `AUTH_SECRET is not set (or shorter than 16 chars). Set a strong secret for ${appEnv} before deploying.`
    )
  }
  console.warn(
    '[env] AUTH_SECRET missing, using insecure dev fallback. Set AUTH_SECRET for any shared deploy.'
  )
  return new TextEncoder().encode(DEV_FALLBACK_SECRET)
}

export interface MongoEnv {
  uri: string
  dbName: string
}

/** Mongo connection config. Throws when MONGODB_URI is missing; db name resolves per env. */
export function getMongoEnv(): MongoEnv {
  const uri = process.env.MONGODB_URI
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Copy example.env.local to .env.local and fill it in.')
  }
  const explicit = process.env.MONGODB_DB
  if (explicit) return { uri, dbName: explicit }

  const appEnv = getAppEnv()
  // Staging must never land on the production database by accident.
  const dbName = appEnv === 'staging' ? 'aics_portal_staging' : 'aics_portal'
  if (appEnv !== 'development') {
    console.warn(`[env] MONGODB_DB not set, defaulting to "${dbName}" for ${appEnv}. Set it explicitly.`)
  }
  return { uri, dbName }
}

/** One-line environment identity for logs and boot diagnostics. */
export function envSummary(): string {
  const appEnv = getAppEnv()
  const db = process.env.MONGODB_DB ?? (appEnv === 'staging' ? 'aics_portal_staging' : 'aics_portal')
  const authSecret = appEnv === 'development' && !process.env.AUTH_SECRET ? 'fallback' : 'configured'
  return `env=${appEnv} db=${db} authSecret=${authSecret}`
}
