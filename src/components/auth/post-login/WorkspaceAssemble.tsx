'use client'

import { useEffect } from 'react'
import { ASSEMBLE_ENTRANCE_MS } from '@/components/portal/assemble-entrance'

interface WorkspaceAssembleProps {
  onComplete: () => void
}

// Option C — "Workspace Assemble" (stage two, refined).
//
// Stage two paints no surface of its own: it is the moment the REAL
// portal assembles. PostLoginTransition mounts this coordinator
// right after the gated redirect stage confirmed the portal's
// initial data has actually landed; the reveal it hands to the page
// (see portal/assemble-entrance.tsx) makes the actual dashboard
// chrome — the same sidebar, topbar, and content column the user is
// about to use — animate into its final positions while the redirect
// overlay exits over it. Nothing is replaced at the end, because
// nothing here was ever a copy.
//
// This component itself only:
//   - announces the transition to assistive tech (the overlay that
//     carried the step status is exiting), and
//   - holds the post-login state open for the entrance choreography
//     (ASSEMBLE_ENTRANCE_MS), then completes so the page tears the
//     transition down and later navigation uses the standard
//     entrance.
//
// The timing is looks, not readiness — readiness was settled before
// stage two began, and the portal underneath is already the real,
// interactive dashboard while this runs: nothing here renders a
// surface or blocks pointer events, so the workspace is usable the
// moment the redirect overlay's exit fade ends.
//
// Reduced motion is handled upstream (PostLoginTransition skips the
// alternatives entirely, and MotionConfig reducedMotion="user" in
// the shell degrades any residual transform to opacity).
export function WorkspaceAssemble({ onComplete }: WorkspaceAssembleProps) {
  useEffect(() => {
    const t = setTimeout(onComplete, ASSEMBLE_ENTRANCE_MS)
    return () => clearTimeout(t)
  }, [onComplete])

  return (
    <span role="status" className="sr-only">
      Preparing your portal…
    </span>
  )
}
