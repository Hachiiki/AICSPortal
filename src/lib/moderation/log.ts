// Moderation decision log — moderation_logs writer.
//
// Every reject and flag decision is persisted for admin audit, and
// allowlist saves are logged too (rule 5 visibly engaging). A logging
// failure must NEVER change the moderation outcome: errors are logged
// to the server console and swallowed.

import { getCollection } from '@/lib/mongodb/connection'
import type { MongoModerationLog } from '@/lib/mongodb/types'

export async function writeModerationLog(doc: Omit<MongoModerationLog, '_id' | 'createdAt'>): Promise<void> {
  try {
    const col = await getCollection<MongoModerationLog>('moderation_logs')
    await col.insertOne({ ...doc, createdAt: new Date() } as any)
  } catch (err) {
    console.error('Moderation log write failed:', err)
  }
}
