import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'
import { announcements, fixtureContext, origin, student, subjects, term } from './fixtures.mjs'
import { settleVisuals } from './visuals.mjs'

const label = process.argv[2]
if (!['before', 'after'].includes(label)) throw new Error('Use before or after')
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Use an isolated local build')

const root = process.env.ADMIN_MOBILE_OUTPUT || '.phase2-local/mobile-ux'
const output = resolve(root, `admin-${label}`)
mkdirSync(output, { recursive: true })

const base = `/portal/${student.branch}/admin/${student.username}`
const screens = [
  ['home', '', 'Admin Dashboard', 'Welcome back, Alexandra!'],
  ['people', '/people', 'Students & Faculty'],
  ['release', '/release-queue', 'Release Queue'],
  ['announcements', '/announcements', 'Announcements'],
  ['events', '/events', 'Events'],
  ['professors', '/professors', 'Professors'],
  ['enrollment', '/enrollment', 'Enrollment'],
]
const date = '2026-11-07'
const branch = { branch: student.branch, branchName: 'Commonwealth' }
const people = [
  { ...student, ...branch },
  { ...student, ...branch, username: 'demo.maria', fullName: 'Maria Teresa Reyes', role: 'faculty', email: 'maria.teresa.reyes@example.invalid' },
  { ...student, ...branch, username: 'demo.rafael', fullName: 'Rafael Mendoza', role: 'faculty', email: 'rafael.mendoza@example.invalid' },
]
const release = { ...term, subjectCode: subjects[0].code, title: subjects[0].title, period: 'midterm', count: 24 }
const steps = ['Application', 'Documents', 'Assessment', 'Payment', 'Enrollment'].map((name, index) => ({
  step: index + 1, label: name, description: `${name} for the current semester`,
  status: index < 2 ? 'completed' : index === 2 ? 'current' : 'upcoming', date: index < 2 ? date : null,
}))
const record = {
  ...term, ...branch, _id: 'mobile-enrollment', studentUsername: student.username, student, currentStep: 3, steps,
  assessment: { totalAssessment: 12840, amountPaid: 6000, balance: 6840, paymentStatus: 'partial', paymentDeadline: date, paymentDate: date },
  payments: [{ amount: 6000, date, postedBy: 'Sample registrar', note: 'Initial payment' }],
}
const event = { _id: 'mobile-event', title: 'Midterm examinations', date, category: 'academic', description: 'Refer to your subject schedule for your examination room.' }
const bulletin = { ...announcements[0], priority: 'urgent', expiryDate: '2026-11-09' }
const stats = {
  totals: { students: 1248, faculty: 64, branches: 2, programs: 5, courses: 26, pendingReleaseGroups: 3, pendingReleaseRows: 72, announcements: 5, events: 12, upcomingEvents: 1 },
  enrollment: {
    byStatus: [{ label: 'Enrolled', count: 1200 }, { label: 'Pending', count: 48 }],
    byYearLevel: [{ label: '2nd Year', count: 338 }],
    byProgram: [{ label: 'Computer Science', count: 420 }],
  },
  gpa: { buckets: [{ label: '1.50–1.75', count: 12 }, { label: '2.00–2.25', count: 38 }], deanListers: 12, withGpa: 50, average: '2.12', withoutReleasedGrades: 1198 },
  finances: { totalAssessment: 15000000, totalPaid: 6500000, totalBalance: 8500000, paid: 512, partial: 380, unpaid: 356 },
  branches: [{ ...branch, students: 972, faculty: 50, programs: 5, courses: 26, events: 9, announcements: 5, pendingReleases: 3, deanListers: 12, balance: 6780000 }],
  upcomingEvents: [event], recentAnnouncements: [bulletin], pendingReleases: [release],
}

async function adminContext(browser, width, theme = 'light', hasLocalReleases = true) {
  const { context } = await fixtureContext(browser, {
    width, height: 844, role: 'admin', touch: width < 640, referenceTime: '2026-11-06T01:15:00Z',
  })
  await context.addInitScript(value => localStorage.setItem('aics_theme', value), theme)
  const writes = []
  let groups = hasLocalReleases ? [release] : []
  let posts = [bulletin, { ...bulletin, _id: '000000000000000000000002', title: 'Library hours update', priority: 'normal', expiryDate: null }]
  let events = [event]
  let enrollment = structuredClone(record)
  const fixtures = {
    '/api/admin/stats': () => ({
      stats: hasLocalReleases ? stats : { ...stats, branches: stats.branches.map(row => ({ ...row, pendingReleases: 0 })) },
    }),
    '/api/admin/people': () => ({ people, branches: [branch], counts: { total: 3, students: 1, faculty: 2, admins: 0 } }),
    '/api/grades/release': () => ({ groups }),
    '/api/admin/enrollment': () => ({ records: [enrollment], withoutRecords: 3 }),
    '/api/announcements': () => ({ announcements: posts, readIds: [] }),
    '/api/events': () => ({ events }),
  }
  await context.route('**/api/**', async route => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin !== origin) return route.fallback()
    const path = url.pathname
    if (request.method() === 'GET') {
      if (!fixtures[path]) return route.fallback()
      return route.fulfill({ json: { ok: true, ...fixtures[path]() } })
    }
    const data = request.postDataJSON()
    if (path === '/api/grades/release') groups = []
    else if (path === '/api/announcements/bulk-delete') posts = posts.filter(post => !data.ids.includes(post._id))
    else if (path === '/api/events' && request.method() === 'PATCH') events = events.map(item => item._id === data.id ? { ...item, ...data } : item)
    else if (path === '/api/admin/enrollment' && request.method() === 'PATCH') enrollment.currentStep = data.currentStep
    else if (path === '/api/admin/enrollment' && request.method() === 'POST') {
      enrollment.assessment.amountPaid += data.amount
      enrollment.assessment.balance -= data.amount
    } else return route.fallback()
    writes.push({ path, method: request.method(), data })
    return route.fulfill({ json: { ok: true, deletedCount: data?.ids?.length } })
  })
  return { context, writes }
}

