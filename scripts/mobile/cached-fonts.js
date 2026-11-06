// CommonJS offline build input: reuse exact font bytes from the prior build.
// This affects local verification only, never application source or deployment.
// eslint-disable-next-line @typescript-eslint/no-require-imports -- Next's synchronous font loader requires CommonJS.
const { readFileSync, readdirSync } = require('node:fs')
// eslint-disable-next-line @typescript-eslint/no-require-imports -- This fixture must be loaded synchronously by Next.
const { resolve } = require('node:path')
const root = resolve(__dirname, '../..')
const dir = resolve(root, '.next/static/chunks')
const faces = readdirSync(dir).filter(f => f.endsWith('.css')).flatMap(f => readFileSync(resolve(dir, f), 'utf8').match(/@font-face\s*\{[^}]+\}/g) || [])
module.exports = new Proxy({}, { get: (_, url) => {
  const family = new URL(url).searchParams.get('family').split(':')[0]
  const selected = faces.filter(face => face.includes(`font-family:${family};`) || face.includes(`font-family:"${family}";`))
  if (!selected.length) throw new Error(`No cached font available for ${family}`)
  return selected.map(face => '/* latin */\n' + face.replace(/url\((?:\.\.\/media\/)([^)]+)\)/g, (_, file) => `url(${resolve(root, '.next/static/media', file).replaceAll('\\', '/').replace(/^[A-Za-z]:/, '')})`)).join('\n')
} })
