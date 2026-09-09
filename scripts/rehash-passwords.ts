// One-time production password rehash (Phase 7 — DO NOT RUN without an
// explicit maintenance window + a students-collection backup).
//
// What it does, per account with a non-hashed `password`:
//   1. scrypt-hashes the current plaintext value (same scheme as
//      src/lib/password.ts: `scrypt$<saltHex>$<hashHex>`)
//   2. verifies the hash round-trips against the plaintext
//   3. writes { password: hash } AND bumps tokenVersion (+1), killing
//      every pre-existing session token (Phase 6.5 revocation)
// Abort policy: any round-trip mismatch aborts the whole run BEFORE
// any further writes (docs already written stay hashed — rerunning is safe
// because hashed docs are skipped). Logs counts only, NEVER passwords.
//
// Usage (from repo root):
//   node --experimental-strip-types scripts/rehash-passwords.ts            # dry run
//   node --experimental-strip-types scripts/rehash-passwords.ts --apply    # real run
//
// Pre-flight (manual, required):
//   1. Export backup: students collection -> JSON, stored encrypted.
//   2. Confirm maintenance window (all users will be logged out).
//   3. Rotate the shared Mongo credential AFTER the run.

import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { scrypt as _scrypt, randomBytes, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

config({ path: '.env.local' })

const scrypt = promisify(_scrypt)
const APPLY = process.argv.includes('--apply')
const dbName = process.env.MONGODB_DB || 'aics_portal'

async function hashPassword(plain: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derived = (await scrypt(plain, salt, 64)) as Buffer
  return `scrypt$${salt}$${derived.toString('hex')}`
}

async function roundTrips(plain: string, hash: string): Promise<boolean> {
  const [, salt, hashHex] = hash.split('$')
  if (!salt || !hashHex) return false
  const derived = (await scrypt(plain, salt, 64)) as Buffer
  const expected = Buffer.from(hashHex, 'hex')
  return derived.length === expected.length && timingSafeEqual(derived, expected)
}

async function main() {
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not set. Add it to .env.local')
    process.exit(1)
  }
  console.log(`Mode: ${APPLY ? 'APPLY (writes!)' : 'DRY RUN (no writes)'} — db: ${dbName}`)
  const client = new MongoClient(process.env.MONGODB_URI)
  await client.connect()
  const col = client.db(dbName).collection('students')

  const total = await col.countDocuments({})
  const alreadyHashed = await col.countDocuments({ password: { $regex: '^scrypt\\$' } })
  const candidates = await col
    .find({ $or: [{ password: { $not: { $regex: '^scrypt\\$' } } }, { password: { $exists: true } }] })
    .project({ username: 1, password: 1 })
    .toArray()
  const todo = candidates.filter((d: any) => typeof d.password === 'string' && !d.password.startsWith('scrypt$'))

  console.log(`Total accounts: ${total}; already hashed: ${alreadyHashed}; to rehash: ${todo.length}`)
  if (!APPLY) {
    console.log('Dry run complete. Re-run with --apply inside the maintenance window.')
    await client.close()
    return
  }

  let done = 0
  for (const doc of todo as any[]) {
    const hash = await hashPassword(doc.password)
    if (!(await roundTrips(doc.password, hash))) {
      console.error(`Round-trip mismatch for account #${done + 1} — aborting before further writes.`)
      process.exit(2)
    }
    await col.updateOne(
      { _id: doc._id },
      { $set: { password: hash }, $inc: { tokenVersion: 1 } }
    )
    done++
    if (done % 10 === 0) console.log(`  … ${done}/${todo.length}`)
  }

  const remaining = await col.countDocuments({
    password: { $exists: true },
    $nor: [{ password: { $regex: '^scrypt\\$' } }],
  })
  console.log(`Rehashed: ${done}. Remaining plaintext: ${remaining}. All users logged out (tokenVersion bumped).`)
  if (remaining !== 0) process.exit(2)
  await client.close()
}

main().catch((err) => {
  console.error('Rehash failed:', err?.message || err)
  process.exit(1)
})
