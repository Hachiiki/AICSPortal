// Shared HTTP body validation — prevents NoSQL operator injection (BUG-001, BUG-010).
//
// Next.js query-string params are always strings, but JSON body fields arrive
// with attacker-controlled types. Any object passed straight into a Mongo
// filter becomes query operators ($ne, $regex, ...). Every body field that
// reaches a filter must go through asString() first.

export class HttpError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function asString(v: unknown, field: string): string {
  if (typeof v !== 'string' || v.length === 0) {
    throw new HttpError(400, `${field} is required and must be a non-empty string.`)
  }
  return v
}

export function asOptionalString(v: unknown, field: string): string | undefined {
  if (v === undefined || v === null) return undefined
  if (typeof v !== 'string') {
    throw new HttpError(400, `${field} must be a string.`)
  }
  return v
}

export function asStringArray(v: unknown, field: string): string[] {
  if (!Array.isArray(v)) {
    throw new HttpError(400, `${field} must be an array of strings.`)
  }
  for (const item of v) {
    if (typeof item !== 'string') {
      throw new HttpError(400, `${field} must be an array of strings.`)
    }
  }
  return v as string[]
}
