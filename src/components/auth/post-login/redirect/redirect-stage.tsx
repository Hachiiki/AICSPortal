'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { BranchRedirect } from '../../BranchRedirect'
import { AUTH_VARIANT_IDS, type AuthStageProps, type AuthVariant } from './types'

// ============================================================
//  Stage one's presentation switch.
//
//  Every real sign-in renders the production default — the classic
//  BranchRedirect. The three review variants are reachable only
//  through a development preview selection (see /dev/auth-preview),
//  which stores its choice under aics.authVariant; the loader below
//  is folded out of production builds entirely, so the normal
//  production login flow is untouched by the review.
// ============================================================

// The dev-only review bundle (the three variants). Loaded lazily and
// only when a development selection actually asks for one; the
// NODE_ENV constant folds the loader itself away in production
// builds, so its chunk is never even referenced there.
const DevVariants = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('./dev-variants'), { ssr: false })
  : null

const STORAGE_KEY = 'aics.authVariant'

/** The presentation a dev preview stored for real sign-ins —
 *  'classic' in production, for stale or unknown values, and when
 *  storage is unavailable. */
export function readDevAuthVariant(): AuthVariant {
  if (process.env.NODE_ENV !== 'development') return 'classic'
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY) as AuthVariant | null
    return stored !== null && AUTH_VARIANT_IDS.includes(stored) ? stored : 'classic'
  } catch {
    return 'classic'
  }
}

/** Store the preview selection for the next real sign-in (dev only —
 *  a no-op everywhere else). Used by the /dev/auth-preview page. */
export function writeDevAuthVariant(variant: AuthVariant): void {
  if (process.env.NODE_ENV !== 'development') return
  try {
    window.localStorage.setItem(STORAGE_KEY, variant)
  } catch {
    // Storage unavailable — the next sign-in keeps the default.
  }
}

/** Clear the preview selection; the next real sign-in uses the
 *  production default (dev only). */
export function clearDevAuthVariant(): void {
  if (process.env.NODE_ENV !== 'development') return
  try {
    window.localStorage.removeItem(STORAGE_KEY)
  } catch {
    // Storage unavailable — nothing to clear.
  }
}

/** Stage one of the post-login transition in whichever presentation
 *  applies: the production classic sequence for every real sign-in,
 *  or the development review variant while one is selected. All
 *  presentations share useAuthSequence, so only the look differs. */
export function AuthStage(props: AuthStageProps) {
  const [variant] = useState<AuthVariant>(() => readDevAuthVariant())
  if (variant === 'classic' || !DevVariants) return <BranchRedirect {...props} />
  return <DevVariants variant={variant} {...props} />
}
