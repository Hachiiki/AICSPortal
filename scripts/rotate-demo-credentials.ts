// One-time DEMO credential rotation (issue #72 security follow-up).
//
// WHY: CONTRIBUTING.md (main branch) publishes three demo passwords.
// They are unreachable behind Vercel Authentication in production, but
// the VALUES are shared: seed-mongodb.ts assigns student123 to every
// student account (~77), faculty123 to BOTH faculty accounts
// (m.reyes, l.bautista), admin123 to BOTH admins (admin, admin2).
// Rotating only the three documented usernames would leave the same
// public values valid on every other seeded account — so this script
// rotates VALUE-WIDE: every account whose stored password verifies
// against one of the three documented demo defaults gets the
// replacement for that value.
//
// MODES (no mode writes unless stated):
//   (default)            dry-run plan: target DB, per-role matched
//                        counts, anomalies, and the derived --expect
//                        number. Zero writes.
//   --backup-to <path>   export pre-image (username, role, password,
//                        tokenVersion per matched doc) -> AES-256-GCM
//                        encrypt with BACKUP_KEY env (64 hex chars) ->
//                        write ONLY ciphertext -> decrypt-verify ->
//                        print path + bytes.
//   --apply --expect <N> --backup <path>
//                        real run: decrypt-validates <path> FIRST
//                        (F1 pre-flight: GCM integrity + entry shape +
//                        count === live plan + every live _id present
//                        in the backup — any failure aborts BEFORE the
//                        first database write), then aborts unless live
//                        matched count === N, then per doc:
//                        concurrency-guarded update (filter matches the
//                        read-time password; 0 matches = abort) writing
//                        the scrypt hash of the replacement value and
//                        bumping tokenVersion (kills every session),
//                        then self-verifies every updated doc with the
//                        app's own verifyPassword ("verified X/X").
//                        Requires BACKUP_KEY (the pre-flight decrypt).
//   --rollback --backup <path>
//                        restore password + tokenVersion per _id from
//                        the backup (shape-validated on load). Also
//                        requires DEMO_ROTATE_SANCTIONED=1 (F3 — the
//                        rollback re-publishes the documented demo
//                        defaults, so it must never be casual). Ask
//                        the owner before using; never improvise.
//   --no-bump-tv         skips the tokenVersion bump on --apply.
//                        D4 override: existing sessions then SURVIVE
//                        the rotation. NOT recommended outside
//                        rehearsals; default behavior bumps.
//
// NEW VALUES come from the environment ONLY — never CLI args, never
// printed, never written to the backup:
//   DEMO_PW_STUDENT   replaces student123
//   DEMO_PW_FACULTY   replaces faculty123
//   DEMO_PW_ADMIN     replaces admin123
//
// GUARDS:
//   - requires DEMO_ROTATE_SANCTIONED=1 for BOTH --apply and --rollback
//     (explicit owner consent flag; the rollback restores the published
//     defaults, so it is gated exactly like the rotation itself)
//   - MONGODB_DB must be explicit (no fallback); the printed "db:" line
//     is the last human check before --apply
//   - --apply pre-flight: --backup must decrypt (BACKUP_KEY), have valid
//     entries, match the live plan count, and cover every live _id —
//     before the first write (F1)
//   - refuses a replacement equal to the current documented default
//     (no-op rotation) or shorter than 8 characters
//   - aborts on role/value mismatches (e.g. an admin account carrying
//     student123) unless --allow-mismatch
//   - counts only on stdout; no usernames-with-passwords, no password
//     values, no hashes
//
// AFTER a successful --apply the documented defaults match NOTHING, so
// a re-run's matched count is 0 — double-rotation confusion is
// impossible, and seed-mongodb.ts's remote-seed guard (same prep
// branch) refuses any future production reseed that does not inject
// rotated values via the same env vars.
//
// Examples (PROPOSED — nothing has been run against production):
//   MONGODB_URI=... MONGODB_DB=aics_portal_qa node --experimental-strip-types \
//     scripts/rotate-demo-credentials.ts                       # plan
//   MONGODB_DB=aics_portal_qa BACKUP_KEY=<hex> node --experimental-strip-types \
//     scripts/rotate-demo-credentials.ts --backup-to /backups/demo-creds.json.enc
//   DEMO_ROTATE_SANCTIONED=1 MONGODB_DB=aics_portal BACKUP_KEY=<hex> \
//     DEMO_PW_STUDENT=... DEMO_PW_FACULTY=... DEMO_PW_ADMIN=... \
//     node --experimental-strip-types scripts/rotate-demo-credentials.ts \
//     --apply --expect <N> --backup /backups/demo-creds.json.enc

