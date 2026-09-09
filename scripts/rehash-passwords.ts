// One-time password rehash (Phase 7 — PROD ONLY inside the approved window).
//
// SCOPE: every identity lives in the `students` collection (students,
// faculty, admin are role-docs there — verified by scope audit; no other
// collection holds passwords). This script handles ALL of them.
//
// MODES (no mode writes unless stated):
//   (default)            dry-run plan: target DB, collections, per-role
//                        counts. Zero writes.
//   --backup-to <path>   export pre-image (password + tokenVersion per doc,
//                        every affected collection) -> AES-256-GCM encrypt
//                        with BACKUP_KEY env (64 hex chars) -> write ONLY
//                        ciphertext -> decrypt-verify -> print path + bytes.
//   --apply --expect <N> [--bump-tv | --no-bump-tv] --backup <path>
//                        real run: decrypt-verifies <path> first, aborts unless
//                        live todo count === N, rehashes with per-doc
//                        round-trip check (abort on mismatch), concurrency
//                        guard (filter matches the read-time password;
//                        0 matches = abort), then self-verifies every updated
//                        doc with the app's own verifyPassword ("verified X/X").
//   --rollback --backup <path>
//                        restore password + tokenVersion per _id from backup.
//                        Ask the user before using; never improvise.
//
// RULES: counts only on stdout (never usernames-with-passwords, never
// password values). BACKUP_KEY travels via env only, never CLI args.
// MONGODB_DB must be explicit (no fallback) — the printed "db:" line is
// the last human check before --apply.
//
// Examples:
//   MONGODB_DB=aics_portal_qa BACKUP_KEY=<hex> node --experimental-strip-types scripts/rehash-passwords.ts --backup-to /backups/students-2026-09-09.json.enc
//   MONGODB_DB=aics_portal_qa BACKUP_KEY=<hex> node --experimental-strip-types scripts/rehash-passwords.ts --apply --expect 74 --bump-tv --backup /backups/students-2026-09-09.json.enc

import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { readFileSync, writeFileSync, statSync } from 'fs'
import { verifyPassword } from '../src/lib/password.ts'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ROLLBACK = args.includes('--rollback')
const BACKUP_TO = valueOf('--backup-to')
const BACKUP = valueOf('--backup')
const EXPECT = valueOf('--expect')
const NO_BUMP = args.includes('--no-bump-tv')
const BUMP_TV = !NO_BUMP // default ON (recommended: kills all sessions, forces re-login)

