// Separate reader for the owner-approved student-production scope. Historical
// readers and pins retain their original criteria. Registration is separate.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { REVIEWED_A1_V3_PRODUCERS } from './a1-v3-registry.mjs'

const hash = bytes => createHash('sha256').update(bytes).digest('hex')
const MARKERS = ['dev-tour-launcher', 'dev-tour-board', 'board-late-target', 'board-volatile-target', 'board-never-present', 'remove-volatile-target', 'FabricateOnboardingDev', 'onboarding board', ...Array.from({ length: 8 }, (_, n) => `Synthetic ${n + 1}:`)]
const HISTORICAL_MARKERS = ['TourOverlay', 'data-tour-overlay', 'data-tour-card', 'data-tour-spotlight', 'dev-tour-launcher', 'Guided tour completed.', 'FabricateOnboardingDev', 'onboarding board', 'remove-volatile-target']
const PRODUCER_FILES = ['10-perf.mjs', 'account-preflight.mjs', 'isolated-build.mjs', 'isolated-source.mjs', 'lib.mjs', 'owned-browser-task.mjs', 'settle-timing.mjs', 'student-a1-observer.mjs', 'student-prod-smoke.mjs']
const ASSERTIONS = ['account-preflight', 'committed-source', 'build-result-present', 'production-build', 'static-gates', 'targeted-synthetic-marker-scan', 'owned-production-server', 'demo-route-disabled', 'real-production-login', 'synthetic-controls-absent', 'real-student-tour', 'production-navigation', 'replay-preserves-progress', 'request-safety', 'repository-integrity', 'owned-process-cleanup', 'producer-unchanged']
const ARTIFACTS = ['result.json', 'cleanup-observer.json', 'build-result.json', 'build.log', 'chunk-scan.json', 'production.png', 'lint.log', 'typecheck.log', 'quality-result.json', 'student-performance.json', 'execution.json', 'manifest.txt', 'baseline-sha.txt']
const SOURCE_INPUT = /^(src\/|public\/|scripts\/onboarding\/|package\.json$|next\.config\.ts$|tsconfig\.json$|next-env\.d\.ts$|postcss\.config\.mjs$|eslint\.config\.mjs$|tailwind\.config\.ts$)/
const requireFact = (ok, message) => { if (!ok) throw new Error(message) }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