import { MongoClient } from 'mongodb'
import { config } from 'dotenv'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { readFileSync, writeFileSync } from 'fs'
// @ts-expect-error: explicit .ts import required by node --experimental-strip-types at runtime
import { hashPassword, verifyPassword } from '../src/lib/password.ts'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ROLLBACK = args.includes('--rollback')
const BACKUP_TO = valueOf('--backup-to')
const BACKUP = valueOf('--backup')
const EXPECT = valueOf('--expect')
const ALLOW_MISMATCH = args.includes('--allow-mismatch')
const NO_BUMP = args.includes('--no-bump-tv')
const BUMP_TV = !NO_BUMP // default ON: rotation kills every demo session

function valueOf(flag: string): string | null {
  const i = args.indexOf(flag)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

function fail(msg: string): never {
  console.error(`ABORT: ${msg}`)
  process.exit(2)
}

const dbName = process.env.MONGODB_DB
if (!dbName) fail('MONGODB_DB is not set. Set it explicitly to the target database.')
if (!process.env.MONGODB_URI) fail('MONGODB_URI is not set. Add it to .env.local')

// The three documented demo defaults (already public in CONTRIBUTING.md
// on main — restating them here adds no exposure). After rotation they
// are the MATCH keys, not the new values.
const DEMO_DEFAULTS: Record<'student' | 'faculty' | 'admin', string> = {
  student: 'student123',
  faculty: 'faculty123',
  admin: 'admin123',
}

const NEW_PW: Record<'student' | 'faculty' | 'admin', string | undefined> = {
  student: process.env.DEMO_PW_STUDENT,
  faculty: process.env.DEMO_PW_FACULTY,
  admin: process.env.DEMO_PW_ADMIN,
}

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

// F1/F3 load path: decrypt + shape-validate a backup file. GCM auth makes
// tampering/wrong keys throw; the shape checks catch a validly-encrypted
// file that simply is not a rotation pre-image (wrong file, wrong tool).
function loadBackup(path: string): PreImage[] {
  let raw: Buffer
  try {
    raw = readFileSync(path)
  } catch {
    fail(`cannot read --backup file: ${path}`)
  }
  let parsed: unknown
  try {
    parsed = decryptJson(raw)
  } catch {
    fail('--backup failed to decrypt (wrong BACKUP_KEY or corrupt file) — refusing to touch the database.')
  }
  const pre = parsed as PreImage[]
  if (!Array.isArray(pre) || pre.length === 0) {
    fail('backup payload is not a non-empty array — wrong file?')
  }
  const seen = new Set<string>()
  for (const d of pre) {
    if (!d || typeof d !== 'object') fail('backup entry is not an object')
    if (typeof d._id !== 'string' || !/^[0-9a-f]{24}$/.test(d._id)) fail('backup entry has an invalid _id')
    if (typeof d.username !== 'string' || d.username === '') fail('backup entry has an invalid username')
    if (typeof d.role !== 'string') fail('backup entry has an invalid role')
    if (typeof d.password !== 'string' || d.password === '') fail('backup entry has an invalid password hash')
    if (typeof d.tokenVersion !== 'number') fail('backup entry has an invalid tokenVersion')
    if (seen.has(d._id)) fail(`duplicate _id ${d._id} in backup`)
    seen.add(d._id)
  }
  return pre
}

interface PreImage {
  _id: string
  username: string
  role: string
  password: string
  tokenVersion: number
}

interface Matched {
  _id: string
  username: string
  role: string
  key: 'student' | 'faculty' | 'admin'
  password: string
  tokenVersion: number
}

async function main() {
  if (APPLY && ROLLBACK) fail('Choose one: --apply or --rollback.')
  if (ROLLBACK && BACKUP_TO) fail('Choose one: --rollback or --backup-to.')
  if (APPLY && EXPECT === null) fail('--apply requires --expect <N> (re-derive the count from the dry run, never trust memory).')
  if ((APPLY || ROLLBACK) && !BACKUP) fail('Refusing without --backup <encrypted-path> (decrypt-verified first).')
  if (BACKUP_TO && APPLY) fail('Choose one: --backup-to or --apply.')
  // F3: BOTH directions of the destructive path are owner-sanctioned —
  // --apply replaces the published values, --rollback RESTORES them, so
  // the rollback is gated exactly like the rotation itself.
  if ((APPLY || ROLLBACK) && process.env.DEMO_ROTATE_SANCTIONED !== '1') {
    fail('DEMO_ROTATE_SANCTIONED=1 is required for --apply AND --rollback (owner-sanctioned window).')
  }
  if (APPLY) {
    for (const key of ['student', 'faculty', 'admin'] as const) {
      const v = NEW_PW[key]
      if (!v) fail(`DEMO_PW_${key.toUpperCase()} is not set in the environment (new values travel via env only).`)
      if (v === DEMO_DEFAULTS[key]) fail(`DEMO_PW_${key.toUpperCase()} equals the current documented default — that is a no-op rotation.`)
      if (v.length < 8) fail(`DEMO_PW_${key.toUpperCase()} is shorter than 8 characters.`)
      for (const other of ['student', 'faculty', 'admin'] as const) {
        if (other !== key && v === NEW_PW[other]) fail(`DEMO_PW_${key.toUpperCase()} equals DEMO_PW_${other.toUpperCase()} — the three replacements must be distinct.`)
      }
    }
  }

  const client = new MongoClient(process.env.MONGODB_URI!)
  await client.connect()
  const db = client.db(dbName)
  console.log(`[demo-rotate] target db: ${dbName} (host redacted)`)

  if (ROLLBACK) {
    const pre: PreImage[] = loadBackup(BACKUP!)
    console.log(`  backup: ${pre.length} docs, restoring password + tokenVersion per _id ...`)
    const { ObjectId } = await import('mongodb')
    let processed = 0
    let modified = 0
    for (const d of pre) {
      const r = await db.collection('students').updateOne(
        { _id: new ObjectId(d._id) },
        { $set: { password: d.password, tokenVersion: d.tokenVersion } }
      )
      if (r.matchedCount > 0) processed++
      if (r.modifiedCount > 0) modified++
    }
    console.log(`  ROLLBACK DONE: ${processed}/${pre.length} docs matched, ${modified} modified (sessions for restored docs die again on next login).`)
    if (processed !== pre.length) {
      console.log(`  WARNING: ${pre.length - processed} backup docs no longer exist in the collection.`)
    }
    console.log('  NOTE: rollback restores the BACKED-UP state — any password/tokenVersion change made AFTER the backup is overwritten. Only use it inside the owner-sanctioned window.')
    await client.close()
    return
  }

  // ---- plan phase: match every account carrying a documented default ----
  const rows = await db
    .collection('students')
    .find({})
    .project({ username: 1, role: 1, password: 1, tokenVersion: 1 })
    .toArray()
  const matched: Matched[] = []
  const anomalies: string[] = []
  for (const d of rows as any[]) {
    for (const key of ['student', 'faculty', 'admin'] as const) {
      const v = await verifyPassword(DEMO_DEFAULTS[key], d.password)
      if (!v.ok) continue
      if (d.role !== key) anomalies.push(`role/value mismatch: account with role '${d.role}' carries the ${key} demo value`)
      matched.push({
        _id: String(d._id),
        username: d.username,
        role: d.role || 'unknown',
        key,
        password: d.password,
        tokenVersion: typeof d.tokenVersion === 'number' ? d.tokenVersion : 0,
      })
      break // one value per account; first match wins
    }
  }
  const perRole: Record<string, number> = {}
  for (const m of matched) perRole[m.key] = (perRole[m.key] || 0) + 1
  console.log(`  scanned ${rows.length} accounts in 'students'`)
  for (const key of ['student', 'faculty', 'admin'] as const) {
    console.log(`  carries the documented ${key} default: ${perRole[key] || 0}`)
  }
  console.log(`  MATCHED TOTAL: ${matched.length}  (--expect ${matched.length})`)
  if (anomalies.length > 0) {
    for (const a of anomalies) console.log(`  ANOMALY: ${a}`)
    if (APPLY && !ALLOW_MISMATCH) fail('role/value mismatches present — resolve them or pass --allow-mismatch after an owner decision.')
  }

  if (BACKUP_TO) {
    if (matched.length === 0) {
      fail('NOTHING matched to back up — the database carries no documented demo defaults (already rotated, or wrong database?). An empty backup cannot protect a rotation.')
    }
    const pre: PreImage[] = matched.map((m) => ({
      _id: m._id,
      username: m.username,
      role: m.role,
      password: m.password,
      tokenVersion: m.tokenVersion,
    }))
    const buf = encryptJson(pre)
    writeFileSync(BACKUP_TO, buf)
    const roundTrip = decryptJson(readFileSync(BACKUP_TO))
    if (roundTrip.length !== pre.length) fail('backup decrypt-verify failed (count mismatch).')
    console.log(`  BACKUP OK: ${BACKUP_TO} (${buf.length} bytes, AES-256-GCM, counts only logged)`)
    console.log('  NEXT: re-derive --expect, then --apply inside the owner-sanctioned window.')
    await client.close()
    return
  }

  if (APPLY) {
    if (matched.length !== Number(EXPECT)) {
      fail(`live matched count ${matched.length} !== --expect ${EXPECT} — re-run the dry plan and re-derive.`)
    }
    // ---- F1 pre-flight: the recovery material must be PROVEN usable
    // BEFORE the first write. A backup that only turns out to be
    // undecryptable / count-mismatched / missing live ids at --rollback
    // time is the worst possible moment to discover it (mid-incident,
    // half-rotated). loadBackup() enforces GCM integrity + entry shape;
    // the checks below pin the backup to THIS rotation's live plan.
    const pre = loadBackup(BACKUP!)
    if (pre.length !== matched.length) {
      fail(`backup holds ${pre.length} docs but the live plan matched ${matched.length} — re-derive both with a fresh dry run + --backup-to.`)
    }
    const preIds = new Set(pre.map((p) => p._id))
    const uncovered = matched.filter((m) => !preIds.has(m._id))
    if (uncovered.length > 0) {
      fail(`live plan contains ${uncovered.length} doc(s) absent from the backup (first: _id ${uncovered[0]._id}) — refusing to write.`)
    }
    const { ObjectId } = await import('mongodb')
    const newHashes: Record<string, string> = {}
    for (const key of ['student', 'faculty', 'admin'] as const) {
      newHashes[key] = await hashPassword(NEW_PW[key]!)
    }
    let updated = 0
    for (const m of matched) {
      // Concurrency guard: the filter matches the read-time password, so
      // a doc that changed underneath us yields 0 matches -> abort.
      const r = await db.collection('students').updateOne(
        { _id: new ObjectId(m._id), password: m.password },
        {
          $set: { password: newHashes[m.key] },
          ...(BUMP_TV ? { $inc: { tokenVersion: 1 } } : {}),
        }
      )
      if (r.matchedCount === 0) fail(`concurrency guard tripped on _id ${m._id} — aborting; nothing else will be written.`)
      if (r.modifiedCount > 0) updated++
    }
    // Self-verify with the app's own verifier.
    let verified = 0
    for (const m of matched) {
      const doc = await db.collection('students').findOne({ _id: new ObjectId(m._id) }, { projection: { password: 1 } })
      const v = await verifyPassword(NEW_PW[m.key]!, doc?.password)
      if (v.ok) verified++
    }
    console.log(`  UPDATED: ${updated}/${matched.length}  VERIFIED: ${verified}/${matched.length}${BUMP_TV ? '  (tokenVersion bumped: every demo session is dead)' : ''}`)
    console.log('  POST-STEP (owner, manual): smoke-login the three documented accounts with the new values;')
    console.log('  confirm the documented defaults now fail; strip the password column from CONTRIBUTING.md.')
    await client.close()
    return
  }

  console.log('  PLAN OK — dry run only. Backup next: --backup-to <path.enc> with BACKUP_KEY in env.')
  await client.close()
}

main().catch((err) => {
  // scrub any driver error text that could embed the URI
  const safe = String(err?.message ?? err).replace(/mongodb(\+srv)?:\/\/\S+/g, '<redacted-uri>')
  console.error(`[demo-rotate] ERROR: ${safe}`)
  process.exit(1)
})
