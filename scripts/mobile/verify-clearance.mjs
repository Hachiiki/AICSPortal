// Verify final page content can scroll above the student phone navigation.
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { fixtureContext, origin, student } from './fixtures.mjs'
import { settleVisuals } from './visuals.mjs'

const root = resolve(import.meta.dirname, '../..')
const out = resolve(root, '.phase2-local/mobile-next/clearance')
mkdirSync(out, { recursive: true })
const metadata = JSON.parse(readFileSync(resolve(root, '.phase2-local/mobile-ux/quality.json')))
const quality = JSON.parse(readFileSync(resolve(metadata.output, 'result.json')))
if (!quality.finishedAt || quality.commands.some(command => command.exitCode !== 0)) {
  throw new Error('Verified build required')
}
for (const file of quality.records) {
  const hash = createHash('sha256').update(readFileSync(resolve(root, file.path))).digest('hex')
  if (hash !== file.sha256) throw new Error(`Source changed: ${file.path}`)
}

const report = { sourceCommit: quality.head, fixtureOnly: true, checks: [], errors: [], screenshots: [] }
const browser = await chromium.launch({ headless: true })
let context
try {
  const fixture = await fixtureContext(browser, { touch: true, referenceTime: '2026-11-06T01:15:00Z' })
  context = fixture.context
  const page = await context.newPage()
  page.on('pageerror', error => report.errors.push(error.message))
  await page.goto(origin, { waitUntil: 'load', timeout: 180000 })
  await page.getByRole('heading', { name: 'Welcome back, Alexandra!' }).waitFor()
  await settleVisuals(page)

  const routes = [
    '', '/academics?tab=grades', '/academics?tab=subjects', '/academics?tab=tasks',
    '/academics?tab=materials', '/events', '/enrollment', '/professors', '/profile', '/notifications',
    '/settings', '/settings?section=security', '/settings?section=notifications',
    '/settings?section=privacy', '/settings?section=appearance', '/help',
  ]
  for (const width of [320, 390, 430]) {
    await page.setViewportSize({ width, height: 720 })
    for (const route of routes) {
      await page.evaluate(url => {
        history.pushState({}, '', url)
        dispatchEvent(new Event('pushstate'))
        scrollTo(0, 0)
      }, `/portal/commonwealth/student/${student.username}${route}`)
      await page.waitForTimeout(650)
      await page.evaluate(() => scrollTo(0, document.documentElement.scrollHeight))
      await page.waitForTimeout(100)

      const bounds = await page.evaluate(() => ({
        contentBottom: document.querySelector('main').getBoundingClientRect().bottom,
        navigationTop: document.querySelector('[data-student-mobile-nav]').getBoundingClientRect().top,
      }))
      const pass = bounds.contentBottom <= bounds.navigationTop + 1
      report.checks.push({ name: `${route || 'dashboard'}-${width}: final content clears navigation`, pass, detail: bounds })

      if (width === 320 && ['/academics?tab=tasks', '/profile', '/help'].includes(route)) {
        const name = route.includes('tasks') ? 'tasks' : route.slice(1)
        const file = `${name}-bottom-320.png`
        await page.screenshot({ path: resolve(out, file) })
        report.screenshots.push(file)
      }
    }
  }
} catch (error) {
  report.failure = error.message
  report.checks.push({ name: 'Clearance verification completed', pass: false, detail: error.message })
} finally {
  report.finishedAt = new Date().toISOString()
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(report, null, 2))
  if (context) await context.close()
  await browser.close()
}
const passed = report.checks.filter(check => check.pass).length
const failed = report.checks.length - passed
console.log(JSON.stringify({ passed, failed, errors: report.errors }))
process.exitCode = failed || report.errors.length ? 1 : 0
