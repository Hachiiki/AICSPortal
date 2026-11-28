import { expect, test } from 'bun:test'
import { matchesRawFormat } from './raw-upload'

test('checks raw file signatures independently of the declared extension', async () => {
  const pdf = Buffer.from('%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n')
  expect(await matchesRawFormat(pdf, 'pdf')).toBe(true)
  expect(await matchesRawFormat(Buffer.from('Course handout'), 'pdf')).toBe(false)
})

test('accepts UTF-8 table text and rejects binary data for text formats', async () => {
  expect(await matchesRawFormat(Buffer.from('topic,week\nScheduling,1\n'), 'csv')).toBe(true)
  expect(await matchesRawFormat(Buffer.from([0xff, 0x00]), 'txt')).toBe(false)
})
