// Mint a dev aics_session JWT for API testing against a local dev
// server. Uses the same dev fallback secret src/lib/session.ts falls
// back to when AUTH_SECRET is unset (dev only — production refuses
// to run without a real secret, so this never mints anything there).
//
//   node scripts/mint-session.mjs juan.santos student commonwealth
import { SignJWT } from 'jose'

const [username, role, branch] = process.argv.slice(2)
if (!username || !role || !branch) {
  console.error('usage: node scripts/mint-session.mjs <username> <role> <branch>')
  process.exit(1)
}

const secret = new TextEncoder().encode(
  process.env.AUTH_SECRET || 'dev-only-insecure-secret-change-in-production'
)

const token = await new SignJWT({ role, branch, tv: 0 })
  .setProtectedHeader({ alg: 'HS256' })
  .setSubject(username)
  .setIssuedAt()
  .setExpirationTime('8h')
  .sign(secret)

console.log(token)
