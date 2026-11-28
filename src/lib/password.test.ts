import { expect, test } from 'bun:test'
import { scryptSync } from 'node:crypto'
import { hashPassword, verifyPassword } from './password'

const credential = 'A local unit-test password'
const wrongCredential = 'A different unit-test password'

test('new password hashes use independent salts and verify the original password', async () => {
  const [first, second] = await Promise.all([hashPassword(credential), hashPassword(credential)])
  expect(first).toMatch(/^scrypt\$v2\$/)
  expect(first).not.toBe(second)
  expect(await verifyPassword(credential, first)).toEqual({ ok: true })
  expect(await verifyPassword(wrongCredential, first)).toEqual({ ok: false })
})

test('legacy scrypt and plaintext records upgrade after successful verification', async () => {
  const salt = '4ec59d716d13890715bc59e017e9f8c3'
  const hash = scryptSync(credential, salt, 64).toString('hex')
  for (const stored of [`scrypt$${salt}$${hash}`, credential]) {
    const verification = await verifyPassword(credential, stored)
    expect(verification.ok).toBe(true)
    expect(verification.upgradedHash).toMatch(/^scrypt\$v2\$/)
  }
})
