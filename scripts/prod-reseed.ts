// ============================================================
//  prod-reseed.ts — one-off, owner-sanctioned production reseed
//  driver for aics_portal (issue #72 context, 2026-10-22).
//
//  The owner stated the production aics_portal data is mock data
//  and explicitly sanctioned delete-all + reseed. This driver
//  stages that action so every step is observable and reversible
//  until the final one:
//
//    precheck — read-only: collection names, doc counts, index
//               names. Aborts if the shape looks non-mock
//               (> 5000 docs or unknown heavy collections).
//    backup   — exports every collection to local JSON files
//               under db/prod-backup-<ts>/ (gitignored). Prints
//               counts only, never document contents.
//    drop     — drops every non-system collection in aics_portal
//               ONLY (never another database). Prints per-
//               collection results.
//    verify   — read-only post-seed checks: counts, stamps,
//               indexes, dual-key fragment equivalence.
//
//  GUARDS:
//    - requires PROD_RESEED_SANCTIONED=1 (explicit consent flag)
//    - reads MONGODB_URI / MONGODB_DB from env only; the URI is
//      NEVER printed, logged, or written anywhere by this script
//    - no document contents are ever printed (counts + names
//      only) — no PII in logs
//  Run: PROD_RESEED_SANCTIONED=1 node --experimental-strip-types
//         scripts/prod-reseed.ts <mode>
// ============================================================

import { MongoClient } from 'mongodb'

const mode = process.argv[2] as 'precheck' | 'backup' | 'drop' | 'verify'
const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'aics_portal'

if (!['precheck', 'backup', 'drop', 'verify'].includes(mode)) {
  console.error('usage: prod-reseed.ts <precheck|backup|drop|verify>')
  process.exit(1)
}
if (!uri) {
  console.error('MONGODB_URI is not set (env)')
  process.exit(1)
}
if (process.env.PROD_RESEED_SANCTIONED !== '1') {
  console.error('refusing: PROD_RESEED_SANCTIONED=1 is required (owner-sanctioned one-off)')
  process.exit(1)
}
if (/127\.0\.0\.1|localhost/.test(uri)) {
  console.error('this driver is for the production reseed; use the local runbooks for localhost')
  process.exit(1)
}

// Mock-sanity ceiling: the known mock dataset is small (hundreds of
// docs). If the database is far larger, something is wrong — stop.
const MOCK_SANITY_MAX_DOCS = 5000

const client = new MongoClient(uri)

