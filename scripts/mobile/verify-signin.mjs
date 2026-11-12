// UI-only authentication fixtures. No credential request reaches a school server.
import { chromium } from 'playwright'
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { resolve } from 'node:path'
import { fixtureContext, origin, student } from './fixtures.mjs'
import { settleVisuals } from './visuals.mjs'

const root = resolve(import.meta.dirname, '../..')
const label = process.argv[2] || 'signin-composition'
if (!/^[a-z0-9-]+$/.test(label)) throw new Error('Invalid label')
const out = resolve(root, '.phase2-local/mobile-next', label)
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
const result = {
  head: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
  sourceFilesMatched: quality.records.length,
  fixtureOnly: true,
  checks: [],
  errors: [],
  screenshots: [],
}
const save = () => writeFileSync(resolve(out, 'result.json'), JSON.stringify(result, null, 2))
function check(name, pass, detail) {
  result.checks.push({ name, pass: Boolean(pass), ...(detail ? { detail } : {}) })
  save()
  console.log(`${pass ? 'PASS' : 'FAIL'} ${name}`)
}

const browser = await chromium.launch({ headless: true })
let context
try {
  const fixture = await fixtureContext(browser, { width: 320, height: 720, touch: true })
  context = fixture.context
  const cookie = (await context.cookies()).find(cookie => cookie.name === 'aics_session')
  if (!cookie) throw new Error('Synthetic login cookie is missing')
  await context.clearCookies()
  let signedIn = false
  let mode = 'invalid'
  let release
  const requests = []
  const session = { ok: true, username: student.username, role: 'student', branch: student.branch }
  await context.route('**/api/auth/session', route => route.fulfill({
    status: signedIn ? 200 : 401,
    json: signedIn ? session : { ok: false },
  }))
  await context.route('**/api/auth/login', async route => {
    requests.push(route.request().postDataJSON())
    if (mode === 'network') return route.abort('failed')
    if (mode === 'slow') await new Promise(resolve => { release = resolve })
    if (mode === 'success') {
      signedIn = true
      return route.fulfill({
        headers: { 'Set-Cookie': `aics_session=${cookie.value}; Path=/; HttpOnly; SameSite=Lax` },
        json: session,
      })
    }
    return route.fulfill({ status: 401, json: { ok: false, error: 'Invalid username or password.' } })
  })

  const page = await context.newPage()
  const username = page.locator('#username')
  const password = page.locator('#password')
  const signIn = page.getByRole('button', { name: 'Sign In', exact: true })
  const showPassword = page.getByRole('button', { name: 'Show password', exact: true })
  const hidePassword = page.getByRole('button', { name: 'Hide password', exact: true })
  const authError = page.getByRole('alert').filter({ hasText: 'Invalid username or password.' })
  const samplePassword = 'example-only-password'

  page.on('pageerror', error => result.errors.push(error.message))
  await page.goto(origin, { waitUntil: 'load', timeout: 180000 })
  await username.waitFor()
  result.visualAssets = await settleVisuals(page)
  check('Application fonts and visible sign-in images loaded', true, result.visualAssets)

  async function shot(name) {
    await settleVisuals(page)
    await page.waitForTimeout(350)
    const file = `${name}.png`
    await page.screenshot({ path: resolve(out, file) })
    result.screenshots.push(file)
    save()
  }

  const placeholderContrast = () => username.evaluate(input => {
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = 1
    const ctx = canvas.getContext('2d')
    function color(value) {
      ctx.clearRect(0, 0, 1, 1)
      ctx.fillStyle = value
      ctx.fillRect(0, 0, 1, 1)
      return Array.from(ctx.getImageData(0, 0, 1, 1).data)
    }
    const foreground = color(getComputedStyle(input, '::placeholder').color)
    const background = color(getComputedStyle(input).backgroundColor)
    const alpha = foreground[3] / 255
    const text = foreground.slice(0, 3).map((channel, index) => channel * alpha + background[index] * (1 - alpha))
    function luminance(rgb) {
      const linear = rgb.slice(0, 3).map(channel => {
        const value = channel / 255
        return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
      })
      return linear[0] * 0.2126 + linear[1] * 0.7152 + linear[2] * 0.0722
    }
    const a = luminance(text)
    const b = luminance(background)
    return { ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05), foreground, background }
  })

  const viewports = [[320, 720], [320, 420], [360, 740], [390, 844], [430, 932], [844, 390], [1280, 900]]
  for (const [width, height] of viewports) {
    await page.setViewportSize({ width, height })
    await page.evaluate(() => scrollTo(0, 0))
    const name = `sign-in-${width}x${height}`
    const metrics = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth }))
    check(`${name}: no page overflow`, metrics.scroll <= metrics.width, metrics)

    if (width < 1024) {
      const form = await page.locator('form').boundingBox()
      const hero = await page.getByRole('img', { name: 'Asian Institute of Computer Studies campus', exact: true }).boundingBox()
      const welcome = await page.getByText('Welcome to your', { exact: true }).boundingBox()
      check(`${name}: photo and welcome precede the form`, hero.height > 0 && hero.y + hero.height <= form.y && welcome.y >= hero.y && welcome.y < form.y)
      const fonts = await page.locator('#username,#password').evaluateAll(
        inputs => inputs.map(input => parseFloat(getComputedStyle(input).fontSize)),
      )
      check(`${name}: readable input text`, fonts.every(size => size >= 16), fonts)
    }
    const reveal = await showPassword.boundingBox()
    check(`${name}: reveal target at least 44px`, reveal.width >= 44 && reveal.height >= 44, reveal)
    if (width === 320 && height === 720) {
      const submit = await signIn.boundingBox()
      check('Phone sign-in action is visible on the initial 720px screen', submit.y + submit.height <= height, submit)
    }
    await shot(`signin-${width}x${height}`)
  }

  await page.setViewportSize({ width: 390, height: 844 })
  await page.evaluate(() => {
    document.documentElement.style.fontSize = '200%'
    scrollTo(0, 0)
  })
  check('Sign-in reflows at 200 percent text size', await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
  await shot('signin-large-text-390')
  await page.evaluate(() => { document.documentElement.style.fontSize = '' })
  await page.setViewportSize({ width: 320, height: 420 })
  await page.getByRole('button', { name: 'Switch to dark theme', exact: true }).click()
  check('Pre-auth theme toggle works', await page.locator('html').evaluate(el => el.classList.contains('dark')))
  const darkContrast = await placeholderContrast()
  check('Dark sign-in placeholder contrast meets 4.5 threshold', darkContrast.ratio >= 4.5, darkContrast)
  await shot('signin-dark-320x420')
  await page.getByRole('button', { name: 'Switch to light theme', exact: true }).click()
  const lightContrast = await placeholderContrast()
  check('Light sign-in placeholder contrast meets 4.5 threshold', lightContrast.ratio >= 4.5, lightContrast)

  const legal = page.getByRole('navigation', { name: 'Legal', exact: true })
  const legalTargets = await legal.getByRole('link').evaluateAll(links => links.map(link => link.getBoundingClientRect().height))
  check('Dedicated phone legal links have 44px hit areas', legalTargets.length >= 3 && legalTargets.every(height => height >= 44), legalTargets)
  await legal.scrollIntoViewIfNeeded()
  await shot('signin-legal-320x420')

  await signIn.click()
  await page.getByRole('alert').filter({ hasText: 'Please enter both' }).waitFor()
  check('Empty submission is announced without a network request', requests.length === 0)
  check('Missing username receives focus and invalid state', await username.evaluate(
    el => el === document.activeElement && el.getAttribute('aria-invalid') === 'true',
  ))
  await username.fill(student.username)
  await signIn.click()
  check('Missing password receives focus', await password.evaluate(el => el === document.activeElement))
  await password.fill(samplePassword)

  await showPassword.click()
  const pointerFocus = await password.evaluate(el => el.type === 'text' && el === document.activeElement)
  check('Pointer reveal preserves password and returns focus to the field', pointerFocus && await password.inputValue() === samplePassword)
  await hidePassword.click()
  await showPassword.focus()
  await page.keyboard.press('Enter')
  const revealFocus = await hidePassword.evaluate(el => el === document.activeElement)
  check('Keyboard reveal retains control focus and updates its name', revealFocus && await password.inputValue() === samplePassword)
  await page.keyboard.press('Space')
  const hideFocus = await showPassword.evaluate(el => el === document.activeElement)
  check('Keyboard can hide password again without moving focus',
    hideFocus && await password.getAttribute('type') === 'password' && await password.inputValue() === samplePassword,
  )

  const remember = page.getByRole('checkbox', { name: 'Remember me for 7 days', exact: true })
  await remember.focus()
  await page.keyboard.press('Space')
  check('Remember control toggles with keyboard', !await remember.isChecked())
  await signIn.click()
  await authError.waitFor()
  check('Authentication error remains visible with entered values',
    await password.inputValue() === samplePassword && await username.inputValue() === student.username,
  )
  check('Authentication request contract is preserved',
    requests.length === 1 && requests[0].rememberMe === false
    && Object.keys(requests[0]).sort().join(',') === 'password,rememberMe,username',
  )
  await authError.scrollIntoViewIfNeeded()
  await shot('signin-invalid-320x420')

  mode = 'network'
  await signIn.click()
  await page.getByRole('alert').filter({ hasText: 'Network error. Please try again.' }).waitFor()
  check('Network error permits retry without clearing credentials', await signIn.isEnabled() && await password.inputValue() === samplePassword)
  mode = 'slow'
  const before = requests.length
  await signIn.click()
  await page.waitForFunction(() => document.querySelector('button[type="submit"]').disabled)
  await password.press('Enter')
  await page.waitForTimeout(150)
  check('Pending login prevents duplicate requests', requests.length === before + 1)
  await shot('signin-pending-320x420')
  release()
  await authError.waitFor()

  const hasDemo = await page.getByRole('button', { name: 'Test Student Login', exact: true }).count()
  const hasFaceId = await page.getByRole('button', { name: /Face ID/i }).count()
  check('Production sign-in excludes mock demo and Face ID controls', !hasDemo && !hasFaceId)
  mode = 'success'
  await password.press('Enter')
  await page.getByRole('heading', { name: 'Welcome back, Alexandra!' }).waitFor({ timeout: 60000 })
  await page.waitForFunction(() => {
    const nav = document.querySelector('[data-student-mobile-nav] button')
    if (!nav) return false
    const box = nav.getBoundingClientRect()
    return nav.contains(document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2))
  }, {}, { timeout: 60000 })
  check('Keyboard submission reaches the student portal after transition', page.url().includes('/student/' + student.username))
  check('No unexpected client errors', result.errors.length === 0, result.errors)
} catch (error) {
  result.failure = { message: error.message, stack: error.stack }
  check('Verification completed', false, error.message)
  const page = context?.pages()[0]
  if (page) await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {})
} finally {
  result.finishedAt = new Date().toISOString()
  save()
  if (context) await context.close()
  await browser.close()
}

const passed = result.checks.filter(check => check.pass).length
const failed = result.checks.length - passed
console.log(JSON.stringify({ passed, failed, failure: result.failure?.message }))
process.exitCode = failed ? 1 : 0
