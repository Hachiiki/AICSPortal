// H2 through intercepted transport only. Never stop MongoDB or write records.
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { EVID, gateContext, launchBrowser, openPortal, startTour, step, failures, writeManifest, writeReport, invocationLine } from './lib.mjs'
if (!globalThis.__phase2Gate) throw new Error('Use the owned isolated interaction adapter')
const out = resolve(EVID, 'persistence')
const run = async () => {
  mkdirSync(out, { recursive: true })
  const browser = await launchBrowser()
  {
    const ctx = await gateContext(browser)
    await ctx.route('**/api/onboarding/state', route => route.abort())
    const page = await openPortal(ctx, '', { launcherRequired: false })
    await page.locator('[data-tour="nav-dashboard"]').waitFor()
    await page.waitForTimeout(600)
    step('H2 read transport failure hides the synthetic launcher', await page.locator('[data-tour="dev-tour-launcher"]').count() === 0)
    step('H2 read transport failure hides the student welcome', await page.getByRole('heading', { name: 'Welcome to AICS, Juan.' }).count() === 0)
    await page.locator('[data-tour="nav-academics"]:visible').click()
    await page.waitForURL('**/academics')
    step('H2 read failure leaves real portal navigation usable', page.url().endsWith('/academics'))
    await page.screenshot({ path: resolve(out, 'read-failure.png') })
    await ctx.close()
  }
  {
    const ctx = await gateContext(browser)
    let writes = 0
    await ctx.route('**/api/onboarding/state', async route => {
      if (route.request().method() !== 'PATCH') return route.fallback()
      writes++
      return route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false,"error":"Simulated write failure"}' })
    })
    const page = await openPortal(ctx)
    await startTour(page)
    for (let i = 1; i <= 8; i++) {
      await page.waitForFunction(id => document.querySelector('[data-tour-overlay]')?.dataset.stepId === id, `dev-${i}`)
      if (i === 7) continue
      if (i === 8) {
        const rejected = page.waitForResponse(r => new URL(r.url()).pathname === '/api/onboarding/state' && r.request().method() === 'PATCH' && r.status() === 500)
        await Promise.all([rejected, page.getByRole('button', { name: 'Finish the guided tour', exact: true }).click()])
      } else await page.getByRole('button', { name: 'Go to the next tour step', exact: true }).click()
    }
    await page.locator('[data-tour-overlay]').waitFor({ state: 'detached' })
    await page.waitForFunction(() => [...document.querySelectorAll('[role="status"]')].some(e => e.textContent === 'Guided tour completed.'))
    step('H2 synthetic completion stays charitable under a forced PATCH 500', writes === 1)
    await page.locator('[data-tour="nav-dashboard"]:visible').click()
    await page.waitForURL('**/juan.santos')
    step('H2 failed completion does not restrict portal navigation', page.url().endsWith('/juan.santos'))
    await ctx.close()
  }
  {
    const ctx = await gateContext(browser)
    let writes = 0
    await ctx.route('**/api/onboarding/state', route => {
      if (route.request().method() === 'PATCH') { writes++; return route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}' }) }
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, role: 'student', version: 1, persisted: true, values: { password: true, profile: true, photo: true, tour: false, announcements: true }, preferences: { welcomeSeen: true, checklistDismissed: false, tourSkipped: false, tasksGuideSeen: true, tasksGuideCompleted: true } }) })
    })
    const page = await openPortal(ctx, 'help', { launcherRequired: false })
    await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
    for (const id of ['student-overview', 'student-announcements', 'student-academics', 'student-tasks', 'student-events', 'student-account', 'student-help']) {
      await page.waitForFunction(id => { const e = document.querySelector('[data-tour-overlay]'); return e?.dataset.stepId === id && e.dataset.disposition === 'spot' }, id)
      if (id === 'student-help') {
        const rejected = page.waitForResponse(r => new URL(r.url()).pathname === '/api/onboarding/state' && r.request().method() === 'PATCH' && r.status() === 500)
        await Promise.all([rejected, page.getByRole('button', { name: 'Finish the guided tour', exact: true }).click()])
      } else await page.getByRole('button', { name: 'Go to the next tour step', exact: true }).click()
    }
    await page.locator('[data-tour-overlay]').waitFor({ state: 'detached' })
    step('H2 real student tour finishes locally despite rejected progress writes', writes >= 1)
    step('H2 replay remains available after the student save failure', await page.getByRole('button', { name: 'Replay guided tour', exact: true }).isVisible())
    await page.locator('[data-tour="nav-events"]:visible').click(); await page.waitForURL('**/events')
    step('H2 student save failure leaves actual portal access intact', page.url().endsWith('/events'))
    await page.screenshot({ path: resolve(out, 'student-write-failure.png') })
    await ctx.close()
  }
  await browser.close()
  writeManifest(out, [`command: ${invocationLine('09-persistence-safe.mjs')}`, 'scope: read abort and write 500 intercepted in browser, including actual student replay; no MongoDB outage, records or credentials changed', `exit: ${failures ? 1 : 0}`])
  writeReport(out, 'persistence-failure-report', 'H2 safe read/write transport simulations through the real tour clients. Route-level mocked collection tests cover the API persisted:false response. No shared service was stopped and no positive-control database write was authorized.', [])
  process.exitCode = failures ? 1 : 0
}
run().catch(error => { console.error(error.message); process.exit(1) })
