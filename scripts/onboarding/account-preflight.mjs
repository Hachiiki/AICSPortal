// Read-only A1 preflight. Use the application verifier: its salt is the hex
// string itself, not the bytes obtained by decoding that string.
import { MongoClient } from 'mongodb'
import { fileURLToPath } from 'node:url'
import { resolve } from 'node:path'
import { verifyPassword } from '../../src/lib/password.ts'

const URI = 'mongodb://127.0.0.1:27017/aics_portal?directConnection=true'
export async function accountPreflight() {
  const u = new URL(URI)
  if (u.hostname !== '127.0.0.1' || u.port !== '27017' || u.pathname !== '/aics_portal'
    || u.protocol !== 'mongodb:' || u.username || u.password
    || u.search !== '?directConnection=true') throw new Error('Local database guard failed')
  const client = new MongoClient(URI, { serverSelectionTimeoutMS: 5000, directConnection: true })
  try {
    await client.connect()
    // Username uniqueness is global in the login contract; then require branch.
    const docs = await client.db('aics_portal').collection('students').find(
      { username: 'juan.santos' },
      { projection: { role: 1, branch: 1, password: 1, photoUrl: 1 }, maxTimeMS: 5000 },
    ).limit(2).toArray()
    const d = docs.length === 1 ? docs[0] : null
    const result = {
      unique: docs.length === 1,
      role: d?.role === 'student' ? 'student' : null,
      branch: d?.branch === 'commonwealth' ? 'commonwealth' : null,
      modernHash: typeof d?.password === 'string' && /^scrypt\$[0-9a-f]{32}\$[0-9a-f]{128}$/.test(d.password),
      credentialMatches: false,
      photoAbsent: !d?.photoUrl,
      writesAttempted: 0,
    }
    if (result.unique && result.role && result.branch && result.modernHash) {
      result.credentialMatches = (await verifyPassword('student123', d.password)).ok
    }
    return result
  } finally {
    await client.close()
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const result = await accountPreflight()
  console.log(JSON.stringify({ ...result, clientClosed: true }, null, 2))
  process.exitCode = result.unique && result.role && result.branch && result.modernHash && result.credentialMatches ? 0 : 1
}
