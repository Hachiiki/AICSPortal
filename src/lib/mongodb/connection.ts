import { MongoClient, type Db } from 'mongodb'

// ============================================================
//  MongoDB connection layer
// ============================================================
//
//  Connection string and database name are read from environment
//  variables (.env.local):
//
//    MONGODB_URI=mongodb+srv://...
//    MONGODB_DB=aics_portal
//
//  Branch-based organization:
//  Every document (student, subject, session, document, etc.)
//  carries a `branch` field (e.g. "commonwealth"). When a student
//  logs in, their branch is detected from their record and all
//  subsequent queries are scoped to that branch via a filter:
//
//    db.collection('students').findOne({ username, branch })
//
//  This gives us logical separation per branch without the overhead
//  of separate databases, while still allowing cross-branch queries
//  for admin views later.
// ============================================================

const uri = process.env.MONGODB_URI
const dbName = process.env.MONGODB_DB || 'aics_portal'

// NOTE: We do NOT throw at module load time — that would crash the
// dev server on every hot reload if the env var is missing. Instead
// we throw lazily when getDb() is actually called.

let client: MongoClient | null = null
let db: Db | null = null

export async function getDb(): Promise<Db> {
  if (db) return db
  if (!uri) {
    throw new Error('MONGODB_URI is not set. Add it to .env.local')
  }
  if (!client) {
    client = new MongoClient(uri)
    await client.connect()
  }
  db = client.db(dbName)
  return db
}

export async function getCollection<T = any>(name: string) {
  const database = await getDb()
  return database.collection<T>(name)
}
