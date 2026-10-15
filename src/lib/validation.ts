// Shared request-input validation (Zod) — the single entry point every
// API route uses to parse JSON bodies and query strings.
//
// Why this exists: handlers previously destructured raw `request.json()`
// and hand-rolled field-by-field checks. One declarative Zod schema per
// endpoint now gives: inferred types, unknown-key stripping, NoSQL
// operator rejection (objects never reach Mongo filters), and a single
// readable 400 on bad input instead of a 500 from a TypeError deeper
// in the handler.
//
// Contract: parseBody/parseQuery throw HttpError(400) on any bad input,
// so handlers must re-throw HttpError from their catch blocks:
//   catch (err) {
//     if (err instanceof HttpError) return errResponse(err)
//     ...
//   }

import type { NextRequest } from 'next/server'
import { z, ZodError, type ZodType } from 'zod'
import { HttpError } from './http'

/** First Zod issue as `field: message` — stable, log-safe, no internals leaked. */
export function zodMessage(err: ZodError): string {
  const issue = err.issues[0]
  if (!issue) return 'Invalid request.'
  const where = issue.path.length ? `${issue.path.join('.')}: ` : ''
  return `${where}${issue.message}`
}

/**
 * Parse a JSON request body against a schema.
 * - malformed JSON  -> 400 "Request body must be valid JSON."
 * - schema mismatch -> 400 with the first issue as a readable message
 * - success         -> the typed, unknown-key-stripped payload
 */
export async function parseBody<T>(request: NextRequest, schema: ZodType<T>): Promise<T> {
  let raw: unknown
  try {
    raw = await request.json()
  } catch {
    throw new HttpError(400, 'Request body must be valid JSON.')
  }
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error))
  return parsed.data
}

/**
 * Parse a request's search params against a schema. Values arrive as
 * strings (repeated keys become arrays); the schema coerces/validates
 * them exactly like a body. Missing optional keys stay undefined.
 */
export function parseQuery<T>(request: NextRequest, schema: ZodType<T>): T {
  const raw: Record<string, string | string[]> = {}
  request.nextUrl.searchParams.forEach((value, key) => {
    const prev = raw[key]
    if (prev === undefined) raw[key] = value
    else if (Array.isArray(prev)) prev.push(value)
    else raw[key] = [prev as string, value]
  })
  const parsed = schema.safeParse(raw)
  if (!parsed.success) throw new HttpError(400, zodMessage(parsed.error))
  return parsed.data
}

// ---------------------------------------------------------------------------
// Shared primitives — mirrors of the checks every route used to hand-roll.
// Route-specific schemas live beside their handlers; only widely-shared
// shapes live here.
// ---------------------------------------------------------------------------

/** Mongo ObjectId as a 24-hex string (garbage here fails parse with 400, not a thrown ObjectId constructor). */
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, { message: 'Must be a valid id.' })

/** `?id=<objectId>` — the DELETE/query-by-id shape used across admin CRUD. */
export const idQuerySchema = z.object({ id: objectIdSchema })

/** `?username=<self>` — the session-fallback pattern used by read routes. */
export const selfQuerySchema = z.object({ username: z.string().optional() })

/** Session usernames (also used as directory keys): plain, bounded strings. */
export const usernameSchema = z.string().min(1, { message: 'Username is required.' }).max(64)

/** A title-ish required string: raw length cap, trimmed to non-empty. */
export function trimmedString(max: number, label: string) {
  return z
    .string({ error: `${label} is required.` })
    .max(max, { message: `${label} must be 1-${max} characters.` })
    .trim()
    .min(1, { message: `${label} must be 1-${max} characters.` })
}

/**
 * A date-ish input field.
 * - string/Date -> coerced to a real Date (invalid strings fail with `label`)
 * - null/''     -> null (used by optional dates to mean "clear")
 */
export function dateInput(label: string) {
  return z.preprocess(
    (v) => (v === '' ? null : v),
    z.nullable(z.coerce.date({ error: `${label} must be a valid date.` }))
  )
}

/** Standard 400 response for a caught HttpError (keeps handlers terse). */
export function errResponse(err: HttpError) {
  return Response.json({ ok: false, error: err.message }, { status: err.status })
}