// This function checks the saved committed-source run. The gate-facing wrapper
// below additionally refuses dirty application inputs, as the existing reader
// does. A saved smoke pass must not approve untested working-tree edits.
export function verifyA1V3Run(dir, repo, head) {
  const read = name => readFileSync(resolve(dir, name))
  const result = JSON.parse(read('result.json'))
  const integrity = JSON.parse(read('artifact-integrity.json'))
  requireFact(result.schema === 'aics-student-a1/v3' && result.criterion === 'owner-approved-student-production-2026-11-03' && result.exitCode === 0 && result.runId, 'A1 student v3 outcome/schema invalid')
  requireFact(result.source?.head === head && /^[0-9a-f]{40}$/.test(head), 'A1 student v3 source HEAD mismatch')
  const execution = JSON.parse(read('execution.json')), baseline = read('baseline-sha.txt').toString('utf8').trim(), manifest = read('manifest.txt').toString('utf8')
  requireFact(/^[a-f0-9]{40}$/.test(baseline) && baseline === result.baseline && execution.baseline === baseline && execution.head === head
    && execution.schema === 'aics-student-a1-execution/v1' && execution.runId === result.runId && same(execution.invocation, result.invocation)
    && same(execution.producer, result.producer) && execution.producerFingerprint === result.producerFingerprint
    && manifest.includes(`baseline SHA: ${baseline}`) && manifest.includes(`HEAD SHA: ${head}`) && manifest.includes('exit: 0'), 'A1 baseline/execution manifest missing or mismatched')
  requireFact(integrity.schema === 'aics-a1-artifacts/v1' && integrity.runId === result.runId
    && Array.isArray(integrity.artifacts) && same(integrity.artifacts.map(a => a.name), ARTIFACTS), 'A1 student v3 artifact inventory incomplete')
  for (const a of integrity.artifacts) {
    const bytes = read(a.name)
    requireFact(a.bytes === bytes.length && a.sha256 === hash(bytes) && !a.missing, 'A1 student v3 artifact changed')
  }
  const producer = result.producer
  requireFact(Array.isArray(producer) && same(producer.map(p => p.name), PRODUCER_FILES), 'A1 student v3 producer file set invalid')
  for (const file of producer) requireFact(/^[a-f0-9]{64}$/.test(file.sha256)
    && hash(read('producer/' + file.name)) === file.sha256, 'A1 student v3 producer bytes mismatch')
  const fingerprint = hash(JSON.stringify(producer))
  requireFact(fingerprint === result.producerFingerprint && REVIEWED_A1_V3_PRODUCERS[fingerprint]?.kind === 'isolated-student-v3', 'A1 student v3 producer is not registered as reviewed')
  const invocation = result.invocation
  requireFact(invocation?.executable && invocation.version && same(invocation.execArgv, [])
    && invocation.argv?.length === 2 && invocation.argv[0] === invocation.executable
    && invocation.argv[1].replaceAll('\\', '/').endsWith('/student-prod-smoke.mjs'), 'A1 student v3 worker invocation invalid')
  requireFact(Array.isArray(result.assertions) && result.assertions.every(a => a.ok === true)
    && ASSERTIONS.every(id => result.assertions.filter(a => a.id === id).length === 1), 'A1 student v3 assertion set incomplete')
  const git = (args, encoding = 'utf8') => execFileSync('git', args, { cwd: repo, encoding, windowsHide: true, maxBuffer: 100 * 1024 * 1024 })
  const gitFiles = git(['ls-tree', '-r', '-z', head]).split('\0').filter(Boolean).map(line => {
    const tab = line.indexOf('\t'), [mode, type, oid] = line.slice(0, tab).split(' ')
    return { path: line.slice(tab + 1), mode, type, oid }
  })
  requireFact(same(result.source.gitFiles, gitFiles) && result.source.kind === 'committed-source'
    && result.source.exportBytesVerified === true, 'A1 student v3 committed source inventory mismatch')
  const exported = result.source.exported
  const expected = gitFiles.filter(f => SOURCE_INPUT.test(f.path))
  requireFact(Array.isArray(exported) && exported.length === expected.length, 'A1 student v3 export missing inputs')
  for (let i = 0; i < expected.length; i++) {
    const file = expected[i], actual = exported[i]
    requireFact(file.type === 'blob' && ['100644', '100755'].includes(file.mode)
      && ['path', 'mode', 'type', 'oid'].every(key => actual[key] === file[key])
      && actual.differsFromHead === false, 'A1 student v3 export file differs from HEAD')
    requireFact(hash(git(['cat-file', 'blob', file.oid], 'buffer')) === actual.sha256, 'A1 student v3 export byte identity mismatch')
  }
  const o = result.observations, a = o?.accountPreflight, d = o?.dom, login = o?.login
  requireFact(a?.unique === true && a.role === 'student' && a.branch === 'commonwealth' && a.modernHash === true
    && a.credentialMatches === true && a.writesAttempted === 0, 'A1 student v3 account preflight failed')
  requireFact(o.build?.exitCode === 0 && o.build.signal === null && o.build.compiler === 'webpack'
    && same(o.build, JSON.parse(read('build-result.json'))), 'A1 student v3 production build failed')
  const scan = JSON.parse(read('chunk-scan.json'))
  requireFact(same(o.scan, scan) && same(scan.markers, MARKERS) && same(scan.historicalMarkers, HISTORICAL_MARKERS) && same(scan.hits, [])
    && Number.isInteger(scan.totalClientChunkFiles) && scan.totalClientChunkFiles > 0
    && scan.totalBytesScanned > 0, 'A1 student v3 targeted scan invalid')
  requireFact(Array.isArray(scan.chunks) && scan.chunks.length === scan.totalClientChunkFiles
    && new Set(scan.chunks.map(c => c.file)).size === scan.chunks.length
    && new Set(scan.chunks.map(c => c.artifact)).size === scan.chunks.length, 'A1 student v3 chunk inventory incomplete')
  const actualHits = [], actualHistorical = []
  let actualBytes = 0
  for (const chunk of scan.chunks) {
    const parts = chunk.artifact.split('/')
    requireFact(parts[0] === 'client-chunks' && parts.length > 1 && parts.slice(1).every(part => part && !['.', '..'].includes(part)
      && [...part].every(char => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_.-[]'.includes(char)))
      && chunk.file === '.next/static/chunks/' + parts.slice(1).join('/'), 'Unsafe chunk evidence path')
    const bytes = read(chunk.artifact), text = bytes.toString('utf8')
    requireFact(bytes.length === chunk.bytes && hash(bytes) === chunk.sha256, 'A1 student v3 built chunk changed')
    actualBytes += bytes.length
    for (const marker of MARKERS) if (text.includes(marker)) actualHits.push({ file: chunk.file, marker })
    for (const marker of scan.historicalMarkers) if (text.includes(marker)) actualHistorical.push({ file: chunk.file, marker })
  }
  requireFact(actualBytes === scan.totalBytesScanned && same(actualHits, scan.hits) && same(actualHistorical, scan.historicalHits), 'A1 student v3 raw chunk scan mismatch')
  const quality = JSON.parse(read('quality-result.json'))
  requireFact(same(o.quality, quality) && quality.length === 3 && same(quality.map(c => c.name), ['lint', 'typecheck', 'build']) && quality.every(c => c.exitCode === 0), 'A1 student v3 static gates failed')
  requireFact(o.server?.ready === true && o.server.ownedListener === true && o.server.port === 4320
    && o.server.origin === 'http://127.0.0.1:4320', 'A1 student v3 owned production listener not established')
  requireFact(login?.status === 200 && login.cookieIssued === true && login.username === 'juan.santos'
    && login.role === 'student' && login.branch === 'commonwealth', 'A1 student v3 production login failed')
  requireFact(d?.launcher === false && d.board === false && d.removeTarget === false && d.navOk === true && o.demoStatus === 404
    && o.navigation?.academicsReached === true && o.navigation.pathname === '/portal/commonwealth/student/juan.santos/academics', 'A1 student v3 production DOM/navigation failed')
  requireFact(same(o.studentTour?.steps, ['student-overview', 'student-announcements', 'student-academics', 'student-tasks', 'student-events', 'student-account', 'student-help'])
    && o.studentTour.completedInFixture === true && o.studentTour.otherValuesUnchanged === true && o.replayPreserved === true
    && o.simulatedProgressWrites > 0, 'A1 student v3 real student tour failed')
  requireFact(o.routeError === null && o.blockedMutations === 0 && Number.isInteger(o.blockedExternal)
    && o.blockedExternal >= 0, 'A1 student v3 request guard failed')
  const before = result.integrity?.before, after = result.integrity?.after
  requireFact(before?.branch === 'main-full-dev' && before.head === head && same(before, after)
    && /^[a-f0-9]{64}$/.test(before.nextEnvSHA256) && /^[a-f0-9]{64}$/.test(before.diffSHA256)
    && typeof before.worktrees === 'string', 'A1 student v3 repository integrity failed')
  const cleanup = result.cleanup
  requireFact(same(cleanup?.errors, []) && Array.isArray(cleanup.records) && cleanup.records.length === 3
    && same([...cleanup.records.map(r => r.name)].sort(), ['chromium', 'production-build', 'production-server']), 'A1 student v3 cleanup inventory invalid')
  for (const r of cleanup.records) requireFact(r.cleanupAttempted === true && r.cleanupFailed === false && r.stopped === true
    && r.terminationConfirmed === true && r.jobEmpty === true && r.fallbackAttempted === false
    && r.supervisorExit?.code === 0 && r.supervisorExit.signal === null && same(r.errors, []), 'A1 student v3 owned cleanup failed')
  const browser = cleanup.records.find(r => r.name === 'chromium')
  requireFact(browser.browserPids?.length > 0 && same(browser.remainingBrowserProcesses, []), 'A1 student v3 browser descendant absence unconfirmed')
  const observer = JSON.parse(read('cleanup-observer.json'))
  const expectedPids = [...new Set(cleanup.records.flatMap(r => [r.supervisorPid, r.rootPid, ...(r.browserPids || [])]))]
  requireFact(observer.pass === true && observer.runId === result.runId && observer.sourceHEAD === head
    && Number.isInteger(observer.observerPid) && observer.observerPid > 0 && observer.observerPid !== result.workerPid
    && observer.workerPid === result.workerPid && observer.workerExit?.code === 0 && observer.workerExit.signal === null
    && observer.queryExitCode === 0 && same(observer.remaining, []) && same(observer.queriedPids, expectedPids)
    && expectedPids.every(pid => Number.isInteger(pid) && pid > 0), 'A1 student v3 independent process absence unconfirmed')
  requireFact(observer.invocation?.argv?.length === 2 && observer.invocation.argv[0] === observer.invocation.executable
    && observer.invocation.argv[1].replaceAll('\\', '/').endsWith('/student-a1-observer.mjs')
    && same(observer.invocation.execArgv, []), 'A1 student v3 observer invocation invalid')
  return { status: 'verified-committed-run', head, producerFingerprint: fingerprint,
    detail: 'Owner-approved student scope: actual production build, real local login/navigation, seven-step student tour, absent synthetic controls, raw built-chunk rescan, source/producer/artifact identity and independent process absence. Targeted scans do not prove exhaustive zero related bytes or modules.' }
}

export function verifyA1V3Gate(dir, repo, head) {
  requireFact(/^[a-f0-9]{40}$/.test(head), 'Current committed HEAD invalid')
  requireFact(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repo, encoding: 'utf8', windowsHide: true }).trim() === head
    && execFileSync('git', ['branch', '--show-current'], { cwd: repo, encoding: 'utf8', windowsHide: true }).trim() === 'main-full-dev', 'A1 gate must bind the current main-full-dev commit')
  const dirty = execFileSync('git', ['diff', '--name-only', 'HEAD', '--', 'src', 'public', 'package.json', 'bun.lock', 'next.config.ts', 'tsconfig.json'], { cwd: repo, encoding: 'utf8', windowsHide: true }).trim()
  requireFact(!dirty, 'production inputs differ from HEAD; A1 needs fresh verification')
  const untracked = execFileSync('git', ['ls-files', '--others', '--exclude-standard', '--', 'src', 'public'], { cwd: repo, encoding: 'utf8', windowsHide: true }).trim()
  requireFact(!untracked, 'untracked production inputs require fresh verification')
  const testedHead = JSON.parse(readFileSync(resolve(dir, 'result.json'))).source?.head
  requireFact(/^[a-f0-9]{40}$/.test(testedHead), 'A1 source identity missing')
  const changes = execFileSync('git', ['diff', '--name-only', testedHead, head, '--', 'src', 'public', 'package.json', 'next.config.ts', 'tsconfig.json', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'tailwind.config.ts'], { cwd: repo, encoding: 'utf8', windowsHide: true }).trim()
  requireFact(!changes, 'committed application/build inputs changed since A1')
  const producer = JSON.parse(readFileSync(resolve(dir, 'result.json'))).producer
  for (const f of producer) {
    requireFact(PRODUCER_FILES.includes(f.name), 'Unexpected producer input')
    const committed = execFileSync('git', ['show', `${head}:scripts/onboarding/${f.name}`], { cwd: repo, windowsHide: true })
    requireFact(hash(committed) === f.sha256 && hash(readFileSync(resolve(repo, 'scripts/onboarding', f.name))) === f.sha256, 'producer bytes differ from current committed/reviewed bytes')
  }
  return { ...verifyA1V3Run(dir, repo, testedHead), currentHead: head, testedHead, committedInputsEquivalent: true,
    sourceDisclosure: testedHead === head ? 'Executed at current committed HEAD' : 'Executed at testedHead; every application/build input is unchanged, and all executed producer bytes match the current commit and checkout. This is byte equivalence, not a claimed new build.' }
}
