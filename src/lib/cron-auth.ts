import { createHash, timingSafeEqual } from 'node:crypto'

export function hasCronBearer(headers: Headers): boolean {
  const secret = process.env.CRON_SECRET
  const authorization = headers.get('authorization')
  if (!secret || !authorization) return false
  const digest = (value: string) => createHash('sha256').update(value).digest()
  return timingSafeEqual(digest(authorization), digest(`Bearer ${secret}`))
}
