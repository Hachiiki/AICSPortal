// Export only committed files. Never walk user-owned exports or load .env files.
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, writeFileSync, readFileSync, symlinkSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')
export const repo = resolve(import.meta.dirname, '../..')
export const git = (args, encoding = 'utf8') => execFileSync('git', args, { cwd: repo, encoding, maxBuffer: 100 * 1024 * 1024, windowsHide: true })
export function exportSource(dir, working = false) {
  if (existsSync(dir)) throw new Error('Refusing to overwrite an existing source export')
  mkdirSync(dir, { recursive: true })
  const head = git(['rev-parse', 'HEAD']).trim()
  if (git(['branch', '--show-current']).trim() !== 'main-full-dev') throw new Error('Wrong branch')
  const records = git(['ls-tree', '-r', '-z', head]).split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t')
    const [mode, type, oid] = line.slice(0, tab).split(' ')
    return { path: line.slice(tab + 1), mode, type, oid }
  })
  const exported = []
  for (const f of records) {
    // App inputs and script helpers only. The omitted dev documents are listed
    // by Git metadata in the evidence, not read from the user's working tree.
    if (!/^(src\/|public\/|scripts\/onboarding\/|package\.json$|next\.config\.ts$|tsconfig\.json$|next-env\.d\.ts$|postcss\.config\.mjs$|eslint\.config\.mjs$|tailwind\.config\.ts$)/.test(f.path)) continue
    if (f.type !== 'blob' || !['100644', '100755'].includes(f.mode)) throw new Error('Unsupported export entry')
    const bytes = git(['cat-file', 'blob', f.oid], 'buffer')
    const blob = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
    if (blob !== f.oid) throw new Error('Git blob verification failed')
    const target = resolve(dir, f.path)
    mkdirSync(dirname(target), { recursive: true })
    // Working-source verification explicitly records the patch bytes. Never
    // copy the protected next-env.d.ts or any environment file.
    const current = working && f.path.startsWith('src/') ? readFileSync(resolve(repo, f.path)) : bytes
    writeFileSync(target, current)
    if (sha256(readFileSync(target)) !== sha256(current)) throw new Error('Export verification failed')
    exported.push({ ...f, sha256: sha256(current), differsFromHead: !current.equals(bytes) })
  }
  // Existing dependencies only, no installation, scripts, or dependency changes.
  symlinkSync(resolve(repo, 'node_modules'), resolve(dir, 'node_modules'), 'junction')
  return { head, gitFiles: records, exported, exportBytesVerified: true,
    kind: working ? 'working-source-with-recorded-differences' : 'committed-source',
    dependencies: { mode: 'existing installed node_modules junction', packageSHA256: sha256(readFileSync(resolve(repo, 'package.json'))),
      next: JSON.parse(readFileSync(resolve(repo, 'node_modules/next/package.json'))).version,
      react: JSON.parse(readFileSync(resolve(repo, 'node_modules/react/package.json'))).version } }
}

export function localEnv(mode = 'production') {
  const env = Object.fromEntries(['PATH', 'Path', 'SystemRoot', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS'].filter(k => process.env[k]).map(k => [k, process.env[k]]))
  return { ...env, NODE_ENV: mode, APP_ENV: mode, NEXT_TELEMETRY_DISABLED: '1',
    MONGODB_URI: 'mongodb://127.0.0.1:27017/aics_portal?directConnection=true', MONGODB_DB: 'aics_portal',
    AUTH_SECRET: 'aics-phase2-gate-smoke-secret-0x5166-not-for-real-deploys' }
}
