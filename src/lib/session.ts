// Server session layer (Phase 6 — fixes BUG-004/005/009).
//
// Login issues a signed JWT in an httpOnly cookie; every API route derives
// identity from `getSession(request)` instead of caller-supplied
// `username`/`performedBy` strings. Edge-compatible (jose, no node:crypto).

import { jwtVerify, SignJWT } from 'jose'
import type { NextRequest } from 'next/server'

export const SESSION_COOKIE = 'aics_session'
export const SESSION_MAX_AGE_SECS = 8 * 60 * 60 // 8h

export interface SessionClaims {
  username: string
  role: string
  branch: string
}

const DEV_FALLBACK_SECRET = 'dev-only-insecure-secret-change-in-production'

function getAuthSecret(): Uint8Array {
  const configured = process.env.AUTH_SECRET
  if (configured && configured.length >= 16) return new TextEncoder().encode(configured)
  if (process.env.NODE_ENV === 'production') {
    throw new Error('AUTH_SECRET is not set. Set a 16+ char secret in production.')
  }
  console.warn('[auth] AUTH_SECRET missing — using insecure dev fallback. Set AUTH_SECRET for any shared deploy.')
  return new TextEncoder().encode(DEV_FALLBACK_SECRET)
}

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ role: claims.role, branch: claims.branch })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(claims.username)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECS}s`)
    .sign(getAuthSecret())
}

export async function verifySessionToken(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, getAuthSecret())
    if (typeof payload.sub !== 'string' || !payload.sub) return null
    if (typeof payload.role !== 'string' || !payload.role) return null
    if (typeof payload.branch !== 'string' || !payload.branch) return null
    return { username: payload.sub, role: payload.role, branch: payload.branch }
  } catch {
    return null
  }
}

export async function getSession(request: NextRequest): Promise<SessionClaims | null> {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  return verifySessionToken(token)
}

export function sessionCookie(token: string) {
  return {
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECS,
  }
}

export function clearSessionCookie() {
  return {
    name: SESSION_COOKIE,
    value: '',
    httpOnly: true as const,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  }
}

// No dual-auth paths: when a caller also supplies an identity string
// (legacy `username`/`performedBy`), it must match the session or the
// request is a spoof attempt. Returns an error message or null when clean.
export function spoofCheck(session: SessionClaims, claimed: unknown): string | null {
  if (claimed === undefined || claimed === null) return null
  if (typeof claimed !== 'string') return 'Invalid identity field.'
  if (claimed !== session.username) return 'Identity mismatch.'
  return null
}
