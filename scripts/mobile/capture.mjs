import { chromium } from 'playwright'
import { mkdirSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fixtureContext, origin } from './fixtures.mjs'

const label = process.argv[2] || 'baseline'
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid capture label')
const root = resolve(import.meta.dirname, '../..')
const out = resolve(root, '.phase2-local/mobile-ux', label)
mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ headless: true })
const { context } = await fixtureContext(browser)
const page = await context.newPage()
const report = { label, assertions: [], errors: [], measurements: [] }
page.on('pageerror', error => report.errors.push(error.message))
const measure = async name => {
  const measurement = await page.evaluate(() => ({ viewport: innerWidth, pageWidth: document.documentElement.scrollWidth, height: innerHeight }))
  report.measurements.push({ name, ...measurement })
}
try {
  await page.goto(origin, { waitUntil: 'load', timeout: 600000 })
  await page.getByRole('heading', { name: 'Welcome back, Alexandra!' }).waitFor({ timeout: 120000 })
  await page.screenshot({ path: resolve(out, 'dashboard-390.png') })
  await page.screenshot({ path: resolve(out, 'dashboard-full-390.png'), fullPage: true })
  report.dashboard = await page.locator('body').innerText()
  await measure('dashboard-390')
  await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
  await page.getByRole('dialog', { name: 'Navigation menu' }).getByRole('button', { name: 'Academics', exact: true }).click()
  await page.getByRole('button', { name: 'Tasks', exact: true }).click()
  await page.getByRole('heading', { name: 'Task Overview', exact: true }).waitFor()
  for (const width of [320, 360, 390, 430]) {
    await page.setViewportSize({ width, height: 844 })
    await page.screenshot({ path: resolve(out, `tasks-${width}.png`) })
    await measure(`tasks-${width}`)
  }
  await page.getByRole('button', { name: 'Expand all', exact: true }).click()
  await page.screenshot({ path: resolve(out, 'tasks-full-430.png'), fullPage: true })
  report.tasks = await page.locator('body').innerText()
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(report, null, 2))
  console.log(JSON.stringify({ out, errors: report.errors, measurements: report.measurements }, null, 2))
} finally { await context.close(); await browser.close() }
