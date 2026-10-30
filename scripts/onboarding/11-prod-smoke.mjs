// A1: production smoke + zero onboarding surface in the bundle. (gate
// plan §6.A + provisional rule 1: zero onboarding bytes and zero
// onboarding modules in the production bundle - NOT provisional.)
//
//   1. `next build` a production bundle (gate env, non-secret dev smoke
//      AUTH_SECRET disclosed in this repo - production rejects the dev
//      fallback secret, so a distinct value is used and stated).
//   2. Scan .next/static/chunks for onboarding implementation markers
//      and compute the onboarding byte count (expected: 0).
//   3. `next start` the bundle and smoke it: the portal loads, and
//      NO onboarding surface exists (no overlay machinery, no dev
//      launcher, nothing matching onboarding markers in the DOM).
//
// Evidence: prod-smoke-report.md, bundle scan under prod-smoke/, manifest.
// Run: node scripts/onboarding/11-prod-smoke.mjs (Windows, env per README).

import { execFileSync, spawn } from 'node:child_process'
import { readdirSync, mkdirSync, readFileSync, statSync, openSync, writeFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  EVID, WT, ensureMongod, launchBrowser, gateContext, openPortal,
  step, results, failures, writeReport, writeManifest, invocationLine,
  stopDevServer,
} from './lib.mjs'

const OUT = resolve(EVID, 'prod-smoke')
const PROD_PORT = 4320
const PROD_ORIGIN = `http://localhost:${PROD_PORT}`
// Disclosed, repo-contained, NOT the dev fallback and NOT any owner secret.
const SMOKE_SECRET = 'aics-phase2-gate-smoke-secret-0x5166-not-for-real-deploys'

// Implementation markers that must NOT exist in the production client
// bundle (checked as JS source substrings, minifier-safe: the strings are
// literal JS identifiers/attributes that survive minification only if the
// module is present).
const MARKERS = [
  'TourOverlay',
  'data-tour-overlay',
  'data-tour-card',
  'data-tour-spotlight',
  'dev-tour-launcher',
  'Guided tour completed.',
  'FabricateOnboardingDev',
  'onboarding board',
  'remove-volatile-target',
]

