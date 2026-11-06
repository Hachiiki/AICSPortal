// Real HTTP, MongoDB and browser checks for student Phase 3 completion.
// Every run owns a new synthetic database on loopback and removes only that database.
import { MongoClient } from 'mongodb'
import { chromium } from 'playwright'
import { randomUUID, createHash, randomBytes } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { setTimeout as sleep } from 'node:timers/promises'
import { hashPassword } from '../../src/lib/password.ts'
import { localEnv } from './isolated-source.mjs'
import { startOwned, cleanupOwned, requireFreePort, assertListenerOwner, ownedFetch } from './10-perf.mjs'

if (process.argv.length !== 2 || process.execArgv.length || process.env.NODE_OPTIONS || process.env.BUN_OPTIONS) throw new Error('Unsupported invocation')
const root = resolve(import.meta.dirname, '../..')
const output = resolve(process.env.GATE_EVID || resolve(root, '.phase3-local/acceptance'))
if (existsSync(output)) throw new Error('A fresh evidence directory is required')
mkdirSync(output, { recursive: true })
const database = `aics_onboarding_acceptance_${randomUUID().replaceAll('-', '')}`
const uri = new URL(`mongodb://127.0.0.1:27017/${database}?directConnection=true`)
if (uri.hostname !== '127.0.0.1' || uri.port !== '27017' || !/^aics_onboarding_acceptance_[a-f0-9]{32}$/.test(database)) throw new Error('Local synthetic database guard failed')
const port = 4318
const origin = `http://127.0.0.1:${port}`
const password = randomBytes(24).toString('hex')
const client = new MongoClient(uri.href, { serverSelectionTimeoutMS: 5000 })
const report = { startedAt: new Date().toISOString(), sourceHead: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), database, origin, runtime: process.version, assertions: [], cleanup: {}, sourceHashes: {} }
for (const path of ['src/components/onboarding/StudentOnboarding.tsx', 'src/components/portal/Sidebar.tsx', 'src/lib/onboarding/student-client.ts', 'src/lib/onboarding/preferences.ts', 'src/lib/onboarding/registry.ts', 'src/app/api/onboarding/state/route.ts', 'scripts/onboarding/phase3-student-acceptance.mjs']) {
  report.sourceHashes[path] = createHash('sha256').update(readFileSync(resolve(root, path))).digest('hex')
}
const check = (name, condition) => {
  report.assertions.push({ name, pass: !!condition })
  console.log(`${condition ? 'PASS' : 'FAIL'} ${name}`)
  if (!condition) throw new Error(name)
}
let server, browser, databaseCreated = false
const contexts = []
try {
  requireFreePort(port)
  await client.connect()
  const db = client.db(database)
  if ((await db.listCollections().toArray()).length) throw new Error('Synthetic database already exists')
  databaseCreated = true
  const hashed = await hashPassword(password)
  const student = (username, branch) => ({ username, branch, password: hashed, role: 'student', tokenVersion: 0, fullName: `Synthetic ${username}`, firstName: 'Synthetic', lastName: username, middleName: '', studentNumber: username, program: 'Bachelor of Science in Computer Science', programShort: 'BSCS', yearLevel: '2nd Year', section: 'QA-2A', semester: '1st Sem', academicYear: '2026-2027', enrollmentStatus: 'Enrolled', deanLister: false, deanListerSemester: '', gpa: '85.00', email: `${username}@example.invalid`, phone: '', address: '', emergencyContactName: '', emergencyContactNumber: '', branch_name: 'Synthetic QA', branchAddress: '', documents: [] })
  await db.collection('students').insertMany([student('phase3.returning', 'commonwealth'), student('phase3.fresh', 'commonwealth'), student('phase3.other', 'fairview')])
  await db.collection('onboarding_states').createIndex({ branch: 1, username: 1 }, { unique: true })
  await db.collection('onboarding_states').insertOne({ username: 'phase3.returning', branch: 'commonwealth', role: 'student', version: 1, values: { profile: true, tour: true }, preferences: { welcomeSeen: true, checklistDismissed: false }, updatedAt: new Date() })
  const env = { ...localEnv(), MONGODB_URI: uri.href, MONGODB_DB: database, AUTH_SECRET: randomBytes(32).toString('hex') }
  server = await startOwned('phase3', 'student-acceptance-server', process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port)], root, env)
  let ready = false
  for (let attempt = 0; attempt < 60; attempt++) {
    if (await assertListenerOwner(server, port, true)) {
      try { ready = (await ownedFetch(server, port, origin + '/', { signal: AbortSignal.timeout(15000) })).ok } catch (error) { if (error.code !== 'OWNED_HTTP_RETRY') throw error }
      if (ready) break
    }
    await sleep(1000)
  }
  check('production server is ready and its listener belongs to this run', ready)
  async function request(path, cookie, method = 'GET', body) {
    return ownedFetch(server, port, origin + path, { method, headers: { ...(cookie ? { cookie } : {}), ...(body ? { 'content-type': 'application/json' } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(30000) })
  }
  async function login(username) {
    const res = await request('/api/auth/login', null, 'POST', { username, password })
    check(`real synthetic login for ${username}`, res.status === 200)
    const cookie = res.headers.getSetCookie().find(value => value.startsWith('aics_session='))?.split(';')[0]
    if (!cookie) throw new Error('Login issued no session cookie')
    return cookie
  }
  const returningCookie = await login('phase3.returning')
  const freshCookie = await login('phase3.fresh')
  const otherCookie = await login('phase3.other')
  const fresh = await (await request('/api/onboarding/state', freshCookie)).json()
  check('fresh student starts at the current tour release', fresh.persisted && fresh.preferences.tourNoticeReadVersion === 2 && fresh.preferences.tourNoticeDismissedVersion === 2)
  const initial = await (await request('/api/onboarding/state', returningCookie)).json()
  check('legacy student keeps completed steps and has an unread update', initial.values.profile && initial.values.tour && initial.preferences.tourNoticeReadVersion === 1)
  const saved = await (await request('/api/onboarding/state', returningCookie, 'PATCH', { updates: { announcements: true }, preferences: { checklistDismissed: true } })).json()
  check('real API confirms the database progress write', saved.persisted && saved.values.announcements)
  const stored = await db.collection('onboarding_states').findOne({ branch: 'commonwealth', username: 'phase3.returning' })
  check('MongoDB contains completed progress and checklist dismissal', stored.values.announcements && stored.values.profile && stored.preferences.checklistDismissed)
  const spoofed = await (await request('/api/onboarding/state?username=phase3.returning', freshCookie, 'PATCH', { updates: { photo: true }, username: 'phase3.returning', branch: 'fairview' })).json()
  check('injected identity fields still update only the session student', spoofed.persisted && !spoofed.values.tour)
  const untouched = await db.collection('onboarding_states').findOne({ branch: 'commonwealth', username: 'phase3.returning' })
  check('another student cannot change the returning student photo progress', untouched.values.photo !== true)
  const other = await (await request('/api/onboarding/state', otherCookie)).json()
  check('another branch starts with independent progress', !other.values.tour && !other.values.announcements)
  check('unauthenticated progress access is denied', (await request('/api/onboarding/state')).status === 401)

  browser = await chromium.launch({ channel: 'msedge', headless: true })
  report.browserVersion = browser.version()
  report.pageErrors = []
  async function pageFor(cookie, username) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce', serviceWorkers: 'block' })
    contexts.push(context)
    await context.addCookies([{ name: 'aics_session', value: cookie.slice('aics_session='.length), url: origin }])
    await context.addInitScript(() => localStorage.setItem('aics_cookie_consent', 'essential'))
    await context.route('**/*', route => {
      const url = new URL(route.request().url())
      if (url.origin !== origin) return route.abort()
      const method = route.request().method()
      if (!['GET', 'HEAD'].includes(method) && url.pathname !== '/api/onboarding/state') return route.abort()
      return route.continue()
    })
    const page = await context.newPage()
    page.on('pageerror', error => report.pageErrors.push(error.message))
    await page.goto(`${origin}/portal/commonwealth/student/${username}`, { waitUntil: 'load', timeout: 90000 })
    return page
  }
  const page = await pageFor(returningCookie, 'phase3.returning')
  const updateEntry = page.getByRole('button', { name: 'Help & Support, student tour update available', exact: true })
  await updateEntry.waitFor({ timeout: 45000 })
  await page.screenshot({ path: resolve(output, 'update-dot-desktop.png'), fullPage: true })
  await updateEntry.click()
  await page.getByRole('heading', { name: 'Your student guides have been updated', exact: true }).waitFor()
  await page.getByRole('button', { name: 'Help & Support', exact: true }).waitFor()
  check('opening Help reads the update and clears its notification dot', true)
  check('reading the update leaves the tour closed', await page.locator('[data-tour-overlay]').count() === 0)
  await page.screenshot({ path: resolve(output, 'update-notice-desktop.png'), fullPage: true })
  await page.getByRole('button', { name: 'Dismiss update', exact: true }).click()
  await page.getByRole('heading', { name: 'Your student guides have been updated', exact: true }).waitFor({ state: 'hidden' })
  await page.waitForFunction(async () => (await (await fetch('/api/onboarding/state')).json()).preferences.tourNoticeDismissedVersion === 2)
  await page.reload({ waitUntil: 'load' })
  await page.getByRole('button', { name: 'Replay guided tour', exact: true }).waitFor({ timeout: 45000 })
  check('dismissal survives a real page reload', await page.getByRole('heading', { name: 'Your student guides have been updated', exact: true }).count() === 0)
  await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
  await page.locator('[data-tour-overlay]').waitFor()
  await page.keyboard.press('Escape')
  await page.locator('[data-tour-overlay]').waitFor({ state: 'hidden' })
  const freshPage = await pageFor(freshCookie, 'phase3.fresh')
  await freshPage.getByRole('heading', { name: 'Welcome to AICS, Synthetic.', exact: true }).waitFor({ timeout: 45000 })
  check('fresh student sees welcome without an old-update prompt', await freshPage.getByRole('button', { name: 'Help & Support, student tour update available', exact: true }).count() === 0)
  await freshPage.getByRole('button', { name: "I'll explore on my own", exact: true }).click()
  await freshPage.waitForFunction(async () => (await (await fetch('/api/onboarding/state')).json()).preferences.welcomeSeen)
  await freshPage.reload({ waitUntil: 'load' })
  await freshPage.getByRole('heading', { name: 'Getting started', exact: true }).waitFor({ timeout: 45000 })
  check('real saved exploration suppresses welcome after reload', await freshPage.getByRole('heading', { name: 'Welcome to AICS, Synthetic.', exact: true }).count() === 0)
  for (const context of contexts) await context.close()
  contexts.length = 0
  check('logout succeeds', (await request('/api/auth/logout', returningCookie, 'POST')).ok)
  check('logout revokes the original session', (await request('/api/onboarding/state', returningCookie)).status === 401)
  const newCookie = await login('phase3.returning')
  const resumed = await (await request('/api/onboarding/state', newCookie)).json()
  check('new login restores progress, dismissal and update acknowledgment from MongoDB', resumed.values.tour && resumed.values.profile && resumed.values.announcements && resumed.preferences.tourNoticeReadVersion === 2 && resumed.preferences.tourNoticeDismissedVersion === 2 && resumed.preferences.checklistDismissed)
  check('desktop browser produced no page errors', report.pageErrors.length === 0)
  report.pass = true
} catch (error) {
  report.pass = false
  report.error = String(error.stack || error)
  console.error(error.message)
} finally {
  try { for (const context of contexts) await context.close(); if (browser) await browser.close(); report.cleanup.browserClosed = true } catch (error) { report.pass = false; report.cleanup.browserError = error.message }
  try { report.cleanup.processes = await cleanupOwned('phase3'); if (report.cleanup.processes.errors.length) report.pass = false } catch (error) { report.pass = false; report.cleanup.processError = error.message }
  try { if (databaseCreated) await client.db(database).dropDatabase(); report.cleanup.syntheticDatabaseRemoved = databaseCreated; await client.close() } catch (error) { report.pass = false; report.cleanup.databaseError = error.message }
  report.finishedAt = new Date().toISOString()
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(report, null, 2))
  writeFileSync(resolve(output, 'manifest.txt'), [`started: ${report.startedAt}`, `finished: ${report.finishedAt}`, `baseline HEAD: ${report.sourceHead}`, `command: node scripts/onboarding/phase3-student-acceptance.mjs`, `runtime: ${report.runtime}`, `database: ${database} on 127.0.0.1:27017 only`, 'source: working completion changes; exact application and script hashes in result.json', 'scope: real persistence, session/branch isolation, update notices, fresh welcome, replay; desktop only', `result: ${report.pass ? 'PASS' : 'FAIL'}`].join('\n') + '\n')
  process.exitCode = report.pass ? 0 : 1
}
