'use client'

import { useEffect, useState } from 'react'
import { useReducedMotion } from 'framer-motion'
import { SHOW_POST_LOGIN_PREVIEW } from '../login-tokens'
import { VariantStage } from './VariantStage'
import { readStoredVariant } from './variants'

interface PostLoginTransitionProps {
  branch: string
  username: string
  onComplete: () => void
}

/**
 * The post-login redirect overlay — a drop-in replacement for the old
 * direct <BranchRedirect> render in page.tsx.
 *
 * Production always renders the original BranchRedirect: the dev gate
 * (SHOW_POST_LOGIN_PREVIEW) compiles to a constant false there, which
 * also lets the bundler dead-code-eliminate the alternative animation
 * components from the client bundle. In development, the AnimationLab
 * selection picks one of the three alternatives for review; the owner
 * has not chosen a winner yet, so 'default' remains the behavior unless
 * a variant is explicitly selected.
 *
 * Reduced motion: the alternatives are skipped entirely — the user goes
 * straight to the portal. (The default BranchRedirect keeps its
 * existing, unchanged behavior.)
 */
export function PostLoginTransition({ branch, username, onComplete }: PostLoginTransitionProps) {
  const reduced = useReducedMotion()
  const [variant] = useState(() => (SHOW_POST_LOGIN_PREVIEW ? readStoredVariant() : 'default'))
  const skip = variant !== 'default' && !!reduced

  useEffect(() => {
    if (skip) onComplete()
  }, [skip, onComplete])

  if (skip) return null

  return (
    <VariantStage variant={variant} branch={branch} username={username} onComplete={onComplete} />
  )
}
