// Verify an isolated working-source snapshot without reading checkout env files.
import { cpSync, existsSync, mkdirSync, mkdtempSync, openSync, closeSync, readFileSync, readdirSync, symlinkSync, writeFileSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import { tmpdir } from 'node:os'
import { spawn, execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { localEnv } from '../onboarding/isolated-source.mjs'

const root = resolve(import.meta.dirname, '../..')
if (process.argv.length > 3 || process.argv[2] && process.argv[2] !== '--reuse') throw new Error('Use --reuse or no arguments')
const previous = process.argv[2] ? JSON.parse(readFileSync(resolve(root, '.phase2-local/mobile-ux/quality.json'))) : null
const source = previous?.source || mkdtempSync(resolve(tmpdir(), 'aics-mobile-quality-'))
if (previous && (!source.startsWith(resolve(tmpdir(), 'aics-mobile-quality-')) || !existsSync(resolve(source, '.next/BUILD_ID')))) throw new Error('Invalid previously verified snapshot')
const output = resolve(root, '.phase2-local/mobile-ux', `quality-${Date.now()}`)
mkdirSync(output, { recursive: true })
const inputs = ['src', 'public', '.gitignore', 'package.json', 'tsconfig.json', 'next.config.ts', 'next-env.d.ts', 'postcss.config.mjs', 'eslint.config.mjs']
for (const file of inputs) if (existsSync(resolve(root, file))) cpSync(resolve(root, file), resolve(source, file), { recursive: true })
if (!previous) symlinkSync(resolve(root, 'node_modules'), resolve(source, 'node_modules'), 'junction')
const records = []
function record(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const file = resolve(dir, entry.name)
    if (entry.isDirectory()) record(file)
    else records.push({ path: relative(source, file).replaceAll('\\', '/'), sha256: createHash('sha256').update(readFileSync(file)).digest('hex') })
  }
}
for (const dir of ['src', 'public']) record(resolve(source, dir))
const result = { source, output, startedAt: new Date().toISOString(), head: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(), records, commands: [], fontInput: 'Existing build font CSS and exact local woff2 bytes; no source font substitutions' }
const save = () => {
  writeFileSync(resolve(output, 'result.json'), JSON.stringify(result, null, 2))
  writeFileSync(resolve(root, '.phase2-local/mobile-ux/quality.json'), JSON.stringify({ source, output, pid: process.pid }, null, 2))
}
save()
for (const [name, args] of [['lint', ['run', 'lint']], ['typecheck', ['run', 'typecheck']], ['build', ['run', 'build', '--', '--webpack']]]) {
  const fd = openSync(resolve(output, `${name}.log`), 'wx')
  const command = { name, command: ['npm', ...args], startedAt: new Date().toISOString(), exitCode: null }
  result.commands.push(command)
  const child = spawn('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], { cwd: source, env: { ...localEnv(), NEXT_FONT_GOOGLE_MOCKED_RESPONSES: resolve(root, 'scripts/mobile/cached-fonts.js') }, stdio: ['ignore', fd, fd], windowsHide: true })
  command.pid = child.pid; save()
  command.exitCode = await new Promise((resolve, reject) => { child.on('exit', code => resolve(code)); child.on('error', reject) })
  closeSync(fd)
  command.finishedAt = new Date().toISOString(); save()
  console.log(`${name}: ${command.exitCode}`)
  if (command.exitCode !== 0) process.exit(command.exitCode ?? 1)
}
result.finishedAt = new Date().toISOString(); save()
