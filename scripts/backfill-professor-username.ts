// One-time professorUsername backfill (A1 phase 2 — issue #72).
//
// SCOPE: the `subjects` collection ONLY. Ownership of a subject row is
// the A1 dual-write fragment (src/lib/authz/scopes.ts professorOwnership):
//     { $or: [ { professorUsername: u }, { professorUsername: null, professor: name } ] }
// This script stamps `professorUsername` on unstamped rows whose display
// name resolves to exactly ONE faculty account, so ownership stops
// depending on mutable display names. Stamped rows are never re-touched.
//
// JOIN SEMANTICS (mirrors the runtime fallback EXACTLY — no trimming, no
// case-folding, no branch scoping, because the runtime fragment has none):
//   subjects.professor === facultyAccount.fullName
//   where facultyAccount = `students` doc with role === 'faculty'.
// Categories per subject row:
//   stamped        professorUsername is a non-empty string
//   orphaned       stamped, but no faculty account has that username (data
//                  integrity problem — reported, never auto-fixed)
//   invalid-empty  professorUsername === '' (dead value matching neither
//                  fragment arm — reported, never auto-fixed)
//   eligible       unstamped (absent/null) + exactly 1 fullName match
//   ambiguous      unstamped + 2+ fullName matches — NEVER auto-assigned;
//                  stamping one would silently reassign ownership
//   unresolved     unstamped + 0 matches (unowned today via the fallback
//                  AND after strict mode — left for manual assignment)
//
// MODES (no mode writes unless stated):
//   (default)            read-only report: target db, host class, counts
//                        per category. Zero writes.
//   --strictness         read-only phase-3 gate report (ADR-0009): gate A
//                        eligible==0, gate B ambiguous==0, gate C orphaned==0.
//                        Exit 0 when all gates pass, exit 3 when any fails.
//   --list-names         (combinable with report/strictness) print the
//                        DISTINCT display names in the ambiguous and
//                        unresolved categories. No student data, no emails,
//                        no usernames. Meant for the owner's own resolution
//                        session — the default report stays counts-only.
//   --backup-to <path>   export pre-image (every subjects doc: _id +
//                        professorUsername state) -> AES-256-GCM encrypt
//                        with BACKUP_KEY env (64 hex chars) -> write ONLY
//                        ciphertext -> decrypt-verify -> print path + bytes.
//   --apply --expect <N> --backup <path>
//                        real run: decrypt-verifies <path> first, aborts
//                        unless the live eligible count === N, stamps ONLY
//                        eligible rows with a per-doc concurrency guard
//                        (filter matches the read-time professor string and
//                        the unstamped state; 0 matches = abort), then
//                        self-verifies every stamped doc. Idempotent: after
//                        a complete run the eligible count is 0, so a rerun
//                        with --expect 0 writes nothing.
//   --rollback --backup <path>
//                        restore professorUsername exactly per backup
//                        ($unset for absent, $set null for null, $set value
//                        for values). Ask the owner before using; never
//                        improvise.
//
// RULES: counts only on stdout by default (never student usernames, never
// emails, never doc ids, never display names unless --list-names). The
// MONGODB_URI / connection string is NEVER printed — errors are scrubbed
// of URI-shaped substrings before reaching stderr. BACKUP_KEY travels via
// env only, never CLI args. MONGODB_DB must be explicit (no fallback) —
// the printed "db:" line is the last human check before --apply.
//
// PRODUCTION FIREWALL: --apply and --rollback REFUSE to run when the
// target host is non-local unless --prod is passed explicitly. Reads
// (default report, --strictness, --backup-to) are allowed against any
// target — they are read-only by construction. This lets a rehearsal
// never mutate a production database by accident while still allowing the
// owner to run the read-only assessment against production.
//
// Examples:
//   MONGODB_DB=aics_portal MONGODB_URI=mongodb://127.0.0.1:27017 node scripts/backfill-professor-username.ts
//   MONGODB_DB=aics_portal_qa BACKUP_KEY=<hex> node scripts/backfill-professor-username.ts --backup-to /backups/subjects-2026-10-22.json.enc
//   MONGODB_DB=aics_portal_qa BACKUP_KEY=<hex> node scripts/backfill-professor-username.ts --apply --expect 12 --backup /backups/subjects-2026-10-22.json.enc

import { MongoClient, ObjectId } from 'mongodb'
import { config } from 'dotenv'
import { createCipheriv, createDecipheriv, randomBytes } from 'crypto'
import { readFileSync, writeFileSync, statSync, existsSync } from 'fs'

config({ path: '.env.local' })

