import { execFileSync } from 'node:child_process'
import { openSync, closeSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

// Child of an owned Windows job. Output files are private to this run.
const [source, output] = process.argv.slice(2)
const fd = openSync(resolve(output, 'build.log'), 'wx')
let code = 0, signal = null
const quality = []
const staticGates = process.env.A1_STATIC_GATES === '1'
try {
  if (staticGates) {
    for (const [name, args] of [['lint', ['run', 'lint']], ['typecheck', ['run', 'typecheck']], ['build', ['run', 'build', '--', '--webpack']]]) {
      const outputFd = name === 'build' ? fd : openSync(resolve(output, name + '.log'), 'wx')
      const record = { name, command: ['npm', ...args], startedAt: new Date().toISOString(), exitCode: null }
      quality.push(record)
      try {
        execFileSync('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], { cwd: source, env: process.env, stdio: ['ignore', outputFd, outputFd], windowsHide: true, timeout: 900000 })
        record.exitCode = 0
      } catch (error) { record.exitCode = error.status ?? 1; throw error }
      finally { record.finishedAt = new Date().toISOString(); if (outputFd !== fd) closeSync(outputFd) }
    }
  } else {
    execFileSync(process.execPath, [resolve(source, 'node_modules/next/dist/bin/next'), 'build', '--webpack'],
      { cwd: source, env: process.env, stdio: ['ignore', fd, fd], windowsHide: true })
  }
} catch (error) {
  code = error.status ?? 1
  signal = error.signal ?? null
} finally {
  closeSync(fd)
  if (staticGates) writeFileSync(resolve(output, 'quality-result.json'), JSON.stringify(quality, null, 2))
  writeFileSync(resolve(output, 'build-result.json'), JSON.stringify({ exitCode: code, signal, compiler: 'webpack', command: staticGates ? ['npm', 'run', 'build', '--', '--webpack'] : ['next', 'build', '--webpack'] }))
}
