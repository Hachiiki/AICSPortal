// DB snapshot/restore helper for the G4 route gate.
// Runs under Node (the mongodb driver's native bson module does not load
// under Bun). EJSON round-trips preserve BSON types (Date, ObjectId).
//
//   node scripts/theme/db-clone.mjs snapshot <file.json>   # write all collections
//   node scripts/theme/db-clone.mjs restore  <file.json>   # drop + reinsert all
//
// MONGODB_URI and MONGODB_DB come from the environment (the G4 harness
// passes them from the dev worktree's .env.local).
import { MongoClient } from 'mongodb'
import { EJSON } from 'bson'
import { readFileSync, writeFileSync } from 'node:fs'

const [mode, file] = process.argv.slice(2)
if (!mode || !file || !['snapshot', 'restore'].includes(mode)) {
  console.error('usage: node db-clone.mjs {snapshot|restore} <file.json>')
  process.exit(2)
}
const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'aics_portal'
if (!uri) {
  console.error('MONGODB_URI not set')
  process.exit(2)
}

const client = new MongoClient(uri)
await client.connect()
const db = client.db(dbName)

if (mode === 'snapshot') {
  const collections = await db.collections()
  const snap = {}
  for (const col of collections) {
    snap[col.collectionName] = await col.find({}).toArray()
  }
  writeFileSync(file, EJSON.stringify(snap, null, 1))
  const counts = Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length]))
  console.log(`db-clone: snapshot ${JSON.stringify(counts)} -> ${file}`)
} else {
  const snap = EJSON.parse(readFileSync(file, 'utf8'))
  for (const [name, docs] of Object.entries(snap)) {
    const col = db.collection(name)
    await col.deleteMany({})
    if (docs.length) await col.insertMany(docs)
  }
  const counts = Object.fromEntries(Object.entries(snap).map(([k, v]) => [k, v.length]))
  console.log(`db-clone: restored ${JSON.stringify(counts)} from ${file}`)
}

await client.close()
