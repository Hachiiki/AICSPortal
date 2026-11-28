import { fileTypeFromBuffer } from 'file-type'
import { HttpError } from './http'

export async function verifyRawUpload(url: string, bytes: number, format: string): Promise<void> {
  // The caller has already checked the exact Cloudinary cloud, resource,
  // public ID and file size. Download the original without redirects.
  let body: ReadableStream<Uint8Array>
  try {
    const response = await fetch(url, {
      cache: 'no-store',
      redirect: 'error',
      signal: AbortSignal.timeout(12_000),
    })
    if (!response.ok || !response.body) throw new Error('File unavailable.')
    body = response.body
  } catch {
    throw new HttpError(503, 'The uploaded file could not be read. Try again shortly.')
  }

  const reader = body.getReader()
  const buffer = Buffer.alloc(bytes)
  let length = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (length + value.byteLength > bytes) {
        throw new HttpError(415, 'The uploaded file size does not match its metadata.')
      }
      buffer.set(value, length)
      length += value.byteLength
    }
  } catch (error) {
    if (error instanceof HttpError) throw error
    throw new HttpError(503, 'The uploaded file could not be read. Try again shortly.')
  } finally {
    void reader.cancel().catch(() => {})
    reader.releaseLock()
  }

  if (length !== bytes || !await matchesRawFormat(buffer, format)) {
    throw new HttpError(415, 'The uploaded file content does not match the selected format.')
  }
}

export async function matchesRawFormat(bytes: Buffer, format: string): Promise<boolean> {
  if (bytes.length === 0) return false
  try {
    if (format === 'txt' || format === 'csv') {
      const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      return !/[\p{Cc}]/u.test(text.replace(/[\t\r\n]/g, ''))
    }
    if (format === 'zip') {
      const signature = bytes.subarray(0, 4).toString('hex')
      return signature === '504b0304' || signature === '504b0506'
    }
    const actual = await fileTypeFromBuffer(bytes)
    // Older Word, PowerPoint and Excel files share the legacy OLE container.
    if (['doc', 'ppt', 'xls'].includes(format)) return actual?.ext === 'cfb'
    return actual?.ext === format
  } catch {
    return false
  }
}
