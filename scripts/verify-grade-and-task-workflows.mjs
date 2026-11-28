import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { randomBytes, randomUUID } from 'node:crypto'
import { once } from 'node:events'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { MongoClient } from 'mongodb'
import { chromium } from 'playwright'
import { hashPassword } from '../src/lib/password.ts'

const mongoUri = process.env.WORKFLOW_TEST_MONGODB || 'mongodb://127.0.0.1:27017'
const mongoTarget = new URL(mongoUri)
assert.equal(mongoTarget.protocol, 'mongodb:')
assert.equal(mongoTarget.hostname, '127.0.0.1', 'Use a disposable loopback MongoDB server.')
assert.ok(!mongoTarget.username && !mongoTarget.password && !mongoTarget.search && !mongoTarget.hash)
const database = 'aics_workflow_test_' + randomBytes(8).toString('hex')
const port = Number(process.env.WORKFLOW_TEST_PORT || 4372)
const origin = `http://127.0.0.1:${port}`
const branch = 'commonwealth'
const term = { academicYear: '2026-2027', semester: '1st Sem', yearLevel: '2nd Year' }
const oldTerm = { ...term, academicYear: '2025-2026', semester: '2nd Sem' }
const professorUsername = 'fixture.faculty'
const studentUsername = 'fixture.alice'
const password = randomUUID()
const mongo = new MongoClient(mongoUri, { serverSelectionTimeoutMS: 5000 })
const db = mongo.db(database)
const subjects = db.collection('subjects')
const audits = db.collection('grade_audits')
let server
let browser

function subject(studentUsername, code, extra) {
  return {
    ...term, branch, studentUsername, code, title: code, professorUsername, professor: 'Test Faculty',
    professorEmail: 'faculty@example.invalid', schedule: 'Mon 9:00 AM', room: 'Lab 1', units: 3,
    prelim: '90', midterm: '88', finals: '87', finalGrade: '88.20', remarks: 'Very Good',
    prelimStatus: 'draft', midtermStatus: '', finalsStatus: '', gradeStatus: 'draft', ...extra,
  }
}

async function seed() {
  const accounts = [
    [professorUsername, 'Test Faculty', 'faculty'],
    ['fixture.registrar', 'Test Registrar', 'admin'],
    [studentUsername, 'Alice Example', 'student'],
    ['fixture.bob', 'Bob Example', 'student'],
    ['fixture.carol', 'Carol Example', 'student'],
    ['fixture.dana', 'Dana Example', 'student'],
  ]
  const hashed = await hashPassword(password)
  await db.collection('students').insertMany(accounts.map(([username, fullName, role], i) => ({
    username, fullName, firstName: fullName.split(' ')[0], lastName: fullName.split(' ')[1],
    middleName: '', branch, branchAddress: 'QA Campus', role, password: hashed, tokenVersion: 0,
    studentNumber: `QA-${i}`, enrollmentStatus: 'Enrolled', section: 'QA1', program: 'BSCS', programShort: 'BSCS',
    documents: [], gpa: '', ...term,
  })))
  await db.collection('onboarding_states').insertOne({
    branch, username: studentUsername, role: 'student', version: 1,
    preferences: { welcomeSeen: true, checklistDismissed: true, tourNoticeReadVersion: 2, tourNoticeDismissedVersion: 2 },
    updatedAt: new Date(),
  })
  await subjects.insertMany([
    subject(studentUsername, 'QA101'),
    subject('fixture.bob', 'QA101'),
    subject('fixture.carol', 'QA102', { prelimStatus: 'released', midtermStatus: 'draft', finals: '', finalGrade: '' }),
    subject('fixture.dana', 'QA103'),
    subject('fixture.dana', 'QA103', oldTerm),
  ])
  await audits.insertMany([term, oldTerm].map((scope, index) => ({
    ...scope, branch, studentUsername: 'fixture.dana', subjectCode: 'QA103', performedBy: professorUsername,
    performedAt: new Date(`${index ? '2026-03' : '2026-10'}-01T12:00:00Z`), period: 'prelim',
    action: 'save', oldValue: '82', newValue: '90', note: index ? 'Earlier-term entry' : 'Current-term entry',
  })))
  await db.collection('tasks').insertMany([
    [studentUsername, 'Assignment Alpha', 'Activity'],
    ['fixture.bob', 'Assignment Beta', 'Activity'],
    [studentUsername, 'Search Target Quiz', 'Quiz'],
  ].map(([studentUsername, title, type]) => ({
    branch, studentUsername, subjectCode: 'QA101', term, title, type, assignmentId: randomUUID(),
    dueDate: new Date(Date.now() + 7 * 86_400_000), postedDate: new Date(),
    submitted: true, submittedAt: new Date(), score: null, maxScore: 10, feedback: null,
  })))
}

