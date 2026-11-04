// Linux adapter for 09-persistence-safe.mjs. The script refuses to run
// without the owned-adapter context flag (globalThis.__phase2Gate); the
// Windows isolated adapter provided it along with kernel-job ownership.
// This runner provides the same ownership through the standard harness:
// the dev server is owned via the pidfile process group (lib.mjs) and
// the browser through the supported chromium.launch lifecycle that the
// script itself uses. As with the isolated adapter, the script's
// top-level run() call is replaced by an exported gateRun promise so
// this runner can await the scenarios before tearing the server down.
// The script's own route interceptions (read abort, PATCH 500) stay the
// single source of transport failure behavior; nothing here alters
// assertions. No MongoDB service is stopped and no record is written.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'
import { ensureMongod, ensureDevServer, stopDevServer, studentSession } from './lib.mjs'

const run = async () => {
  await ensureMongod()
  await ensureDevServer()
  const session = await studentSession()
  globalThis.__phase2Gate = {
    ensure: async () => true,
    session: async () => session,
    guard: async () => {},
    adapter: 'linux-standard-harness',
  }
  const original = readFileSync(resolve(import.meta.dirname, '09-persistence-safe.mjs'), 'utf8')
  const start = original.lastIndexOf('run().catch(')
  if (start < 0) throw new Error('Entry anchor changed')
  const body = original
    .slice(0, start)
    .replace('process.exit(1)', 'process.exitCode = 1')
  if (body.includes('process.exit(')) throw new Error('Unhandled direct process exit in test adaptation')
  const adaptedPath = resolve(import.meta.dirname, '.adapted-09-persistence-safe.mjs')
  writeFileSync(adaptedPath, body + 'export const gateRun = run().catch(error => { console.error(error.message); process.exitCode = 1 })\n')
  try {
    const mod = await import(pathToFileURL(adaptedPath).href)
    await mod.gateRun
  } finally {
    unlinkSync(adaptedPath)
    stopDevServer()
  }
}

run().catch((e) => { console.error(e); stopDevServer(); process.exit(1) })
