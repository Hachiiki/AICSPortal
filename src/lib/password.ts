import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

const currentCost = { N: 2 ** 17, r: 8, p: 1, maxmem: 160 * 1024 * 1024 }
const legacyCost = { N: 2 ** 14, r: 8, p: 1 }
const HASH_PATTERN = /^scrypt\$(?:(v2)\$)?([a-f0-9]{32})\$([a-f0-9]{128})$/
const dummySalt = randomBytes(16).toString('hex')
const MAX_CONCURRENT_HASHES = 2
const MAX_QUEUED_HASHES = 8
let activeHashes = 0
const waiting: Array<() => void> = []

export class PasswordServiceBusyError extends Error {}

async function derive(plain: string, salt: string, cost: typeof legacyCost): Promise<Buffer> {
  if (activeHashes < MAX_CONCURRENT_HASHES) activeHashes++
  else {
    if (waiting.length >= MAX_QUEUED_HASHES) throw new PasswordServiceBusyError()
    await new Promise<void>((resolve) => waiting.push(resolve))
  }

  try {
    return await new Promise<Buffer>((resolve, reject) => {
      scrypt(plain, salt, 64, cost, (error, hash) => error ? reject(error) : resolve(hash))
    })
  } finally {
    const next = waiting.shift()
    if (next) next()
    else activeHashes--
  }
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const hash = await derive(plain, salt, currentCost)
  return `scrypt$v2$${salt}$${hash.toString('hex')}`
}

export async function verifyPassword(
  plain: string,
  stored: unknown,
  { upgrade = true } = {},
): Promise<{ ok: boolean; upgradedHash?: string }> {
  if (typeof plain !== 'string') return { ok: false }
  const encoded = typeof stored === 'string' ? HASH_PATTERN.exec(stored) : null
  if (encoded) {
    const [, version, salt, hash] = encoded
    const legacy = version === undefined
    const actual = await derive(plain, salt, legacy ? legacyCost : currentCost)
    const ok = timingSafeEqual(actual, Buffer.from(hash, 'hex'))
    return ok && legacy && upgrade ? { ok, upgradedHash: await hashPassword(plain) } : { ok }
  }

  // Match legacy plaintext only while existing accounts migrate. Reserved
  // hash prefixes never enter the plaintext comparison, even if malformed.
  if (typeof stored !== 'string' || stored.startsWith('scrypt$')) {
    await derive(plain, dummySalt, currentCost)
    return { ok: false }
  }
  const digest = (text: string) => createHash('sha256').update(text).digest()
  const ok = timingSafeEqual(digest(plain), digest(stored))
  if (ok && upgrade) return { ok, upgradedHash: await hashPassword(plain) }
  if (!ok) await derive(plain, dummySalt, currentCost)
  return { ok }
}