async function signIn(username, role, viewport) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' })
  await context.route(url => url.origin !== origin, route => route.abort())
  await context.addInitScript(() => localStorage.setItem('aics_cookie_consent', 'essential'))
  const response = await context.request.post(origin + '/api/auth/login', { data: { username, password } })
  assert.equal(response.status(), 200, `Sign-in failed for the ${role} fixture`)
  assert.equal((await response.json()).role, role)
  return { context, page: await context.newPage(), home: `${origin}/portal/${branch}/${role}/${username}` }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 45; attempt++) {
    assert.equal(server.exitCode, null, 'Next.js stopped before the test started.')
    try {
      const response = await fetch(origin + '/api/auth/session', { signal: AbortSignal.timeout(4000) })
      if (response.status === 401) return
    } catch {}
    await delay(500)
  }
  throw new Error('The local Next.js server did not become ready.')
}

const snapshot = code => subjects.find({ branch, code, academicYear: term.academicYear }).sort({ studentUsername: 1 }).toArray()

try {
  await mongo.connect()
  await seed()
  server = spawn(process.execPath, [resolve('node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', '127.0.0.1', '-p', String(port)], {
    env: { ...process.env, APP_ENV: 'development', NEXT_TELEMETRY_DISABLED: '1', MONGODB_URI: mongoUri, MONGODB_DB: database, AUTH_SECRET: randomBytes(32).toString('hex') },
    stdio: 'inherit',
  })
  await waitForServer()
  browser = await chromium.launch({ executablePath: process.env.WORKFLOW_TEST_CHROMIUM || undefined })
  const faculty = await signIn(professorUsername, 'faculty', { width: 390, height: 844 })
  const registrar = await signIn('fixture.registrar', 'admin')
  const student = await signIn(studentUsername, 'student', { width: 1280, height: 900 })
  const { page } = faculty
  const gradePage = faculty.home + '/grade-encoding'
  await page.goto(gradePage)
  const search = page.getByRole('textbox', { name: 'Search student' })
  const submitDialog = page.getByRole('dialog', { name: 'Submit grades?' })
  async function openSubmit(period, studentName) {
    await search.fill(studentName)
    await page.getByRole('group', { name: 'Grade period' }).getByRole('button', { name: period, exact: true }).click()
    await page.getByRole('button', { name: `Submit ${period} only` }).click()
    await submitDialog.getByText('Grade records to submit: 1', { exact: true }).waitFor()
  }
  async function confirmSubmit(status) {
    const response = page.waitForResponse(res => res.url().endsWith('/api/grades/submit'))
    await submitDialog.getByRole('button', { name: 'Submit 1', exact: true }).click()
    const result = await response
    assert.equal(result.status(), status)
    return result.json()
  }

  await openSubmit('Prelim', 'Alice Example')
  assert.equal((await confirmSubmit(200)).modifiedCount, 1)
  assert.deepEqual((await snapshot('QA101')).map(row => row.prelimStatus), ['submitted', 'draft'])
  const hidden = await student.context.request.get(origin + '/api/student')
  assert.equal((await hidden.json()).student.subjects[0].prelim, '-')
  const released = await registrar.context.request.post(origin + '/api/grades/release', {
    data: { branch, subjectCode: 'QA101', ...term, period: 'prelim' },
  })
  assert.equal(released.status(), 200)
  const visible = await student.context.request.get(origin + '/api/student')
  assert.equal((await visible.json()).student.subjects[0].prelim, '90')
  assert.deepEqual((await snapshot('QA101')).map(row => row.prelimStatus), ['released', 'draft'])
  console.log('PASS #106 confirmed grade scope and faculty-to-registrar-to-student release')

  await openSubmit('Midterm', 'Carol Example')
  assert.equal((await confirmSubmit(200)).modifiedCount, 1)
  assert.equal((await snapshot('QA102'))[0].midtermStatus, 'submitted')
  console.log('PASS #107 Midterm submits independently of a released Prelim')

  await openSubmit('Finals', 'Carol Example')
  await submitDialog.getByRole('button', { name: 'Which period?' }).click()
  await submitDialog.getByRole('option', { name: 'All periods (Final Grade)' }).click()
  await submitDialog.getByText('Blank grades to submit as INC: 1', { exact: true }).waitFor()
  const before = await snapshot('QA102')
  await page.route('**/api/grades/submit', async route => {
    const data = { ...route.request().postDataJSON(), period: 'invalid-test-period' }
    await route.fulfill({ response: await route.fetch({ postData: data }) })
  }, { times: 1 })
  assert.equal((await confirmSubmit(400)).ok, false)
  assert.deepEqual(await snapshot('QA102'), before)
  assert.equal((await confirmSubmit(200)).modifiedCount, 1)
  const [finished] = await snapshot('QA102')
  assert.deepEqual([finished.prelimStatus, finished.midtermStatus, finished.finalsStatus, finished.finals, finished.finalGrade], ['released', 'submitted', 'submitted', 'INC', '53.40'])
  assert.equal(await audits.countDocuments({ branch, subjectCode: 'QA102', period: 'finals', action: 'submit', newValue: 'INC' }), 1)
  console.log('PASS #108 rejected request leaves the database intact and All periods respects existing statuses')

  await page.goto(gradePage)
  await search.fill('Dana Example')
  await page.getByRole('button', { name: 'Grade history for Dana Example in QA103', exact: true }).first().click()
  const history = page.getByRole('dialog', { name: 'Grade history' })
  await history.getByText(/2026-2027 1st Sem/).waitFor()
  await history.getByText('Note: Current-term entry', { exact: true }).waitFor()
  assert.equal(await history.getByText('Note: Earlier-term entry', { exact: true }).count(), 0)
  console.log('PASS #112 Grade History shows only the selected term')

  await page.goto(faculty.home + '/tasks')
  const drawer = page.getByRole('dialog')
  const submissions = title => page.getByText(title, { exact: true }).locator('../..').getByRole('button', { name: 'Submissions', exact: true })
  let sendAlpha
  let alphaRequested
  let alphaFinished
  const holdAlpha = new Promise(resolve => { sendAlpha = resolve })
  const alphaStarted = new Promise(resolve => { alphaRequested = resolve })
  const alphaDone = new Promise(resolve => { alphaFinished = resolve })
  await page.route('**/api/faculty/tasks/submissions?**', async route => {
    if (new URL(route.request().url()).searchParams.get('title') !== 'Assignment Alpha') {
      return route.continue()
    }
    alphaRequested()
    try {
      const response = await route.fetch()
      await holdAlpha
      await route.fulfill({ response })
    } catch {
      // Switching drawers can cancel the intercepted request.
    } finally {
      alphaFinished()
    }
  })
  await submissions('Assignment Alpha').click()
  await alphaStarted
  await drawer.getByRole('button', { name: 'Close', exact: true }).click()
  await submissions('Assignment Beta').click()
  await drawer.getByText('Bob Example', { exact: true }).waitFor()
  sendAlpha()
  await alphaDone
  await drawer.getByRole('heading', { name: /Assignment Beta/ }).waitFor()
  assert.equal(await drawer.getByText('Alice Example', { exact: true }).count(), 0)
  console.log('PASS #109 old submissions response cannot replace the active drawer')
  await drawer.getByRole('button', { name: 'Close', exact: true }).click()
  await page.route('**/api/faculty/tasks/submissions?**', route => route.fulfill({ status: 500, json: { ok: false } }), { times: 1 })
  await submissions('Assignment Beta').click()
  await drawer.getByRole('alert').getByText('Could not load submissions. Try again.').waitFor()
  assert.equal(await drawer.getByRole('status', { name: 'Loading submissions' }).count(), 0)
  await drawer.getByRole('button', { name: 'Retry' }).click()
  await drawer.getByText('Bob Example', { exact: true }).waitFor()
  console.log('PASS #110 failed submissions request displays an error and Retry recovers')

  await student.page.goto(student.home + '/academics?tab=tasks')
  await student.page.getByRole('group', { name: 'Filter by task type' }).getByRole('button', { name: 'Activity' }).click()
  await student.page.getByRole('combobox', { name: 'Search the portal' }).fill('Search Target Quiz')
  await student.page.getByRole('option').filter({ hasText: 'Search Target Quiz' }).click()
  const target = student.page.locator('[data-task-id]:visible').filter({ hasText: 'Search Target Quiz' })
  await target.waitFor()
  await student.page.waitForFunction(() => document.activeElement?.textContent?.includes('Search Target Quiz') && document.activeElement?.matches('[data-task-id]'))
  console.log('PASS #111 global search reveals and focuses the filtered task')
} finally {
  await browser?.close()
  if (server && server.exitCode === null && server.signalCode === null) {
    const stopped = once(server, 'exit')
    server.kill()
    await stopped
  }
  try {
    await db.dropDatabase()
  } finally {
    await mongo.close()
  }
}
