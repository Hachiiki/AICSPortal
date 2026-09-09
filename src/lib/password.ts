// Password hashing without new deps (BUG-003 incremental).
// Uses Node crypto.scrypt; stored format: `scrypt$<saltHex>$<hashHex>`.
// Legacy plaintext passwords verify via fallback and upgrade on next login.
// Full bulk rehash of existing 77 accounts is NEEDS_APPROVAL (see scripts/rehash-passwords.ts plan).

import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(_scrypt)

export function isHashed(v: unknown): boolean {
  return typeof v === 'string' && v.startsWith('scrypt$')
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(plain, salt, 64)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

export async function verifyPassword(plain: string, stored: unknown): Promise<{ ok: boolean; upgradedHash?: string }> {
  if (typeof plain !== 'string' || typeof stored !== 'string') return { ok: false }
  if (isHashed(stored)) {
    const [, salt, hashHex] = stored.split('$')
    if (!salt || !hashHex) return { ok: false }
    const derived = (await scrypt(plain, salt, 64)) as Buffer
    const expected = Buffer.from(hashHex, 'hex')
    if (derived.length !== expected.length) return { ok: false }
    return { ok: timingSafeEqual(derived, expected) }
  }
  // Legacy plaintext fallback — caller should upgrade to hash on success.
  if (stored === plain) {
    return { ok: true, upgradedHash: await hashPassword(plain) }
  }
  return { ok: false }
}
