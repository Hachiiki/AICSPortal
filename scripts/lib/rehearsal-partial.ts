// Rehearsal drill: construct a deterministic PARTIAL-rotation state.
//
// Rotates the FIRST <count> carriers of the NEW demo values back to the
// OLD documented defaults (fresh scrypt salts, tokenVersion 0) — exactly
// the state a mid-run --apply crash or concurrency-guard abort would
// leave behind. The rehearsal then proves recovery via the sanctioned
// --rollback (runbook: partial-rotation failure handling).
//
// AIMS AT THE THROWAWAY REHEARSAL DATABASE ONLY (never production):
// verify-rotate-rehearsal.sh drives it via MONGODB_URI/MONGODB_DB env
// plus the same DEMO_PW_* env vars the --apply step used.

import { MongoClient } from 'mongodb'
// @ts-expect-error: explicit .ts import required by node --experimental-strip-types at runtime
import { hashPassword, verifyPassword } from '../../src/lib/password.ts'

const OLD = { student: 'student123', faculty: 'faculty123', admin: 'admin123' } as const
const NEW = {
  student: process.env.DEMO_PW_STUDENT!,
  faculty: process.env.DEMO_PW_FACULTY!,
  admin: process.env.DEMO_PW_ADMIN!,
} as const

async function main() {
  const count = Number(process.argv[2])
  if (!Number.isInteger(count) || count <= 0) {
    console.error('usage: node --experimental-strip-types scripts/lib/rehearsal-partial.ts <count>')
    process.exit(2)
  }
  for (const key of ['student', 'faculty', 'admin'] as const) {
    if (!NEW[key]) {
      console.error(`DEMO_PW_${key.toUpperCase()} is not set`)
      process.exit(2)
    }
  }
  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  const col = client.db(process.env.MONGODB_DB!).collection('students')
  const rows = await col.find({}, { projection: { password: 1, tokenVersion: 1 } }).toArray()
  let reverted = 0
  for (const d of rows as any[]) {
    if (reverted >= count) break
    for (const key of ['student', 'faculty', 'admin'] as const) {
      if ((await verifyPassword(NEW[key], d.password)).ok) {
        await col.updateOne(
          { _id: d._id },
          { $set: { password: await hashPassword(OLD[key]), tokenVersion: 0 } }
        )
        reverted++
        break
      }
    }
  }
  console.log(JSON.stringify({ requested: count, reverted }))
  await client.close()
}

main().catch((err) => {
  const safe = String(err?.message ?? err).replace(/mongodb(\+srv)?:\/\/\S+/g, '<redacted-uri>')
  console.error(`[rehearsal-partial] ERROR: ${safe}`)
  process.exit(1)
})
