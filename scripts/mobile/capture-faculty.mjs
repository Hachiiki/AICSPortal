import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fixtureContext, origin, student } from './fixtures.mjs'
import { settleVisuals } from './visuals.mjs'

const label = process.argv[2]
if (!label || !/^[a-z0-9-]+$/.test(label)) throw new Error('Provide a capture label such as before or after')
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Use an isolated local build with synthetic data')

const output = resolve(import.meta.dirname, '../../.phase2-local/mobile-ux', `faculty-${label}`)
mkdirSync(output, { recursive: true })

const browser = await chromium.launch({ headless: true })
const base = `/portal/${student.branch}/faculty/${student.username}`
const routes = [
  { name: 'home', path: '', heading: 'Welcome back, Alexandra!' },
  { name: 'students', path: '/my-students', heading: 'My Classes' },
  { name: 'grades', path: '/grade-encoding', heading: 'Grade Encoding' },
  { name: 'tasks', path: '/tasks', heading: 'Tasks' },
  { name: 'schedule', path: '/schedule', heading: 'Schedule' },
]
try {
  for (const width of [320, 390]) {
    const { context } = await fixtureContext(browser, {
      width, height: 844, role: 'faculty', touch: true, referenceTime: '2026-11-06T01:15:00Z',
    })
    try {
      const page = await context.newPage()
      for (const screen of routes) {
        await page.goto(new URL(base + screen.path, origin).href)
        await page.getByRole('heading', { name: screen.heading, exact: true }).waitFor()
        await settleVisuals(page)
        await page.screenshot({ path: resolve(output, `${screen.name}-${width}.png`), animations: 'disabled' })
        if (screen.name === 'students') {
          await page.getByRole('button', { name: /Data Structures and Algorithms/ }).click()
          await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }))
          await page.waitForFunction(() => scrollY === 0 &&
            document.querySelector('[data-dock-folded]')?.getAttribute('data-dock-folded') !== 'true')
          await settleVisuals(page)
          await page.screenshot({ path: resolve(output, `students-expanded-${width}.png`), animations: 'disabled' })
        }
      }
    } finally {
      await context.close()
    }
  }
  console.log(output)
} finally {
  await browser.close()
}
