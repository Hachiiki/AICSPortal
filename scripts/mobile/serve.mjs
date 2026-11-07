// Serve only a successfully verified isolated UI build, with local-only settings.
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { spawn } from 'node:child_process'
import { localEnv } from '../onboarding/isolated-source.mjs'

const root = resolve(import.meta.dirname, '../..')
const metadata = JSON.parse(readFileSync(resolve(root, '.phase2-local/mobile-ux/quality.json')))
const result = JSON.parse(readFileSync(resolve(metadata.output, 'result.json')))
if (result.commands.length !== 3 || result.commands.some(command => command.exitCode !== 0)) throw new Error('Verified build required')
for (const file of ['.env', '.env.local', '.env.production', '.env.production.local']) if (existsSync(resolve(metadata.source, file))) throw new Error('Unexpected environment file')
const child = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'start', '-H', 'localhost', '-p', '4350'], { cwd: metadata.source, env: localEnv(), stdio: 'inherit', windowsHide: true })
console.log(`Verified source: ${metadata.source}`)
console.log(`Owned server PID: ${child.pid}`)
child.on('exit', code => process.exit(code ?? 1))
process.on('SIGINT', () => child.kill())