const args = process.argv.slice(2)
const APPLY = args.includes('--apply')
const ROLLBACK = args.includes('--rollback')
const STRICTNESS = args.includes('--strictness')
const LIST_NAMES = args.includes('--list-names')
const PROD = args.includes('--prod')
const BACKUP_TO = valueOf('--backup-to')
const BACKUP = valueOf('--backup')
const EXPECT = valueOf('--expect')

function valueOf(flag: string): string | null {
  const i = args.indexOf(flag)
  return i >= 0 && i + 1 < args.length ? args[i + 1] : null
}

function fail(msg: string): never {
  console.error(`ABORT: ${msg}`)
  process.exit(2)
}

// Scrub URI-shaped substrings so a driver error can never echo the
// connection string (or credentials embedded in it) into the log.
function scrub(msg: string): string {
  return msg.replace(/mongodb(\+srv)?:\/\/[^\s"']+/gi, '<redacted-uri>')
}

// --- target validation: db explicit, uri present, host classified ---------
const dbName = process.env.MONGODB_DB
if (!dbName) fail('MONGODB_DB is not set. Set it explicitly to the target database.')
const rawUri = process.env.MONGODB_URI
if (!rawUri) fail('MONGODB_URI is not set. Set it (or put it in .env.local).')

let hostLabel = 'unknown'
let isLocal = false
try {
  const u = new URL(rawUri)
  const h = (u.hostname || '').toLowerCase()
  isLocal = h === 'localhost' || h === '::1' || /^127\./.test(h) || h === '0.0.0.0'
  // Local targets print the host (harmless); non-local targets print only
  // the class — the hostname itself stays out of the log.
  hostLabel = isLocal ? `local (${h})` : 'non-local (host redacted)'
} catch {
  fail('MONGODB_URI is not a parseable connection string.')
}

const MUTATION = APPLY || ROLLBACK
if (MUTATION && !isLocal && !PROD) {
  fail(
    `refusing to mutate a non-local target without --prod. ` +
      `This guard exists so a development rehearsal can never write to production. ` +
      `If this really is the approved production run, pass --prod explicitly.`
  )
}

// --- crypto (same envelope as rehash-passwords.ts) ------------------------
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

// Pre-image: exact professorUsername state per subjects doc.
//   e: 1 = field existed, 0 = field absent; v: the value when e===1.
interface PreImage {
  _id: string
  e: 0 | 1
  v: string | null
}

// --- classification --------------------------------------------------------
interface Row {
  _id: ObjectId
  professor: string
  branch: string
  pu: string | null | undefined
}

interface Classified {
  rows: Row[]
  stamped: Row[]
  orphaned: Row[]
  invalid: Row[]
  eligible: { row: Row; username: string; crossBranch: boolean }[]
  ambiguous: { row: Row; matches: number }[]
  unresolved: Row[]
  staleNameStamps: number
  facultyByUsername: Map<string, { fullName: string; branch: string }>
}

async function classify(db: import('mongodb').Db): Promise<Classified> {
  // Faculty accounts: students docs with role 'faculty'. These — and only
  // these — are the identities the runtime fragment can match by name.
  const fac = await db
    .collection('students')
    .find({ role: 'faculty' })
    .project({ username: 1, fullName: 1, branch: 1 })
    .toArray()
  const byName = new Map<string, { username: string; branch: string }[]>()
  const facultyByUsername = new Map<string, { fullName: string; branch: string }>()
  for (const f of fac as any[]) {
    const name = typeof f.fullName === 'string' ? f.fullName : ''
    const user = typeof f.username === 'string' ? f.username : ''
    if (!user) continue
    if (!byName.has(name)) byName.set(name, [])
    byName.get(name)!.push({ username: user, branch: typeof f.branch === 'string' ? f.branch : '' })
    facultyByUsername.set(user, { fullName: name, branch: typeof f.branch === 'string' ? f.branch : '' })
  }

  const rows = (await db.collection('subjects').find({}).project({ professor: 1, professorUsername: 1, branch: 1 }).toArray()) as any[]
  const typed: Row[] = rows.map((r) => ({
    _id: r._id,
    professor: typeof r.professor === 'string' ? r.professor : '',
    branch: typeof r.branch === 'string' ? r.branch : '',
    pu: r.professorUsername,
  }))

  const c: Classified = {
    rows: typed,
    stamped: [],
    orphaned: [],
    invalid: [],
    eligible: [],
    ambiguous: [],
    unresolved: [],
    staleNameStamps: 0,
    facultyByUsername,
  }
  for (const row of typed) {
    if (typeof row.pu === 'string' && row.pu !== '') {
      c.stamped.push(row)
      const acct = facultyByUsername.get(row.pu)
      if (!acct) {
        c.orphaned.push(row)
      } else if (acct.fullName !== row.professor) {
        // Stamped row whose display name no longer matches the account —
        // designed behavior (username arm matches exclusively); counted
        // as information only, never a violation.
        c.staleNameStamps++
      }
      continue
    }
    if (row.pu === '') {
      // Dead value: matches neither fragment arm. Reported, never touched.
      c.invalid.push(row)
      continue
    }
    // unstamped: absent or null — the legacy fallback arm.
    const matches = byName.get(row.professor) || []
    if (matches.length === 1) {
      c.eligible.push({ row, username: matches[0].username, crossBranch: matches[0].branch !== row.branch })
    } else if (matches.length > 1) {
      c.ambiguous.push({ row, matches: matches.length })
    } else {
      c.unresolved.push(row)
    }
  }
  return c
}

function distinctNames(rows: Row[]): string[] {
  return [...new Set(rows.map((r) => r.professor))].sort()
}

function printReport(c: Classified) {
  console.log(`db: ${dbName}`)
  console.log(`host: ${hostLabel}`)
  console.log(
    `subjects: total=${c.rows.length} stamped=${c.stamped.length} orphaned-stamps=${c.orphaned.length} invalid-empty=${c.invalid.length}`
  )
  console.log(
    `unstamped: eligible=${c.eligible.length} ambiguous=${c.ambiguous.length} unresolved=${c.unresolved.length}`
  )
  console.log(`eligible-cross-branch=${c.eligible.filter((e) => e.crossBranch).length}`)
  if (LIST_NAMES) {
    console.log(`ambiguous-names: ${JSON.stringify(distinctNames(c.ambiguous.map((a) => a.row)))}`)
    console.log(`unresolved-names: ${JSON.stringify(distinctNames(c.unresolved))}`)
  }
}

async function main() {
  if (APPLY && ROLLBACK) fail('Choose one: --apply or --rollback.')
  if (APPLY && STRICTNESS) fail('--strictness is read-only; remove --apply.')
  if (APPLY && EXPECT === null) fail('--apply requires --expect <N> (re-derive the count, never trust memory).')
  if ((APPLY || ROLLBACK) && !BACKUP) fail('Refusing without --backup <encrypted-path> (decrypt-verified first).')
  if (BACKUP_TO && APPLY) fail('Choose one: --backup-to or --apply.')
  if (BACKUP_TO && ROLLBACK) fail('Choose one: --backup-to or --rollback.')

  const client = new MongoClient(rawUri!)
  await client.connect()
  const db = client.db(dbName)
  const col = db.collection('subjects')

  // ---- backup export (reads only) ----
  if (BACKUP_TO) {
    const c = await classify(db)
    printReport(c)
    const pre: PreImage[] = c.rows.map((r) => ({
      _id: String(r._id),
      e: r.pu === undefined ? 0 : 1,
      v: r.pu === undefined ? null : r.pu,
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

  // ---- rollback (explicit, owner-approved only) ----
  if (ROLLBACK) {
    if (!existsSync(BACKUP!)) fail(`--backup file not found: ${BACKUP}`)
    const back = decryptJson(readFileSync(BACKUP!))
    if (back.db !== dbName) fail(`backup is for db "${back.db}", target is "${dbName}".`)
    if (!Array.isArray(back.docs)) fail('backup is malformed (docs is not an array).')
    let restored = 0
    let skipped = 0
    for (const d of back.docs as PreImage[]) {
      let r: import('mongodb').UpdateResult
      if (d.e === 0) {
        r = await col.updateOne({ _id: new ObjectId(d._id) }, { $unset: { professorUsername: '' } })
      } else if (d.v === null) {
        r = await col.updateOne({ _id: new ObjectId(d._id) }, { $set: { professorUsername: null } })
      } else {
        r = await col.updateOne({ _id: new ObjectId(d._id) }, { $set: { professorUsername: d.v } })
      }
      if (r.modifiedCount === 1) restored++
      else skipped++
    }
    console.log(`rollback done: restored=${restored} skipped=${skipped}/${(back.docs as any[]).length}`)
    const c = await classify(db)
    printReport(c)
    await client.close()
    return
  }

  // ---- read-only modes: report / strictness ----
  if (!APPLY) {
    const c = await classify(db)
    if (STRICTNESS) {
      console.log(`db: ${dbName}`)
      console.log(`host: ${hostLabel}`)
      const gates = [
        { key: 'gate-A unstamped-uniquely-resolvable', n: c.eligible.length, hint: 'run the backfill' },
        { key: 'gate-B ambiguous-names', n: c.ambiguous.length, hint: 'resolve manually (never auto-assigned)' },
        { key: 'gate-C orphaned-stamps', n: c.orphaned.length, hint: 'fix data manually' },
      ]
      let anyFail = false
      for (const g of gates) {
        const pass = g.n === 0
        if (!pass) anyFail = true
        console.log(`${g.key}: ${g.n} ${pass ? 'PASS' : `FAIL (${g.hint})`}`)
      }
      console.log(`info: unresolved=${c.unresolved.length} (unowned today and after strict mode — accepted residual)`)
      console.log(`info: invalid-empty-stamps=${c.invalid.length} (dead values — fix manually)`)
      console.log(`info: stale-name-stamps=${c.staleNameStamps} (display name differs from stamp — by design, harmless)`)
      if (LIST_NAMES) {
        console.log(`ambiguous-names: ${JSON.stringify(distinctNames(c.ambiguous.map((a) => a.row)))}`)
        console.log(`unresolved-names: ${JSON.stringify(distinctNames(c.unresolved))}`)
      }
      console.log(`strictness: ${anyFail ? 'FAIL' : 'PASS'}`)
      await client.close()
      process.exit(anyFail ? 3 : 0)
    }
    printReport(c)
    console.log('Dry run complete — zero writes. Use --backup-to, then --apply --expect <N> --backup <path>.')
    await client.close()
    return
  }

  // ---- apply ----
  if (!existsSync(BACKUP!)) fail(`--backup file not found: ${BACKUP}`)
  const back = decryptJson(readFileSync(BACKUP!))
  if (back.db !== dbName) fail(`backup is for db "${back.db}", target is "${dbName}".`)
  if (!Array.isArray(back.docs) || back.docs.length === 0) fail('backup is empty or malformed.')
  console.log(`backup verified: docs=${(back.docs as any[]).length}`)

  const expectN = Number(EXPECT)
  if (!Number.isInteger(expectN) || expectN < 0) fail('--expect must be a non-negative integer.')

  const c = await classify(db)
  printReport(c)
  if (c.eligible.length !== expectN) {
    fail(
      `live eligible count ${c.eligible.length} !== --expect ${expectN}. Someone changed state — investigate, do not proceed.`
    )
  }
  if (c.ambiguous.length > 0 || c.unresolved.length > 0) {
    // Not an abort: those rows are NEVER auto-assigned by design. Say so
    // loudly so the operator sees the report-first contract held.
    console.log(
      `never-assigned: ambiguous=${c.ambiguous.length} unresolved=${c.unresolved.length} (left unstamped, reported above)`
    )
  }

  const stamped: { id: string; username: string }[] = []
  let done = 0
  for (const e of c.eligible) {
    // Concurrency guard: match the read-time professor string AND the
    // unstamped state ({professorUsername: null} matches absent or null).
    // A row renamed or stamped under us trips this — abort, never clobber.
    const r = await col.updateOne(
      { _id: e.row._id, professor: e.row.professor, professorUsername: null },
      { $set: { professorUsername: e.username } }
    )
    if (r.modifiedCount !== 1) {
      fail(`concurrency guard tripped after ${done} writes (doc changed under us) — aborting.`)
    }
    stamped.push({ id: String(e.row._id), username: e.username })
    done++
    if (done % 10 === 0) console.log(`  … ${done}/${c.eligible.length}`)
  }

  // Post-apply self-verify: every stamped doc carries the expected username.
  let verified = 0
  for (const s of stamped) {
    const fresh = await col.findOne({ _id: new ObjectId(s.id) }, { projection: { professorUsername: 1 } })
    if (fresh && (fresh as any).professorUsername === s.username) verified++
    else fail(`self-verify mismatch (${verified}/${stamped.length} verified) — investigate immediately.`)
  }
  console.log(`verified ${verified}/${stamped.length}`)

  const after = await classify(db)
  if (after.eligible.length !== 0) fail(`eligible rows remain after apply (${after.eligible.length}) — investigate.`)
  console.log(
    `apply done: stamped=${done} eligible-remaining=0 ambiguous-still=${after.ambiguous.length} unresolved-still=${after.unresolved.length} orphaned-still=${after.orphaned.length} invalid-still=${after.invalid.length}`
  )
  await client.close()
}

main().catch((err: any) => {
  console.error('Backfill failed:', scrub(err?.message || String(err)))
  process.exit(1)
})
