export type AppEnv = 'development' | 'staging' | 'production'

export function getAppEnv(): AppEnv {
  if (process.env.VERCEL_ENV === 'production') return 'production'
  if (process.env.VERCEL_ENV === 'preview') return 'staging'
  const override = process.env.APP_ENV
  if (override === 'production' || override === 'staging') return override
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export function getAuthSecret(): Uint8Array {
  const configured = process.env.AUTH_SECRET
  if (!configured || Buffer.byteLength(configured, 'utf8') < 32) {
    throw new Error('AUTH_SECRET must be a randomly generated secret at least 32 bytes long.')
  }
  return new TextEncoder().encode(configured)
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
  const appEnv = getAppEnv()
  if (explicit) {
    if (appEnv === 'staging' && explicit === 'aics_portal') {
      throw new Error('Staging must use its own MongoDB database.')
    }
    return { uri, dbName: explicit }
  }

  if (appEnv !== 'development') throw new Error('MONGODB_DB must be configured for this environment.')
  const dbName = 'aics_portal'
  return { uri, dbName }
}
