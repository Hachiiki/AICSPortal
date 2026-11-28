import { createHmac } from 'node:crypto'
import { isIP } from 'node:net'
import { MongoServerError, type Collection } from 'mongodb'
import type { NextRequest } from 'next/server'
import { getAppEnv, getAuthSecret } from '@/lib/env'
import { getCollection } from '@/lib/mongodb/connection'

type RateLimitResult = { ok: boolean; retryAfterSec: number }
type RateLimitBucket = { _id: string; count: number; expiresAt: Date }

const localBuckets = new Map<string, RateLimitBucket>()
let localChecks = 0
const deniedUntil = new Map<string, number>()
const MAX_CACHED_DENIALS = 2_048
let bucketCollection: Promise<Collection<RateLimitBucket>> | undefined

function getBuckets(): Promise<Collection<RateLimitBucket>> {
  if (!bucketCollection) {
    bucketCollection = (async () => {
      const collection: Collection<RateLimitBucket> = await getCollection<RateLimitBucket>('rate_limit_buckets')
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0, maxTimeMS: 3_000 })
      return collection
    })().catch((error: unknown) => {
      bucketCollection = undefined
      throw error
    })
  }
  return bucketCollection
}

function resultFor(bucket: RateLimitBucket, limit: number): RateLimitResult {
  if (bucket.count <= limit) return { ok: true, retryAfterSec: 0 }
  return {
    ok: false,
    retryAfterSec: Math.max(1, Math.ceil((bucket.expiresAt.getTime() - Date.now()) / 1_000)),
  }
}

function localRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  localChecks += 1
  if (localChecks % 1_024 === 0) {
    for (const [id, bucket] of localBuckets) {
      if (bucket.expiresAt.getTime() <= now) localBuckets.delete(id)
    }
  }
  const existing = localBuckets.get(key)
  const bucket = existing && existing.expiresAt.getTime() > now
    ? existing
    : { _id: key, count: 0, expiresAt: new Date(now + windowMs) }
  bucket.count = Math.min(bucket.count + 1, limit + 1)
  localBuckets.set(key, bucket)
  return resultFor(bucket, limit)
}

export async function rateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1' && getAppEnv() === 'development') {
    return localRateLimit(key, limit, windowMs)
  }

  // Persist opaque bucket IDs so usernames and IP addresses are not stored in the limiter.
  const bucketId = createHmac('sha256', getAuthSecret()).update('rate-limit:').update(key).digest('hex')
  // Requests already denied by Mongo can be dropped locally until the
  // authoritative window expires, avoiding more writes during a flood.
  const cachedExpiry = deniedUntil.get(bucketId)
  if (cachedExpiry !== undefined) {
    const remaining = cachedExpiry - Date.now()
    if (remaining > 0) return { ok: false, retryAfterSec: Math.ceil(remaining / 1_000) }
    deniedUntil.delete(bucketId)
  }

  const collection = await getBuckets()
  const expired = { $lte: [{ $ifNull: ['$expiresAt', new Date(0)] }, '$$NOW'] }
  const update = [
    {
      $set: {
        count: { $cond: [expired, 1, { $min: [{ $add: ['$count', 1] }, limit + 1] }] },
        expiresAt: { $cond: [expired, { $add: ['$$NOW', windowMs] }, '$expiresAt'] },
      },
    },
  ]
  const options = { upsert: true, returnDocument: 'after' as const, maxTimeMS: 2_000 }
  const increment = () => collection.findOneAndUpdate({ _id: bucketId }, update, options)
  let bucket
  try {
    bucket = await increment()
  } catch (error) {
    // Concurrent upserts can race on a new bucket's unique _id. The losing
    // upsert made no write and can safely apply its single increment again.
    if (!(error instanceof MongoServerError) || error.code !== 11000) throw error
    bucket = await increment()
  }
  if (!bucket) throw new Error('Rate limit bucket update returned no document.')
  const result = resultFor(bucket, limit)
  if (!result.ok) {
    if (deniedUntil.size >= MAX_CACHED_DENIALS) {
      const oldest = deniedUntil.keys().next().value
      if (oldest !== undefined) deniedUntil.delete(oldest)
    }
    deniedUntil.set(bucketId, bucket.expiresAt.getTime())
  }
  return result
}

export const CRON_CLEANUP_PATH = '/api/notifications/cleanup'

export type TierName = 'auth' | 'read' | 'write' | 'cron' | 'health' | 'page'

const RATE_TIERS: Record<TierName, { limit: number; windowMs: number }> = {
  auth: { limit: 100, windowMs: 5 * 60_000 },
  read: { limit: 300, windowMs: 5 * 60_000 },
  write: { limit: 120, windowMs: 5 * 60_000 },
  cron: { limit: 12, windowMs: 5 * 60_000 },
  health: { limit: 120, windowMs: 60_000 },
  page: { limit: 300, windowMs: 60_000 },
}

export function apiTier(pathname: string, method: string): TierName {
  if (pathname === '/api/auth/login' || pathname === '/api/auth/demo') return 'auth'
  if (pathname === '/api') return 'health'
  if (pathname === CRON_CLEANUP_PATH) return 'cron'
  return method === 'GET' || method === 'HEAD' ? 'read' : 'write'
}

export function checkRequestRateLimit(tier: TierName, identity: string): Promise<RateLimitResult> {
  const { limit, windowMs } = RATE_TIERS[tier]
  return rateLimit(`request:${tier}:${identity}`, limit, windowMs)
}

export function clientIp(request: Pick<NextRequest, 'headers'>): string {
  // Vercel overwrites this header at ingress. Self-hosted deployments may
  // opt in only when Caddy is the sole ingress and overwrites its own header.
  const header = process.env.VERCEL === '1'
    ? 'x-forwarded-for'
    : process.env.TRUST_CADDY_PROXY === '1'
      ? 'x-aics-client-ip'
      : null
  const address = header ? request.headers.get(header)?.trim() : undefined
  if (!address || address.includes('%')) return 'unknown-ip'
  const version = isIP(address)
  if (version === 4) return address
  if (version === 6) return new URL(`http://[${address}]`).hostname.slice(1, -1)
  return 'unknown-ip'
}