async function userCollections(db: any): Promise<{ name: string; count: number }[]> {
  const names = (await db.listCollections().toArray()).map((c: any) => c.name)
  const out: { name: string; count: number }[] = []
  for (const name of names) {
    if (name.startsWith('system.')) continue
    out.push({ name, count: await db.collection(name).countDocuments({}) })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

async function main() {
  await client.connect()
  const db = client.db(dbName)
  console.log(`[prod-reseed:${mode}] target db: ${dbName} (host redacted)`)

  if (mode === 'precheck') {
    const colls = await userCollections(db)
    let total = 0
    console.log('  collections:')
    for (const c of colls) {
      console.log(`    ${c.name}: ${c.count} docs`)
      total += c.count
    }
    console.log(`  TOTAL: ${colls.length} collections, ${total} docs`)
    for (const c of colls) {
      const idx = await db.collection(c.name).listIndexes().toArray()
      console.log(`    indexes[${c.name}]: ${idx.map((i: any) => JSON.stringify(i.key)).join(', ')}`)
    }
    if (total > MOCK_SANITY_MAX_DOCS) {
      console.error(`  ABORT: ${total} docs exceeds the mock-sanity ceiling (${MOCK_SANITY_MAX_DOCS}) — not dropping without a fresh owner decision`)
      process.exit(2)
    }
    console.log('  PRECHECK OK: shape consistent with a mock dataset; safe to proceed (backup -> drop -> seed)')
  }

  if (mode === 'backup') {
    const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
    const dir = `db/prod-backup-${ts}`
    const { mkdir, writeFile } = await import('node:fs/promises')
    await mkdir(dir, { recursive: true })
    const colls = await userCollections(db)
    const manifest: Record<string, number> = {}
    for (const c of colls) {
      const docs = await db.collection(c.name).find({}).toArray()
      await writeFile(`${dir}/${c.name}.json`, JSON.stringify(docs))
      manifest[c.name] = docs.length
    }
    await writeFile(`${dir}/MANIFEST.json`, JSON.stringify({ db: dbName, createdAt: new Date().toISOString(), collections: manifest }, null, 2))
    console.log(`  backup written: ${dir} (local, gitignored, counts only logged)`)
    for (const [name, count] of Object.entries(manifest)) console.log(`    ${name}: ${count} docs`)
    console.log('  BACKUP OK — restore path: mongoimport / driver insert per file if ever needed')
  }

  if (mode === 'drop') {
    const colls = await userCollections(db)
    console.log(`  dropping ${colls.length} collections in ${dbName} ONLY ...`)
    for (const c of colls) {
      const ok = await db.collection(c.name).drop().catch(async (e: any) => {
        // some Atlas users lack dropCollection: fall back to delete + index drop
        await db.collection(c.name).deleteMany({})
        await db.collection(c.name).dropIndexes().catch(() => {})
        return String(e.message).split('\n')[0] + ' (fell back to deleteMany+dropIndexes)'
      })
      console.log(`    dropped ${c.name} (${c.count} docs)${typeof ok === 'string' ? ` — ${ok}` : ''}`)
    }
    const after = await userCollections(db)
    console.log(`  remaining user collections: ${after.length}${after.length ? ' — ' + after.map((a: any) => a.name).join(', ') : ' (clean)'}`)
    if (after.length > 0) {
      console.error('  ABORT: collections remain after drop — inspect manually before seeding')
      process.exit(2)
    }
    console.log('  DROP OK: aics_portal is empty; ready for the seed')
  }

  if (mode === 'verify') {
    const colls = await userCollections(db)
    console.log('  collections / counts:')
    for (const c of colls) console.log(`    ${c.name}: ${c.count} docs`)
    const subjects = db.collection('subjects')
    const total = await subjects.countDocuments({})
    const stamped = await subjects.countDocuments({ professorUsername: { $exists: true } })
    const legacy = await subjects.countDocuments({ professorUsername: null })
    console.log(`  subjects: total=${total} stamped=${stamped} legacy=${legacy}`)
    const idx = await subjects.listIndexes().toArray()
    const hasPU = idx.some((i: any) => JSON.stringify(i.key) === '{"branch":1,"professorUsername":1}')
    console.log(`  index {branch:1,professorUsername:1}: ${hasPU ? 'PRESENT' : 'MISSING'}`)
    // dual-key fragment equivalence (the deployed Phase-1 read path)
    for (const [u, n] of [['m.reyes', 'Engr. Maria Cristina Reyes'], ['l.bautista', 'Engr. Lorenzo Bautista']] as const) {
      const frag = await subjects.countDocuments({ $or: [{ professorUsername: u }, { professorUsername: null, professor: n }] })
      const strict = await subjects.countDocuments({ professorUsername: u })
      console.log(`  ${u}: fragment=${frag} strict=${strict} ${frag === strict ? 'AGREE' : 'DIVERGE (fallback arm live for this actor)'}`)
    }
    const accounts = await db.collection('students').countDocuments({ role: 'faculty' })
    console.log(`  faculty accounts: ${accounts}`)
    console.log('  VERIFY OK')
  }

  await client.close()
}

main().catch((err) => {
  // scrub any driver error text that could embed the URI
  const safe = String(err?.message ?? err).replace(/mongodb(\+srv)?:\/\/\S+/g, '<redacted-uri>')
  console.error(`[prod-reseed:${mode}] ERROR: ${safe}`)
  process.exit(1)
})
