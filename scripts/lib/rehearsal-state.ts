// Read-only rehearsal state probe for verify-rotate-rehearsal.sh.
//
// Prints {"total":N,"matched":M,"tvNonzero":K} where `matched` counts
// accounts still carrying one of the three documented demo defaults and
// `tvNonzero` counts accounts with tokenVersion !== 0. The rehearsal
// uses this as its WRITE-CANARY: after every aborting invocation it
// asserts the state is unchanged, proving the failure happened before
// any database write.
//
// AIMS AT THE THROWAWAY REHEARSAL DATABASE ONLY (never production):
// verify-rotate-rehearsal.sh drives it via MONGODB_URI/MONGODB_DB env.

import { MongoClient } from 'mongodb'
// @ts-expect-error: explicit .ts import required by node --experimental-strip-types at runtime
import { verifyPassword } from '../../src/lib/password.ts'

const DEFAULTS = ['student123', 'faculty123', 'admin123'] as const

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  const col = client.db(process.env.MONGODB_DB!).collection('students')
  const rows = await col.find({}, { projection: { password: 1, tokenVersion: 1 } }).toArray()
  let matched = 0
  let tvNonzero = 0
  for (const d of rows as any[]) {
    for (const v of DEFAULTS) {
      if ((await verifyPassword(v, d.password)).ok) {
        matched++
        break
      }
    }
    if (typeof d.tokenVersion === 'number' && d.tokenVersion !== 0) tvNonzero++
  }
  console.log(JSON.stringify({ total: rows.length, matched, tvNonzero }))
  await client.close()
}

main().catch((err) => {
  // scrub any driver error text that could embed the URI
  const safe = String(err?.message ?? err).replace(/mongodb(\+srv)?:\/\/\S+/g, '<redacted-uri>')
  console.error(`[rehearsal-state] ERROR: ${safe}`)
  process.exit(1)
})
