// Isolated working-source UI preview. No checkout environment files or school data.
import { cpSync, existsSync, mkdirSync, mkdtempSync, symlinkSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn } from 'node:child_process'
import { localEnv } from '../onboarding/isolated-source.mjs'

const root = resolve(import.meta.dirname, '../..')
if (process.argv.length !== 2) throw new Error('Unexpected preview arguments')
const source = mkdtempSync(resolve(tmpdir(), 'aics-mobile-ux-'))
mkdirSync(resolve(root, '.phase2-local/mobile-ux'), { recursive: true })
for (const file of ['src', 'public', '.gitignore', 'package.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs', 'tailwind.config.ts']) {
  if (existsSync(resolve(root, file))) cpSync(resolve(root, file), resolve(source, file), { recursive: true })
}
symlinkSync(resolve(root, 'node_modules'), resolve(source, 'node_modules'), 'junction')
const server = spawn(process.execPath, [resolve(root, 'node_modules/next/dist/bin/next'), 'dev', '--webpack', '-H', 'localhost', '-p', '4350'], {
  cwd: source, env: { ...localEnv('development'), NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve(root, 'scripts/mobile/cached-fonts.cjs') }, stdio: 'inherit', windowsHide: true,
})
writeFileSync(resolve(root, '.phase2-local/mobile-ux/preview.json'), JSON.stringify({ source, port: 4350, pid: server.pid, startedAt: new Date().toISOString() }, null, 2))
console.log(`Isolated source: ${source}`)
server.on('exit', code => process.exit(code ?? 1))
process.on('SIGINT', () => server.kill())
process.on('SIGTERM', () => server.kill())
