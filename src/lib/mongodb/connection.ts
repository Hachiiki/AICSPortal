import { MongoClient } from 'mongodb'
import { getMongoEnv, envSummary } from '@/lib/env'

// ============================================================
//  MongoDB connection layer
// ============================================================
//
//  Connection config comes from src/lib/env.ts (the shared
//  environment layer — see docs/environments.md):
//
//    MONGODB_URI=mongodb+srv://...
//    MONGODB_DB=aics_portal  (staging defaults to aics_portal_staging)
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

// NOTE: We do NOT throw at module load time — that would crash the
// dev server on every hot reload if the env var is missing. Instead
// we resolve lazily when getCollection() is actually called.

let client: MongoClient | null = null
let dbName: string | null = null

export async function getCollection<T = any>(name: string) {
  if (!client) {
    const { uri, dbName: resolvedDb } = getMongoEnv()
    dbName = resolvedDb
    client = new MongoClient(uri)
    await client.connect()
    // Boot diagnostic: one line per process, so "which env and db am I
    // actually on" is answerable from the logs at a glance.
    console.log(`[mongo] connected, ${envSummary()}`)
  }
  // Our schema interfaces (MongoStudent, MongoTask, etc.) don't extend
  // mongodb's Document type, so we cast the collection to any and let
  // the caller's <T> generic drive the return type.
  return client.db(dbName!).collection(name) as any
}
