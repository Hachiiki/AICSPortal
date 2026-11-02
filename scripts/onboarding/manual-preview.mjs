// Serve the existing verified production build behind an in-memory write guard.
// No calibration, environment-file edits, dependency install or application patches.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { get } from 'node:http'
import { jwtVerify } from 'jose'
import { createManualPreviewServer } from './manual-preview-server.mjs'

const repo = resolve(import.meta.dirname, '../..')
const args = process.argv.slice(2)
if (args.some(a => !/^--(?:port=\d+|evidence=.+)$/.test(a))) throw new Error('Use --port=4341 or --evidence=<build-result.json> only')
const port = Number(args.find(a => a.startsWith('--port='))?.slice(7) || 4341)
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Invalid preview port')
const origin = `http://onboarding.localhost:${port}`
const git = a => execFileSync('git', a, { cwd: repo, encoding: 'utf8', windowsHide: true }).trim()
if (git(['branch', '--show-current']) !== 'main-full-dev') throw new Error('Wrong branch')
const qualityPath = resolve(repo, args.find(a => a.startsWith('--evidence='))?.slice(11) || '.phase2-local/phase3-quality/result.json')
const quality = JSON.parse(readFileSync(qualityPath))
if (quality.commands.length !== 3 || quality.commands.some(c => c.exitCode !== 0) || !existsSync(resolve(quality.source, '.next/BUILD_ID'))) throw new Error('A previously verified build is required')
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) {
  if (existsSync(resolve(quality.source, file))) throw new Error('Unexpected environment file in isolated build')
}
const sha = b => createHash('sha256').update(b).digest('hex')
const entries = new Map(git(['ls-tree', '-r', '-z', 'HEAD']).split('\0').filter(Boolean).map(line => { const i = line.indexOf('\t'); return [line.slice(i + 1), line.slice(0, i).split(' ')[2]] }))
for (const file of quality.records) {
  const built = readFileSync(resolve(quality.source, file.path)), current = readFileSync(resolve(repo, file.path))
  const blob = createHash('sha1').update(`blob ${built.length}\0`).update(built).digest('hex')
  if (sha(built) !== file.sha256 || sha(current) !== file.sha256 || blob !== entries.get(file.path)) throw new Error('Build/source mismatch: ' + file.path)
}
// Explicit local configuration, scoped to this process. Never load checkout .env.local.
const allowedEnv = new Set(['PATH', 'SYSTEMROOT', 'WINDIR', 'TEMP', 'TMP', 'USERPROFILE', 'APPDATA', 'LOCALAPPDATA', 'COMSPEC', 'PATHEXT', 'NUMBER_OF_PROCESSORS', 'PROGRAMFILES', 'PROGRAMFILES(X86)', 'PROGRAMW6432'])
for (const key of Object.keys(process.env)) if (!allowedEnv.has(key.toUpperCase())) delete process.env[key]
process.env.NODE_ENV = 'production'
process.env.APP_ENV = 'production'
process.env.NEXT_TELEMETRY_DISABLED = '1'
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/aics_portal?directConnection=true'
process.env.MONGODB_DB = 'aics_portal'
// Public test-only key, identical to the existing local production smoke key.
process.env.AUTH_SECRET = 'aics-phase2-gate-smoke-secret-0x5166-not-for-real-deploys'

const out = resolve(repo, '.phase2-local/manual-preview')
mkdirSync(out, { recursive: true })
let app, server, stopping = false
const metadata = { startedAt: new Date().toISOString(), sourceCommit: git(['rev-parse', 'HEAD']), buildEvidence: qualityPath, source: quality.source, sourceInputsMatched: quality.records.length, origin, pid: process.pid, mode: 'Existing production UI; onboarding progress simulated; account/data mutations blocked' }
const runFile = resolve(out, `session-${Date.now()}-${process.pid}.json`)
const save = () => {
  const value = JSON.stringify({ ...metadata, stats: server?.previewStats }, null, 2)
  writeFileSync(runFile, value); writeFileSync(resolve(out, 'session.json'), value)
}
async function stop() {
  if (stopping) return
  stopping = true
  const deadline = setTimeout(() => { metadata.cleanupErrors = ['Cleanup deadline exceeded']; metadata.stoppedAt = new Date().toISOString(); save(); process.exit(1) }, 15000)
  deadline.unref()
  const errors = metadata.startupError ? ['Startup failed'] : []
  try {
    metadata.cleanupStage = 'http'; save()
    if (server?.listening) { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)) }
    metadata.cleanupStage = 'next'; save()
    await app?.close()
  } catch { errors.push('Server close failed') }
  metadata.stoppedAt = new Date().toISOString(); metadata.cleanupErrors = errors; save()
  process.exit(errors.length ? 1 : 0)
}
process.on('SIGINT', () => void stop())
process.on('SIGTERM', () => void stop())
try {
  const { default: next } = await import('next')
  app = next({ dev: false, dir: quality.source, hostname: 'onboarding.localhost', port })
  console.log('Preparing the verified production app')
  await app.prepare()
  const handleApp = app.getRequestHandler()
  server = createManualPreviewServer({
    handleApp,
    publicPaths: quality.records.filter(f => f.path.startsWith('public/')).map(f => '/' + f.path.slice(7)),
    authenticate: async req => {
      const token = req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('aics_session='))?.slice(13)
      if (!token) return false
      try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET))
        return payload.sub === 'juan.santos' && payload.role === 'student' && payload.branch === 'commonwealth'
      } catch { return false }
    },
    onStop: stop,
  })
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(port, '127.0.0.1', resolve) })
  await new Promise((resolve, reject) => {
    const request = get(`http://127.0.0.1:${port}/`, { headers: { host: `onboarding.localhost:${port}` } }, response => {
      response.resume()
      response.once('end', () => response.statusCode === 200 ? resolve() : reject(new Error('Preview HTTP readiness failed')))
    })
    request.setTimeout(10000, () => request.destroy(new Error('Preview HTTP readiness timeout')))
    request.once('error', reject)
  })
  metadata.readyAt = new Date().toISOString(); save()
  console.log('PREVIEW READY ' + origin + '/')
  console.log('Review controls ' + origin + '/__preview')
  console.log('Use Stop preview on the controls page to shut down this server.')
} catch (error) {
  metadata.startupError = { name: error.name, message: error.message }
  console.error('Preview startup failed:', error.message)
  await stop()
}