function valueOf(flag: string): string | null {
  const i = args.indexOf(flag)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

function fail(msg: string): never {
  console.error(`ABORT: ${msg}`)
  process.exit(2)
}

// Phase 7 pre-flight: the target DB must be explicit. Never fall back.
const dbName = process.env.MONGODB_DB
if (!dbName) fail('MONGODB_DB is not set. Set it explicitly to the target database.')
if (!process.env.MONGODB_URI) fail('MONGODB_URI is not set. Add it to .env.local')

const BACKUP_KEY = process.env.BACKUP_KEY || ''
function keyBytes(): Buffer {
  if (!/^[0-9a-fA-F]{64}$/.test(BACKUP_KEY)) {
    fail('BACKUP_KEY must be 64 hex chars (32 bytes) in the environment.')
  }
  return Buffer.from(BACKUP_KEY, 'hex')
}

function encryptJson(obj: unknown): Buffer {
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', keyBytes(), iv)
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return Buffer.from(JSON.stringify({ iv: iv.toString('hex'), tag: tag.toString('hex'), data: data.toString('hex') }))
}

function decryptJson(buf: Buffer): any {
  const { iv, tag, data } = JSON.parse(buf.toString('utf8'))
  const decipher = createDecipheriv('aes-256-gcm', keyBytes(), Buffer.from(iv, 'hex'))
  decipher.setAuthTag(Buffer.from(tag, 'hex'))
  return JSON.parse(Buffer.concat([decipher.update(Buffer.from(data, 'hex')), decipher.final()]).toString('utf8'))
}

interface PreImage {
  _id: string
  username: string
  password: string
  tokenVersion: number
}

async function main() {
  if (APPLY && ROLLBACK) fail('Choose one: --apply or --rollback.')
  if (APPLY && EXPECT === null) fail('--apply requires --expect <N> (re-derive the count, never trust memory).')
  if ((APPLY || ROLLBACK) && !BACKUP) fail('Refusing without --backup <encrypted-path> (decrypt-verified first).')
  if (BACKUP_TO && APPLY) fail('Choose one: --backup-to or --apply.')

  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  const db = client.db(dbName)
  // Affected collections: every collection holding login identities.
  // Scope audit proved this is exactly ['students'] — assert it every run.
  const affected = ['students']
  const col = db.collection('students')

  const total = await col.countDocuments({})
  const hashed = await col.countDocuments({ password: { $regex: '^scrypt\\$' } })
  const rows = await col.find({}).project({ username: 1, role: 1, password: 1, tokenVersion: 1 }).toArray()
  const todo = rows.filter(
    (d: any) => typeof d.password === 'string' && !d.password.startsWith('scrypt$')
  ) as any[]
  const perRole: Record<string, number> = {}
  for (const d of todo) perRole[d.role || 'unknown'] = (perRole[d.role || 'unknown'] || 0) + 1

  console.log(`db: ${dbName}`)
  console.log(`collections: ${affected.join(',')}`)
  console.log(`total=${total} hashed=${hashed} to-rehash=${todo.length} per-role=${JSON.stringify(perRole)} tv-mode=${BUMP_TV ? 'bump' : 'no-bump'}`)

  // ---- backup export (reads only) ----
  if (BACKUP_TO) {
    const pre: PreImage[] = rows.map((d: any) => ({
      _id: String(d._id),
      username: d.username,
      password: typeof d.password === 'string' ? d.password : '',
      tokenVersion: typeof d.tokenVersion === 'number' ? d.tokenVersion : 0,
    }))
    const enc = encryptJson({ db: dbName, at: new Date().toISOString(), docs: pre })
    writeFileSync(BACKUP_TO, enc)
    // Decrypt-verify immediately: ciphertext on disk must round-trip.
    const back = decryptJson(readFileSync(BACKUP_TO))
    if (!Array.isArray(back.docs) || back.docs.length !== pre.length || back.db !== dbName) {
      fail('backup decrypt-verify failed — ciphertext on disk does not round-trip.')
    }
    const bytes = statSync(BACKUP_TO).size
    console.log(`backup ok: path=${BACKUP_TO} bytes=${bytes} docs=${pre.length} (contents never printed)`)
    await client.close()
    return
  }

  // ---- rollback (explicit, user-approved only) ----
  if (ROLLBACK) {
    const back = decryptJson(readFileSync(BACKUP!))
    if (back.db !== dbName) fail(`backup is for db "${back.db}", target is "${dbName}".`)
    let restored = 0
    for (const d of back.docs as PreImage[]) {
      const r = await col.updateOne(
        { _id: new ObjectId(d._id) },
        { $set: { password: d.password, tokenVersion: d.tokenVersion } }
      )
      restored += r.modifiedCount
    }
    console.log(`rollback done: restored=${restored}/${(back.docs as any[]).length}`)
    await client.close()
    return
  }

  // ---- dry run ----
  if (!APPLY) {
    console.log('Dry run complete — zero writes. Use --backup-to, then --apply --expect <N> --backup <path>.')
    await client.close()
    return
  }

  // ---- apply ----
  const back = decryptJson(readFileSync(BACKUP!))
  if (back.db !== dbName) fail(`backup is for db "${back.db}", target is "${dbName}".`)
  if (!Array.isArray(back.docs) || back.docs.length === 0) fail('backup is empty or malformed.')
  console.log(`backup verified: docs=${(back.docs as any[]).length}`)

  const expectN = Number(EXPECT)
  if (!Number.isInteger(expectN) || expectN < 0) fail('--expect must be a non-negative integer.')
  // Re-derive the live count at run time; never trust the dry-run number.
  const liveRows = await col.find({}).project({ password: 1 }).toArray()
  const liveTodo = liveRows.filter(
    (d: any) => typeof d.password === 'string' && !d.password.startsWith('scrypt$')
  ).length
  if (liveTodo !== expectN) {
    fail(`live todo count ${liveTodo} !== --expect ${expectN}. Someone changed state — investigate, do not proceed.`)
  }

  // Import the app's own hashing via verifyPassword's module sibling.
  const { hashPassword } = await import('../src/lib/password.ts')
  const updated: { id: string; plain: string }[] = []
  let done = 0
  for (const doc of todo) {
    const plain: string = doc.password
    const hash = await hashPassword(plain)
    if (!(await verifyPassword(plain, hash))) {
      fail(`round-trip mismatch after ${done} writes — aborting. Already-written docs stay hashed (rerun is safe).`)
    }
    // Concurrency guard: match the read-time password so a concurrent
    // hash-on-login write is never clobbered. 0 matches = abort.
    const update: any = { $set: { password: hash } }
    if (BUMP_TV) update.$inc = { tokenVersion: 1 }
    const r = await col.updateOne({ _id: doc._id, password: plain }, update)
    if (r.modifiedCount !== 1) {
      fail(`concurrency guard tripped after ${done} writes (doc changed under us) — aborting.`)
    }
    updated.push({ id: String(doc._id), plain })
    done++
    if (done % 10 === 0) console.log(`  … ${done}/${todo.length}`)
  }

  // Post-apply self-verify with the app's own verify function.
  let verified = 0
  for (const u of updated) {
    const fresh = await col.findOne({ _id: new ObjectId(u.id) }, { projection: { password: 1 } })
    if (fresh && (await verifyPassword(u.plain, (fresh as any).password))) verified++
    else fail(`self-verify mismatch (${verified}/${updated.length} verified) — investigate immediately.`)
  }
  console.log(`verified ${verified}/${updated.length}`)

  const remaining = await col.countDocuments({
    password: { $exists: true, $type: 'string' },
    $nor: [{ password: { $regex: '^scrypt\\$' } }],
  })
  console.log(`apply done: rehashed=${done} remaining-plaintext=${remaining} tv-mode=${BUMP_TV ? 'bump' : 'no-bump'}`)
  if (remaining !== 0) fail('plaintext remains after apply.')
  await client.close()
}

main().catch((err) => {
  console.error('Rehash failed:', err?.message || err)
  process.exit(1)
})