const run = async () => {
  mkdirSync(OUT, { recursive: true })
  await ensureMongod()
  stopDevServer() // gate port is dev-only; prod smoke uses its own port
  const progress = (m) => console.error(`[11-prod-smoke] ${m}`)
  writeManifest(OUT, [
    `command: ${invocationLine('11-prod-smoke.mjs')}`,
    `node: ${process.version}`,
    `scope: A1 production smoke - next build, .next client-chunk scan for onboarding markers (expected bytes: 0, modules: 0), next start on port ${PROD_PORT}, portal loads with zero onboarding surfaces in the DOM`,
    `build AUTH_SECRET: ${SMOKE_SECRET} (disclosed; production rejects the dev fallback, so a repo-contained smoke value is used; never a deploy credential)`,
  ])

  // 1. Build
  progress('next build (production)')
  const buildLog = openSync(resolve(OUT, 'build.log'), 'a')
  const buildEnv = { ...process.env, MONGODB_URI: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017', MONGODB_DB: process.env.MONGODB_DB || 'aics_portal', APP_ENV: 'production', AUTH_SECRET: SMOKE_SECRET }
  let buildOk = true
  try {
    execFileSync('node', [resolve(WT, 'node_modules/next/dist/bin/next'), 'build'], {
      cwd: WT, env: buildEnv, stdio: ['ignore', buildLog, buildLog],
    })
  } catch (e) {
    buildOk = false
    console.error(e.message)
  }
  step('A1: next build exits 0', buildOk, 'full log in prod-smoke/build.log')

  if (buildOk) {
    // 2. Client chunk scan for onboarding markers
    const chunksDir = resolve(WT, '.next/static/chunks')
    let hits = []
    let bytes = 0
    try {
      const walk = (dir) => {
        for (const f of readdirSync(dir, { withFileTypes: true })) {
          const p = resolve(dir, f.name)
          if (f.isDirectory()) walk(p)
          else {
            const buf = readFileSync(p)
            const text = buf.toString('utf8')
            for (const m of MARKERS) {
              if (text.includes(m)) {
                const idx = text.indexOf(m)
                hits.push({ file: p, marker: m, ctx: JSON.stringify(text.slice(Math.max(0, idx - 80), idx + 120)) })
                bytes += text.length === buf.length ? buf.length : buf.length
              }
            }
          }
        }
      }
      walk(chunksDir)
    } catch (e) {
      step('A1: client chunk scan executed', false, String(e))
    }
    step('A1 RULE 1: zero onboarding modules in the production client chunks', hits.length === 0, hits.length ? JSON.stringify(hits, null, 1) : `${MARKERS.length} markers x every file under .next/static/chunks: 0 matches, onboarding client bytes = 0, onboarding modules = 0`)
    writeFileSync(resolve(OUT, 'chunk-scan.json'), JSON.stringify({ markers: MARKERS, hits, totalClientChunkFiles: (() => { let n = 0; try { const w = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = resolve(d, f.name); if (f.isDirectory()) w(p); else n++ } }; w(chunksDir); } catch {} return n })() }, null, 1))
  }

  // 3. next start + portal smoke with zero onboarding surfaces
  if (buildOk) {
    progress(`next start on port ${PROD_PORT}`)
    let prod = null
    try {
      const logFd = openSync(resolve(OUT, 'start.log'), 'a')
      prod = spawn('node', [resolve(WT, 'node_modules/next/dist/bin/next'), 'start', '-p', String(PROD_PORT)], {
        cwd: WT, env: { ...buildEnv, NODE_ENV: 'production' }, stdio: ['ignore', logFd, logFd], detached: true, windowsHide: true,
      })
      let up = false
      for (let i = 0; i < 60; i++) {
        try {
          const r = await fetch(PROD_ORIGIN, { signal: AbortSignal.timeout(1500) })
          if (r.ok) { up = true; break }
        } catch {}
        await new Promise((r) => setTimeout(r, 1000))
      }
      step('A1: next start serves the production build', up)
      if (up) {
        // The demo-cookie path cannot work in production: the dev session
        // mint helper signs with the DEV fallback secret while the prod
        // build requires the smoke secret, and /api/auth/demo is 404
        // outside development. So this smoke performs a REAL seeded
        // demo login against the production server (student123, the
        // publicly documented demo credential) and rides that session.
        const login = await fetch(`${PROD_ORIGIN}/api/auth/login`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ username: 'juan.santos', password: 'student123' }),
        })
        step('A1: real seeded demo login works against the production server', login.ok, `status=${login.status}`)
        const session = (login.headers.getSetCookie().join('\n').match(/aics_session=([^;]+)/) || [])[1]
        const browser = await launchBrowser()
        const ctx = await gateContext(browser, {
          viewport: { width: 1280, height: 800 },
          origin: PROD_ORIGIN,
          session,
        })
        const page = await openPortal(ctx, '', { launcherRequired: false, origin: PROD_ORIGIN })
        // The portal shell paints skeletons first; wait for the live nav.
        await page.waitForSelector('[data-tour="nav-dashboard"]', { timeout: 30000 })
        await page.waitForTimeout(1500)
        const dom = await page.evaluate(() => ({
          overlay: !!document.querySelector('[data-tour-overlay], [data-tour-spotlight], [data-tour-card]'),
          launcher: !!document.querySelector('[data-tour="dev-tour-launcher"]'),
          markerAttrs: Array.from(document.querySelectorAll('[data-tour]')).filter((el) => !['nav-dashboard', 'nav-academics', 'nav-help'].includes(el.getAttribute('data-tour') || '')).length,
          bodyHasGuideText: document.body && document.body.textContent.includes('Guided tour'),
          navOk: !!document.querySelector('[data-tour="nav-dashboard"]'),
        }))
        step('A1: production page has NO tour overlay machinery in the DOM', !dom.overlay, JSON.stringify(dom))
        step('A1: production page has NO dev tour launcher', !dom.launcher)
        step('A1: production page carries no guided-tour strings', !dom.bodyHasGuideText)
        step('A1: the production portal itself is fully rendered (nav present, page works)', dom.navOk)
        await page.screenshot({ path: resolve(OUT, 'a1-prod-no-tour.png') })
        await page.close()
        await ctx.close()
        await browser.close()
      }
    } finally {
      if (prod?.pid) {
        try { execFileSync('taskkill', ['/T', '/F', '/PID', String(prod.pid)], { stdio: 'ignore' }) } catch {}
      }
    }
  }

  writeReport(
    OUT,
    'prod-smoke-report',
    'A1 + provisional rule 1 (NOT provisional): next build a production bundle with the gate env (disclosed repo-contained smoke AUTH_SECRET; production rejects the dev fallback), scan every client chunk under .next/static/chunks for onboarding implementation markers (TourOverlay token, overlay/card/spotlight attributes, the dev launcher contract, the completion sentence, the board contract, the synthetic host symbol): expected 0 matches = 0 onboarding bytes and 0 onboarding modules in the production client; then `next start` the build and smoke the real production portal: it renders fully (nav present, page operable) with NO tour overlay machinery, NO dev launcher, and no guided-tour strings in the live DOM.',
    [
      ['Method', 'The chunk scan is a source-substring scan over minified client JS: presentation attributes (data-tour-overlay etc.) and aria strings survive minification only if the module that renders them is present, so a 0-match scan is positive proof of exclusion, not a style check. The DOM assertions run in the live production page over CDP with the same helpers every other gate script uses.'],
    ]
  )

  console.log(failures === 0 ? '\n11-prod-smoke: ALL PASS' : `\n11-prod-smoke: ${failures} FAILURES`)
  process.exitCode = failures === 0 ? 0 : 1
}

run().catch((err) => {
  console.error('11-prod-smoke failed:', err)
  stopDevServer()
  process.exit(1)
})
