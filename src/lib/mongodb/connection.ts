import { MongoClient } from 'mongodb'
import { getMongoEnv } from '@/lib/env'

// Keep one connection attempt per runtime so concurrent requests can share
// initialization. A failed attempt releases its pool and allows a later retry.
let connection: Promise<{ client: MongoClient; dbName: string }> | undefined

export async function getCollection<T = any>(name: string) {
  if (!connection) {
    const { uri, dbName } = getMongoEnv()
    const client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5_000,
      connectTimeoutMS: 5_000,
      waitQueueTimeoutMS: 5_000,
      socketTimeoutMS: 15_000,
    })
    connection = client.connect().then(() => ({ client, dbName })).catch(async (error: unknown) => {
      try {
        await client.close()
      } catch {
        // The initial connection error carries the failure for the caller.
      } finally {
        connection = undefined
      }
      throw error
    })
  }
  const { client, dbName } = await connection
  // Preserve the collection type expected by the existing route interfaces.
  return client.db(dbName).collection(name) as any
}
