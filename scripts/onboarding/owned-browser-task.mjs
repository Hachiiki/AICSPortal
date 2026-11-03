// The owned Node root launches Playwright over its native pipe. All browser
// descendants inherit the non-breakaway Windows job created by the caller.
import { chromium } from 'playwright'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { createHash } from 'node:crypto'

const [directory, portText] = process.argv.slice(2)
const port = Number(portText)
const channel = process.env.GATE_BROWSER_CHANNEL || 'msedge'
if (!directory || !Number.isInteger(port) || port < 1 || port > 65535 || channel !== 'msedge') throw new Error('Unsupported owned browser settings')
const file = name => resolve(directory, name)
let server, closing = false
const stop = async () => {
  if (closing) return
  closing = true
  clearInterval(timer)
  try {
    await server.close()
    writeFileSync(file('browser-stop.json'), JSON.stringify({ closed: true, rootPid: server.process().pid, exitCode: server.process().exitCode }))
  } catch {
    writeFileSync(file('browser-stop.json'), JSON.stringify({ closed: false }))
    process.exitCode = 1
  }
}
let timer
try {
  server = await chromium.launchServer({ channel, headless: true, host: '127.0.0.1', port, timeout: 20000 })
  const proc = server.process()
  writeFileSync(file('browser-execution.json'), JSON.stringify({
    workerPid: process.pid, executable: proc.spawnfile,
    executableSHA256: createHash('sha256').update(readFileSync(proc.spawnfile)).digest('hex'),
    argv: proc.spawnargs, channel, transport: 'Playwright native pipe inside an owned Node job root', rootPid: proc.pid,
  }, null, 2))
  // Ephemeral connection capability. Do not include this file in evidence ZIPs.
  writeFileSync(file('browser-endpoint.local.json'), JSON.stringify({ endpoint: server.wsEndpoint() }), { flag: 'wx' })
  timer = setInterval(() => { if (existsSync(file('browser-stop.request'))) void stop() }, 100)
} catch {
  if (server) await stop()
  writeFileSync(file('browser-start-failed.json'), JSON.stringify({ failed: true }))
  process.exitCode = 1
}
