#!/usr/bin/env node
// Phase 2 Stage 2B — affected-component visuals in the REAL app, both
// themes (authorization §4: "Inspect screenshot diffs, computed styles,
// and affected components in both light and dark themes").
//
// Command (after bun run build at the code commit):
//   GATE_EVID=docs/done/qa_evidence/ui-ux/dark-theme/phase2 \
//   bun scripts/theme/phase2-2b-visuals.mjs --out docs/done/qa_evidence/ui-ux/dark-theme/phase2/2b/visuals/
//
// Captures per theme (aics_theme=light|dark, the production mechanism):
//   - student dashboard: AcademicHeader Stat values, Topbar avatar
//     initials circle, sidebar shell
//   - academics page, Tasks tab: TasksTab OverviewStat big numbers
// Records the computed colors of every migrated element in report.json
// (light = the exact pre-2B literals; dark = the theme-aware tokens).
//
// The Sidebar disabled/"Soon" state has no live instance (every nav item
// is enabled: true in nav-config.ts), so its colors are covered by the
// phase2-2b-computed.mjs pair check instead of a route capture.

import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'
import { WT, headSha, writeManifest, invocationLine, resolve } from './lib.mjs'

const args = process.argv.slice(2)
const argOf = (name, dflt) => {
  const i = args.indexOf(name)
  return i >= 0 ? args[i + 1] : dflt
}
const outDir = argOf('--out', resolve(WT, 'docs/done/qa_evidence/ui-ux/dark-theme/phase2/2b/visuals'))

const PORT = 4303
const ORIGIN = `http://127.0.0.1:${PORT}`
const BRANCH = 'commonwealth'
const STUDENT = 'juan.santos'
const studentBase = `/portal/${BRANCH}/student/${STUDENT}`

