// Independent parent observes the worker's exit and verifies that every
// recorded supervisor/root PID is absent after kernel-job cleanup.
import { spawn, execFileSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, openSync, closeSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

if (process.argv.length !== 2 || process.execArgv.length || process.env.NODE_OPTIONS || process.env.BUN_OPTIONS) throw new Error('Unsupported invocation')
const evidence = resolve(process.env.GATE_EVID || 'docs/done/qa_evidence/ui-ux/onboarding/phase2-completion')
mkdirSync(evidence, { recursive: true })
const baseline = readFileSync(resolve(import.meta.dirname, '../../docs/done/qa_evidence/ui-ux/onboarding/phase2-gate/baseline-sha.txt'), 'utf8').trim()
if (!/^[a-f0-9]{40}$/.test(baseline)) throw new Error('Pinned baseline missing')
writeFileSync(resolve(evidence, 'baseline-sha.txt'), baseline + '\n', { flag: 'wx' })
const out = resolve(evidence, 'prod-smoke')
const fd = openSync(resolve(evidence, 'a1-worker.log'), 'wx')
const child = spawn(process.execPath, [resolve(import.meta.dirname, 'student-prod-smoke.mjs')],
  { cwd: process.cwd(), env: process.env, stdio: ['ignore', fd, fd], windowsHide: true })
const exit = await new Promise(resolveExit => {
  child.once('error', () => resolveExit({ code: null, signal: null, spawnFailed: true }))
  child.once('close', (code, signal) => resolveExit({ code, signal }))
})
closeSync(fd)
const observer = { observerPid: process.pid, workerPid: child.pid, workerExit: exit,
  invocation: { executable: process.execPath, argv: process.argv, execArgv: process.execArgv, version: process.version },
  observedAt: new Date().toISOString(), queryExitCode: null, remaining: null }
try {
  const result = JSON.parse(readFileSync(resolve(out, 'result.json')))
  observer.runId = result.runId
  observer.sourceHEAD = result.source?.head
  const records = result.cleanup?.records || []
  const pids = [...new Set(records.flatMap(r => [r.supervisorPid, r.rootPid, ...(r.browserPids || [])]))]
  if (!pids.length || pids.some(pid => !Number.isInteger(pid) || pid <= 0 || pid === process.pid)) throw new Error('Cleanup PID inventory invalid')
  observer.queriedPids = pids
  const filter = pids.map(pid => `ProcessId=${pid}`).join(' OR ')
  const command = `$ErrorActionPreference='Stop'; $rows=@(Get-CimInstance Win32_Process -Filter '${filter}' | Select-Object ProcessId,CreationDate); ConvertTo-Json -InputObject $rows -Compress`
  observer.remaining = JSON.parse(execFileSync('powershell.exe', ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', command],
    { encoding: 'utf8', timeout: 30000, windowsHide: true }))
  observer.queryExitCode = 0
  if (!Array.isArray(observer.remaining)) throw new Error('Invalid process observation')
  observer.pass = exit.code === 0 && exit.signal === null && result.workerPid === child.pid && observer.remaining.length === 0
} catch (error) { observer.pass = false; observer.error = error.message }
const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const names = ['result.json', 'cleanup-observer.json', 'build-result.json', 'build.log', 'chunk-scan.json', 'production.png', 'lint.log', 'typecheck.log', 'quality-result.json', 'student-performance.json', 'execution.json', 'manifest.txt', 'baseline-sha.txt']
const integrity = { schema: 'aics-a1-artifacts/v1', runId: observer.runId, artifacts: [] }
const artifacts = new Map()
for (const name of names.filter(name => name !== 'cleanup-observer.json')) {
  try { const bytes = readFileSync(resolve(out, name)); artifacts.set(name, { name, bytes: bytes.length, sha256: hash(bytes) }) }
  catch { artifacts.set(name, { name, missing: true }); observer.pass = false }
}
writeFileSync(resolve(out, 'cleanup-observer.json'), JSON.stringify(observer, null, 2))
const observedBytes = readFileSync(resolve(out, 'cleanup-observer.json'))
artifacts.set('cleanup-observer.json', { name: 'cleanup-observer.json', bytes: observedBytes.length, sha256: hash(observedBytes) })
integrity.artifacts = names.map(name => artifacts.get(name))
writeFileSync(resolve(out, 'artifact-integrity.json'), JSON.stringify(integrity, null, 2))
console.log(`A1 worker exit=${exit.code}; independent cleanup=${observer.pass ? 'PASS' : 'FAIL'}; evidence=${out}`)
process.exitCode = observer.pass ? 0 : 1
