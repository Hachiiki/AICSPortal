// Local-vs-remote classification for MongoDB connection URIs.
//
// SECURITY (issue #72 follow-up, credential-rotation review finding F2):
// seed-mongodb.ts refuses to seed a REMOTE database with the publicly
// documented demo passwords. The original guard tested
// /127\.0\.0\.1|localhost/ against the WHOLE connection string, so a
// remote host whose credentials (or subdomain) contain "localhost" —
// e.g. mongodb://user:my-localhost-pw@evil.example.net/ — was
// misclassified as local and the guard silently let the remote seed
// proceed. This module classifies by the PARSED HOSTNAME only, and
// fails closed: anything unparseable, or any hostname that is not an
// explicit loopback address, is REMOTE (the seed then refuses to run
// without env-injected demo passwords).
//
// Deliberately conservative on purpose: a localhost seed that gets
// refused is a minor annoyance; a remote seed that passes is a data
// incident. Known non-loopback forms treated as REMOTE on purpose:
//   - 0.0.0.0 (unspecified address — connect via localhost/127.x instead)
//   - ::ffff:127.0.0.1 (IPv4-mapped form; use the plain form instead)
//   - multi-host replica-set URIs (mongodb://h1,h2 — unparseable host)
//
// Regression tests: scripts/lib/uri-local.test.ts (bun test).

export function isLocalMongoUri(uri: unknown): boolean {
  if (typeof uri !== 'string' || uri === '') return false
  let hostname: string
  try {
    hostname = new URL(uri).hostname
  } catch {
    return false // unparseable -> REMOTE -> seed refuses (fail-closed)
  }
  if (hostname === '') return false // scheme with no authority (e.g. 'mongodb://')
  // WHATWG URL serializes IPv6 literals with brackets — strip them.
  const host = hostname.replace(/^\[/, '').replace(/\]$/, '').toLowerCase()
  if (host === 'localhost' || host === '::1') return true
  // The entire 127.0.0.0/8 block is loopback. Anchored so that
  // '127.0.0.1.evil.net' / '127-0-0-1.example.net' do NOT match.
  if (/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(host)) return true
  return false
}