const results = []
let failures = 0
function step(desc, ok, detail = '') {
  if (!ok) failures++
  results.push({ desc, ok, detail })
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${desc}${detail ? ` — ${detail}` : ''}`)
}

if (!existsSync(resolve(WT, '.next/BUILD_ID'))) {
  console.error('2b-visuals FAIL: .next/BUILD_ID missing — run bun run build first')
  process.exit(2)
}

const server = spawn('node_modules/.bin/next', ['start', '-p', String(PORT)], {
  cwd: WT,
  env: { ...process.env, APP_ENV: 'development' },
  stdio: ['ignore', 'pipe', 'pipe'],
})
server.stderr.on('data', (d) => process.stderr.write(`[server] ${d}`))
const cleanup = async () => {
  try {
    server.kill('SIGTERM')
    await new Promise((r) => setTimeout(r, 400))
    try { server.kill('SIGKILL') } catch {}
  } catch {}
}
process.on('SIGINT', () => { cleanup(); process.exit(1) })

async function waitForServer(timeoutMs = 120000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`${ORIGIN}/portal/login`)
      if (res.ok || (res.status >= 300 && res.status < 400)) return
    } catch {}
    await new Promise((r) => setTimeout(r, 500))
  }
  throw new Error('2b-visuals server did not become ready')
}

mkdirSync(outDir, { recursive: true })
const shots = resolve(outDir, 'shots')
mkdirSync(shots, { recursive: true })

try {
  await waitForServer()
  console.log('2b-visuals: server ready')
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--hide-scrollbars'] })

  const studentCookie = (await (await fetch(`${ORIGIN}/api/auth/demo`, { method: 'POST' })).headers.getSetCookie()).join('\n').match(/aics_session=([^;]+)/)[1]

  for (const theme of ['light', 'dark']) {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, colorScheme: 'light' })
    await ctx.addInitScript(`localStorage.setItem('aics_theme', '${theme}')`)
    await ctx.addCookies([{ name: 'aics_session', value: studentCookie, url: ORIGIN }])
    const page = await ctx.newPage()

    // --- Student dashboard: AcademicHeader stats + Topbar avatar ---
    await page.goto(`${ORIGIN}${studentBase}`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const isDark = await page.evaluate(() => document.documentElement.classList.contains('dark'))
    step(`${theme}: html.${theme} applied`, isDark === (theme === 'dark'))

    const dash = await page.evaluate(() => {
      const out = {}
      // Topbar avatar initials circle (Stage 2B: bg-[var(--avatar-bg)])
      const avatar = document.querySelector('header [aria-hidden="true"].rounded-full')
      if (avatar) out.avatarBg = getComputedStyle(avatar).backgroundColor
      // AcademicHeader Stat values (Stage 2B: text-[#0f172a] dark:text-slate-900)
      const stat = document.querySelector('section p.text-xl')
      if (stat) out.statInk = getComputedStyle(stat).color
      out.statCount = document.querySelectorAll('section p.text-xl').length
      return out
    })
    step(`${theme}: Topbar avatar computed bg`, !!dash.avatarBg, dash.avatarBg)
    step(`${theme}: AcademicHeader Stat computed color (${dash.statCount} stats)`, !!dash.statInk, dash.statInk)
    await page.screenshot({ path: resolve(shots, `${theme}-student-dashboard.png`), fullPage: false })
    // Avatar close-up for detailed review.
    const avatarLoc = page.locator('header [aria-hidden="true"].rounded-full').first()
    if (await avatarLoc.count()) {
      await avatarLoc.screenshot({ path: resolve(shots, `${theme}-topbar-avatar.png`) })
    }

    // --- Academics page, Tasks tab: OverviewStat big numbers ---
    await page.goto(`${ORIGIN}${studentBase}/academics`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(600)
    const tasksTab = page.getByRole('button', { name: /^Tasks$/ })
    if (await tasksTab.count()) {
      await tasksTab.first().click()
      await page.waitForTimeout(700)
    }
    const tasks = await page.evaluate(() => {
      const out = {}
      const nums = [...document.querySelectorAll('p.text-2xl.font-bold')]
      out.bigNumbers = nums.map((n) => ({
        label: n.parentElement?.querySelector('p.text-\\[10px\\]')?.textContent?.trim() || '',
        color: getComputedStyle(n).color,
        text: n.textContent?.trim() || '',
      }))
      return out
    })
    step(`${theme}: TasksTab OverviewStat tones captured`, tasks.bigNumbers.length >= 5, JSON.stringify(tasks.bigNumbers.map((b) => b.color)))
    await page.screenshot({ path: resolve(shots, `${theme}-academics-tasks.png`), fullPage: false })
    results.push({ desc: `${theme}: OverviewStat computed tones`, ok: true, detail: JSON.stringify(tasks.bigNumbers) })
    await ctx.close()
  }

  await browser.close()
} catch (e) {
  console.error(`2b-visuals FAIL: ${e}`)
  failures++
} finally {
  await cleanup()
}

writeFileSync(`${outDir}/report.json`, JSON.stringify({ gate: 'Phase 2 Stage 2B affected-component visuals', head: headSha(), results }, null, 2))
writeManifest(outDir, [
  `command: ${invocationLine('phase2-2b-visuals.mjs')}`,
  `exit code: ${failures ? 1 : 0}`,
  `routes: ${studentBase} (dashboard) + ${studentBase}/academics (Tasks tab) per theme, session via POST /api/auth/demo`,
  `themes: aics_theme=light|dark localStorage (production next-themes mechanism), colorScheme light held constant`,
  `captures: shots/<theme>-student-dashboard.png, shots/<theme>-topbar-avatar.png, shots/<theme>-academics-tasks.png`,
  'sidebar disabled state: no live instance (all nav items enabled: true) — colors covered by phase2-2b-computed.mjs',
  'server: isolated next start on 127.0.0.1:4303 (APP_ENV=development), killed on exit',
])
if (failures) {
  console.log(`\n2b-visuals FAIL: ${failures} step(s) failed — see ${outDir}/report.json`)
  process.exit(1)
}
console.log(`\n2b-visuals PASS: affected components captured in both themes`)