async function go(page, path) {
  await page.goto(origin + base + path)
  await page.getByRole('navigation', { name: 'Admin mobile navigation' }).or(page.getByRole('navigation', { name: 'Admin navigation' })).filter({ visible: true }).first().waitFor()
}

async function checkWidth(page) {
  const geometry = await page.evaluate(() => ({
    document: document.documentElement.scrollWidth,
    viewport: innerWidth,
    tables: Array.from(document.querySelectorAll('.admin-table-scroll')).map(table => [table.scrollWidth, table.clientWidth]),
    outside: Array.from(document.querySelectorAll('main *')).filter(element => element.getBoundingClientRect().right > innerWidth)
      .slice(0, 12).map(element => [element.tagName, element.className, element.getBoundingClientRect().right]),
  }))
  assert(
    geometry.document === geometry.viewport && geometry.tables.every(([scroll, width]) => scroll <= width),
    `Horizontal overflow on ${page.url()}: ${JSON.stringify(geometry)}`,
  )
}

async function verifyActions(page, writes) {
  const dock = page.getByRole('navigation', { name: 'Admin mobile navigation' })
  await go(page, '')
  await page.getByRole('button', { name: /Review submitted grades/ }).click()
  const queue = page.getByRole('table', { name: 'Pending grade releases' })
  await queue.getByRole('button', { name: 'Release', exact: true }).click()
  assert.equal(writes.length, 0)
  await queue.getByRole('button', { name: 'Confirm release (24)' }).click()
  await page.getByText('Nothing waiting', { exact: true }).waitFor()
  assert.equal(writes.at(-1).data.subjectCode, release.subjectCode)

  await dock.getByRole('button', { name: 'People' }).click()
  await page.getByRole('button', { name: 'Sort directory' }).click()
  await checkWidth(page)
  await page.getByRole('option', { name: 'Name Z–A', exact: true }).click()
  const results = page.getByRole('table', { name: 'Directory results' })
  assert.match(await results.ariaSnapshot(), /columnheader "Username"/)
  assert.match(await results.ariaSnapshot(), /columnheader "Name"/)
  assert.match(await results.getByRole('row').nth(1).innerText(), /Rafael Mendoza/)
  await page.getByRole('searchbox', { name: 'Search directory' }).fill('teresa')
  assert.equal(await results.getByRole('row').count(), 2)
  page.once('dialog', dialog => dialog.accept())
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Export CSV' }).click()
  assert.match((await download).suggestedFilename(), /^people-directory-.*\.csv$/)

  await go(page, '/announcements')
  await page.getByRole('checkbox', { name: 'Select all listed announcements' }).check()
  const bulk = page.getByRole('toolbar', { name: 'Bulk actions' })
  await bulk.getByRole('button', { name: 'Delete selected' }).click()
  assert.equal(writes.length, 1)
  await bulk.getByRole('button', { name: 'Confirm delete' }).click()
  await page.getByText('No announcements match', { exact: true }).waitFor()
  assert.equal(writes.at(-1).data.ids.length, 2)

  await go(page, '/events')
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  const editor = page.getByRole('dialog', { name: 'Edit event' })
  const title = editor.locator('#event-title')
  await title.fill('')
  await title.pressSequentially('Updated examination date')
  assert.equal(await title.inputValue(), 'Updated examination date')
  await editor.getByRole('button', { name: 'Save changes' }).click()
  await page.getByText('Updated examination date', { exact: true }).waitFor()

  await go(page, '/enrollment')
  await page.getByRole('button', { name: 'Override', exact: true }).click()
  const override = page.getByRole('dialog', { name: 'Override step tracker' })
  await override.getByRole('button', { name: /upcoming.*Payment for the current semester/ }).click()
  await override.getByRole('button', { name: 'Set step 4' }).click()
  await page.getByText('Step 4 of 5', { exact: false }).waitFor()
  assert.equal(writes.at(-1).data.currentStep, 4)

  await page.getByRole('button', { name: 'Payment', exact: true }).click()
  const payment = page.getByRole('dialog', { name: 'Post payment' })
  await payment.locator('#pay-amount').fill('500')
  await payment.getByRole('button', { name: /confirm|record|post/i }).click()
  await page.getByText('₱6,340.00', { exact: false }).first().waitFor()
  assert.equal(writes.at(-1).data.amount, 500)

  await go(page, '')
  await dock.getByRole('button', { name: 'More' }).click()
  const more = page.getByRole('menu', { name: 'More pages' })
  const announcementsLabel = more.getByText('Announcements', { exact: true })
  assert.equal(await announcementsLabel.evaluate(label => {
    const range = document.createRange()
    range.selectNodeContents(label)
    return range.getClientRects().length
  }), 1, 'The Announcements label fits on one line')
  await page.screenshot({ path: resolve(output, 'more-320-light.png'), animations: 'disabled' })
  await more.getByRole('menuitem', { name: 'Settings' }).click()
  await page.getByRole('tab', { name: 'Appearance' }).click()
  const navLabels = page.getByRole('switch', { name: 'Show navigation labels' })
  await navLabels.click()
  await page.locator('[data-dock-labels="hidden"]').waitFor()
  await page.reload()
  await page.locator('[data-dock-labels="hidden"]').waitFor()
  assert.equal(await page.evaluate(() => localStorage.getItem('aics.faculty.navigation-labels')), null)
}

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH })
try {
  for (const [width, theme] of [[390, 'light'], [320, 'light'], [390, 'dark'], [1440, 'light']]) {
    const { context, writes } = await adminContext(browser, width, theme)
    try {
      const page = await context.newPage()
      const errors = []
      page.on('pageerror', error => errors.push(error.message))
      for (const [name, path, heading, mobileHeading] of screens) {
        await go(page, path)
        const expectedHeading = label === 'after' && width < 640 ? mobileHeading ?? heading : heading
        await page.getByRole('heading', { name: expectedHeading, exact: true }).waitFor()
        await page.getByText(/^Loading (directory|events|professors|announcements|enrollment records|pending releases)|Crunching school numbers/).waitFor({ state: 'hidden' })
        if (name === 'home') await page.getByText('GPA distribution', { exact: true }).waitFor()
        else await page.locator('main table').waitFor()
        await settleVisuals(page)
        await page.screenshot({ path: resolve(output, `${name}-${width}-${theme}.png`), animations: 'disabled' })
        if (label === 'after' && width < 640) await checkWidth(page)
      }
      if (label === 'after' && width === 320 && theme === 'light') {
        await go(page, '/announcements')
        await page.getByRole('button', { name: 'Post announcement' }).click()
        const form = page.getByRole('dialog', { name: 'Post announcement' })
        await form.locator('#ann-expiry').scrollIntoViewIfNeeded()
        const footer = await form.getByRole('button', { name: 'Post', exact: true }).boundingBox()
        assert(footer && footer.y >= 0 && footer.y + footer.height <= 844, 'Post action stays within viewport')
        await page.screenshot({ path: resolve(output, 'announcement-form-320-light.png'), animations: 'disabled' })
        await page.keyboard.press('Escape')
        await form.waitFor({ state: 'hidden' })
        await page.setViewportSize({ width: 320, height: 420 })
        await page.getByRole('button', { name: 'Post announcement' }).click()
        await form.locator('#ann-expiry').scrollIntoViewIfNeeded()
        const shortFooter = await form.getByRole('button', { name: 'Post', exact: true }).boundingBox()
        assert(shortFooter && shortFooter.y >= 0 && shortFooter.y + shortFooter.height <= 420)
        await page.screenshot({ path: resolve(output, 'announcement-form-320-short.png'), animations: 'disabled' })
        await page.keyboard.press('Escape')
        await page.setViewportSize({ width: 320, height: 844 })
        await verifyActions(page, writes)
      }
      assert.deepEqual(errors, [])
    } finally {
      await context.close()
    }
  }
  if (label === 'after') {
    const otherBranch = await adminContext(browser, 390, 'light', false)
    try {
      const page = await otherBranch.context.newPage()
      await go(page, '')
      await page.getByRole('heading', { name: 'School overview' }).waitFor()
      assert.equal(await page.getByRole('button', { name: /Review submitted grades/ }).count(), 0)
      await page.getByRole('navigation', { name: 'Admin mobile navigation' }).getByRole('button', { name: 'Release' }).click()
      await page.getByText('Nothing waiting', { exact: true }).waitFor()
    } finally {
      await otherBranch.context.close()
    }
    for (const [role, destination] of [['student', 'Tasks'], ['faculty', 'Grades']]) {
      const { context } = await fixtureContext(browser, { role, width: 390, touch: true })
      try {
        const page = await context.newPage()
        await page.goto(`${origin}/portal/${student.branch}/${role}/${student.username}`)
        await page.getByRole('heading', { name: 'Welcome back, Alexandra!' }).waitFor()
        const dock = page.getByRole('navigation', { name: new RegExp(`^${role} mobile navigation$`, 'i') })
        await dock.getByRole('button', { name: destination, exact: true }).waitFor()
        assert.equal(await dock.getAttribute('data-dock-labels'), role === 'faculty' ? 'visible' : 'auto')
      } finally {
        await context.close()
      }
    }
  }
} finally {
  await browser.close()
}
console.log(output)
