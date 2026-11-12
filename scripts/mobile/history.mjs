// Capture genuine commit/parent UI evidence without changing the user's checkout.
import { chromium } from 'playwright'
import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync, openSync, closeSync } from 'node:fs'
import { resolve, dirname, sep } from 'node:path'
import { tmpdir } from 'node:os'
import { localEnv } from '../onboarding/isolated-source.mjs'
import { fixtureContext, origin, student } from './fixtures.mjs'
import { settleVisuals } from './visuals.mjs'

const root = resolve(import.meta.dirname, '../..')
if (origin !== 'http://localhost:4351') throw new Error('Set MOBILE_ORIGIN=http://localhost:4351 for the isolated history preview')
const base = resolve(root, '.phase2-local/mobile-ux/commit-history')
mkdirSync(base, { recursive: true })
const git = args => execFileSync('git', args, { cwd: root, encoding: 'utf8', windowsHide: true })
const refs = process.argv.slice(2)
if (!refs.length || refs.some(ref => !/^[a-f0-9]{7,40}$/.test(ref))) throw new Error('Supply explicit commit hashes')
const source = mkdtempSync(resolve(tmpdir(), 'aics-mobile-history-'))
symlinkSync(resolve(root, 'node_modules'), resolve(source, 'node_modules'), 'junction')
const inputs = ['src', 'public', '.gitignore', 'package.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs']
const fixedClock = '2026-11-06T01:15:00Z'
const run = async (args, cwd, log) => {
  const fd = openSync(log, 'w')
  const child = spawn(process.execPath, args, { cwd, env: { ...localEnv(), NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve(root, 'scripts/mobile/cached-fonts.js') }, stdio: ['ignore', fd, fd], windowsHide: true })
  const code = await new Promise((ok, fail) => { child.on('exit', ok); child.on('error', fail) })
  closeSync(fd)
  if (code !== 0) throw new Error(`Historical build exited ${code}: ${log}`)
}
async function capture(out, report) {
  const browser = await chromium.launch({ headless: true })
  const fixture = await fixtureContext(browser, { referenceTime: fixedClock })
  const page = await fixture.context.newPage()
  page.on('pageerror', error => report.clientErrors.push(error.message))
  const route = async suffix => {
    await page.evaluate(url => { history.pushState({}, '', url); dispatchEvent(new Event('pushstate')); window.scrollTo(0, 0) }, `/portal/commonwealth/student/${student.username}${suffix}`)
    await page.evaluate(() => document.fonts.ready)
    await page.waitForTimeout(650)
  }
  const shot = async name => {
    const assets = await settleVisuals(page)
    await page.evaluate(async () => {
      // Dialogs may be visible before their opening opacity and zoom finish.
      const animations = document.getAnimations().filter(animation => animation.effect?.getComputedTiming().endTime !== Infinity)
      await Promise.allSettled(animations.map(animation => animation.finished))
      await new Promise(done => requestAnimationFrame(() => requestAnimationFrame(done)))
    })
    await page.screenshot({ path: resolve(out, name + '.png') })
    report.screenshots.push({ file: name + '.png', url: page.url(), viewport: page.viewportSize(), assets, ...(await page.evaluate(() => ({ pageWidth: document.documentElement.scrollWidth }))) })
  }
  try {
    await page.goto(origin, { waitUntil: 'load', timeout: 300000 })
    await page.getByRole('heading', { name: 'Welcome back, Alexandra!' }).waitFor({ timeout: 120000 })
    await page.waitForTimeout(650)
    await shot('dashboard-390')
    await page.getByRole('region', { name: 'Getting started', exact: true }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    await shot('setup-390')
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.setViewportSize({ width: 320, height: 844 })
    await shot('dashboard-320')
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
    await page.getByRole('dialog', { name: 'Navigation menu' }).waitFor()
    await shot('drawer-320')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog', { name: 'Navigation menu' }).waitFor({ state: 'hidden' })
    await page.setViewportSize({ width: 320, height: 420 })
    await page.getByRole('button', { name: 'Open navigation menu', exact: true }).click()
    const shortDrawer = page.getByRole('dialog', { name: 'Navigation menu' })
    await shortDrawer.waitFor()
    const theme = shortDrawer.getByRole('button', { name: 'Switch to dark theme', exact: true })
    if (await theme.count()) await theme.scrollIntoViewIfNeeded()
    await shot('drawer-320x420')
    await page.keyboard.press('Escape')
    await shortDrawer.waitFor({ state: 'hidden' })
    await page.setViewportSize({ width: 320, height: 844 })
    await route('/academics?tab=tasks')
    await page.getByRole('heading', { name: 'Task Overview', exact: true }).waitFor()
    // Historical Tasks versions already support the tab query, but settling the
    // route alone is not sufficient evidence that the populated screen rendered.
    await shot('tasks-320')
    await page.getByRole('heading', { name: 'Courses', exact: true }).scrollIntoViewIfNeeded()
    await page.waitForTimeout(150)
    await shot('courses-320')
    await route('/academics?tab=materials')
    await shot('materials-320')
    await route('/events')
    await shot('events-320')
    await route('/settings?section=security')
    await shot('settings-security-320')
    await route('/profile')
    await page.getByRole('button', { name: 'Preview Certificate', exact: true }).click()
    await page.getByRole('dialog').waitFor()
    await page.waitForTimeout(150)
    await shot('coe-320')
    await page.keyboard.press('Escape')
    await page.getByRole('dialog').waitFor({ state: 'hidden' })
    const searchTrigger = page.getByRole('button', { name: 'Open portal search', exact: true })
    if (await searchTrigger.count()) await searchTrigger.click()
    const search = page.getByRole('combobox')
    await search.fill('CS201')
    await page.getByRole('option').first().waitFor()
    await shot('search-320')
    await page.keyboard.press('Escape')
    const searchDialog = page.getByRole('dialog', { name: 'Search the portal', exact: true })
    if (await searchDialog.count()) { await page.keyboard.press('Escape'); await searchDialog.waitFor({ state: 'hidden' }) }
    await page.getByRole('button', { name: /^Notifications/ }).click()
    const inboxPage = page.getByRole('heading', { name: 'Notifications', exact: true })
    const inboxMenu = page.getByRole('menu')
    await inboxPage.or(inboxMenu).waitFor()
    await page.getByText('New activity posted', { exact: true }).waitFor()
    await shot('notifications-320')
    if (await inboxMenu.count()) {
      await page.keyboard.press('Escape')
      await inboxMenu.waitFor({ state: 'hidden' })
    }
    await page.setViewportSize({ width: 320, height: 420 })
    await route('/help')
    await page.getByRole('button', { name: 'Replay guided tour', exact: true }).click()
    const guide = page.locator('[data-tour-card]')
    await guide.waitFor()
    await guide.getByRole('button', { name: 'Go to the next tour step', exact: true }).click()
    await page.locator('[data-tour-overlay][data-step-id="student-announcements"]').waitFor()
    await page.waitForTimeout(650)
    await shot('guide-320x420')
    const hide = guide.getByRole('button', { name: 'Hide guide to explore the page', exact: true })
    if (await hide.count()) {
      await hide.click()
      await page.getByRole('button', { name: 'Read announcement: Midterm examination schedule', exact: true }).scrollIntoViewIfNeeded()
      await shot('guide-minimized-320x420')
    }
    await page.keyboard.press('Escape')
    await fixture.context.close()
    const signedOut = await fixtureContext(browser, { width: 320, height: 720 })
    await signedOut.context.clearCookies()
    await signedOut.context.route('**/api/auth/session', route => route.fulfill({ status: 401, json: { ok: false } }))
    const login = await signedOut.context.newPage()
    await login.goto(origin, { waitUntil: 'load', timeout: 180000 })
    await login.locator('input[type="password"]').waitFor()
    report.signInAssets = await settleVisuals(login)
    await login.waitForTimeout(650)
    await login.screenshot({ path: resolve(out, 'sign-in-320.png') })
    report.screenshots.push({ file: 'sign-in-320.png', url: origin, viewport: login.viewportSize() })
    for (const [width, height] of [[320, 420], [390, 844]]) {
      await login.setViewportSize({ width, height })
      await login.evaluate(() => scrollTo(0, 0))
      await login.waitForTimeout(350)
      await settleVisuals(login)
      const file = `sign-in-${width}x${height}.png`
      await login.screenshot({ path: resolve(out, file) })
      report.screenshots.push({ file, url: origin, viewport: login.viewportSize() })
    }
    await login.setViewportSize({ width: 320, height: 720 })
    await login.locator('#password').fill('example-only-password')
    await login.getByRole('button', { name: 'Show password', exact: true }).focus()
    await login.keyboard.press('Enter')
    await settleVisuals(login)
    const revealFile = 'sign-in-keyboard-reveal-320.png'
    await login.screenshot({ path: resolve(out, revealFile) })
    report.screenshots.push({ file: revealFile, url: origin, viewport: login.viewportSize(), focus: await login.evaluate(() => ({ tag: document.activeElement.tagName, id: document.activeElement.id, label: document.activeElement.getAttribute('aria-label') })) })
    const legal = login.getByRole('navigation', { name: 'Legal', exact: true })
    if (await legal.count()) {
      await legal.scrollIntoViewIfNeeded()
      const file = 'sign-in-legal-320.png'
      await login.screenshot({ path: resolve(out, file) })
      report.screenshots.push({ file, url: origin, viewport: login.viewportSize() })
    }
    await signedOut.context.close()
  } finally { await browser.close() }
}
for (const ref of refs) {
  const sha = git(['rev-parse', ref]).trim()
  const out = resolve(base, sha.slice(0, 7))
  mkdirSync(out, { recursive: true })
  if (existsSync(resolve(out, 'result.json')) && JSON.parse(readFileSync(resolve(out, 'result.json'))).finishedAt && process.env.MOBILE_CAPTURE_REFRESH !== '1') { console.log(`Already captured ${sha}`); continue }
  // The only removed paths belong to the fresh temp export created above.
  for (const entry of inputs) {
    const target = resolve(source, entry)
    if (!target.startsWith(source + sep) || dirname(source) !== resolve(tmpdir())) throw new Error('Invalid temporary export path')
    rmSync(target, { recursive: true, force: true })
  }
  const files = git(['ls-tree', '-r', '-z', sha, '--', ...inputs]).split('\0').filter(Boolean).map(line => {
    const [info, path] = line.split('\t')
    const [mode, type, oid] = info.split(' ')
    if (type !== 'blob' || !['100644', '100755'].includes(mode) || !resolve(source, path).startsWith(source + sep)) throw new Error('Invalid archive entry')
    return { path, oid }
  })
  const archive = execFileSync('git', ['archive', '--format=tar', sha, ...inputs], { cwd: root, maxBuffer: 30 * 1024 * 1024, windowsHide: true })
  execFileSync('tar', ['-xf', '-', '-C', source], { input: archive, windowsHide: true })
  const records = []
  for (const file of files) {
    const bytes = readFileSync(resolve(source, file.path))
    const oid = createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex')
    if (oid !== file.oid) throw new Error('Historical app bytes do not match the commit')
    records.push({ path: file.path, sha256: createHash('sha256').update(bytes).digest('hex') })
  }
  const report = { commit: sha, parent: git(['rev-parse', `${sha}^`]).trim(), source, startedAt: new Date().toISOString(), browserReferenceTime: fixedClock, fixtureOnly: true, note: 'Exact committed app inputs; installed dependencies and cached original font bytes. Same fixtures, viewport sizes and reference date for every commit. Calendar time advances with native timers. Screenshots are unaltered.', records, screenshots: [], clientErrors: [] }
  writeFileSync(resolve(out, 'result.json'), JSON.stringify(report, null, 2))
  const verified = JSON.parse(readFileSync(resolve(root, '.phase2-local/mobile-ux/quality.json')))
  const quality = JSON.parse(readFileSync(resolve(verified.output, 'result.json')))
  const appRecords = records.filter(record => /^(src|public)\//.test(record.path))
  const reuse = quality.commands.length === 3 && quality.commands.every(command => command.exitCode === 0) && appRecords.length === quality.records.length && appRecords.every(record => quality.records.some(input => input.path === record.path && input.sha256 === record.sha256)) && inputs.filter(file => !['src', 'public', 'next-env.d.ts'].includes(file)).every(file => readFileSync(resolve(source, file)).equals(readFileSync(resolve(verified.source, file))))
  const servedSource = reuse ? verified.source : source
  report.servedSource = servedSource
  report.reusedVerifiedBuild = reuse
  if (!reuse) {
    console.log(`Building ${sha}`)
    const command = [resolve(root, 'node_modules/next/dist/bin/next'), 'build', '--webpack']
    if (process.env.MOBILE_HISTORY_RENDER_ONLY === '1') {
      // Historical UI evidence can be rendered separately from the final quality gate.
      report.buildMode = 'Next compile and generate phases, historical UI evidence only'
      await run([...command, '--experimental-build-mode', 'compile'], source, resolve(out, 'compile.log'))
      // Next 16's webpack compile phase can already rename the generated proxy.
      // Preserve the identical generated file at the name the generate phase expects.
      for (const suffix of ['.js', '.js.nft.json']) {
        const middleware = resolve(source, '.next/server/middleware' + suffix)
        const proxy = resolve(source, '.next/server/proxy' + suffix)
        if (existsSync(middleware) && !existsSync(proxy)) copyFileSync(middleware, proxy)
      }
      await run([...command, '--experimental-build-mode', 'generate'], source, resolve(out, 'generate.log'))
    } else {
      report.buildMode = 'full production build'
      await run(command, source, resolve(out, 'build.log'))
    }
  }
  const fd = openSync(resolve(out, 'server.log'), 'w')
  const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-H', 'localhost', '-p', '4351'], { cwd: servedSource, env: localEnv(), stdio: ['ignore', 'pipe', fd], windowsHide: true })
  let output = ''
  try {
    await new Promise((ok, fail) => {
      const timer = setTimeout(() => fail(new Error('History server did not start')), 120000)
      server.stdout.on('data', chunk => { output += chunk; if (output.includes('Ready')) { clearTimeout(timer); ok() } })
      server.on('error', fail)
      server.on('exit', code => { clearTimeout(timer); fail(new Error(`History server exited ${code}`)) })
    })
    await capture(out, report)
    report.finishedAt = new Date().toISOString()
    writeFileSync(resolve(out, 'result.json'), JSON.stringify(report, null, 2))
    console.log(`Captured ${sha}: ${report.screenshots.length} screenshots`)
  } finally {
    const exited = new Promise(ok => server.once('exit', ok))
    server.kill()
    await exited
    closeSync(fd)
  }
}
