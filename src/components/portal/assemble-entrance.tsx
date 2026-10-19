'use client'

import { createContext, useContext, type ReactNode } from 'react'
import type { MotionProps } from 'framer-motion'

// ============================================================
//  Workspace assembly entrance — the reveal contract between the
//  post-login transition (auth/post-login) and the real portal
//  chrome (PortalShell / Sidebar / Topbar).
//
//  The assemble candidate's stage two paints no surface of its own:
//  the REAL dashboard — mounted underneath the redirect overlay
//  since login succeeded, its initial data confirmed landed by the
//  gated stage one — animates its actual chrome into place. This
//  module is the single source of truth for that choreography, so
//  the animation and the final dashboard can never drift apart.
//
//  - AssembleRevealProvider is mounted by page.tsx around the
//    portal wrapper for the whole session — never conditionally,
//    because a wrapper remount would refetch everything. A `null`
//    value deactivates the entrance: every consumer renders exactly
//    as it did before this module existed (production default,
//    normal navigation, the other candidates).
//  - An active value stages the chrome at its entrance offsets.
//    The held state animates to the offset itself, so the component
//    stays invisible under the still-opaque redirect overlay and
//    there is nothing to coordinate at mount time: flipping
//    `revealing` to true is a plain animate-target change, and the
//    entrance plays precisely then — no timers, no remounts, no
//    flash. Framer's MotionConfig reducedMotion="user" (PortalShell)
//  - The lab preview (PreviewReadySurface) consumes the same
//    constants, so the dev harness matches sign-in behavior.
// ============================================================

export interface AssembleRevealState {
  revealing: boolean
}

const AssembleRevealContext = createContext<AssembleRevealState | null>(null)

/** Always-mounted provider. `revealing: null` deactivates the entrance. */
export function AssembleRevealProvider({
  revealing,
  children,
}: {
  revealing: boolean | null
  children: ReactNode
}) {
  const value = revealing === null ? null : { revealing }
  return <AssembleRevealContext.Provider value={value}>{children}</AssembleRevealContext.Provider>
}

/** The reveal state driving the current render, or null when the
 *  workspace-assembly entrance is not active. */
export function useAssembleReveal(): AssembleRevealState | null {
  return useContext(AssembleRevealContext)
}

// Choreography — the rhythm the retired ghost overlay established:
// the sidebar rail slides in from the left, the topbar drops, then
// the content column cascades up through the redirect overlay's
// exit fade. Durations and delays are looks, not readiness —
// readiness was settled before stage two began.
const RESTING = { x: 0, y: 0, opacity: 1 }
const FROM = {
  sidebar: { x: -48, opacity: 0 },
  topbar: { y: -28, opacity: 0 },
  content: { y: 14, opacity: 0 },
} as const

export const ASSEMBLE_TRANSITIONS = {
  sidebar: { duration: 0.45, ease: 'easeOut' },
  topbar: { duration: 0.4, ease: 'easeOut', delay: 0.08 },
  content: { duration: 0.4, ease: 'easeOut', delay: 0.28 },
} as const

type EntranceProps = Pick<MotionProps, 'initial' | 'animate' | 'transition'>

/**
 * Motion props for one chrome region. Inactive reveal → the region
 * mounts at rest with no entrance (today's behavior). Active → the
 * region mounts staged at its offset and animates only when the
 * reveal flips; the held state animates to the offset itself so
 * nothing is visible under the still-opaque redirect overlay.
 */
export function assembleEntrance(
  region: keyof typeof FROM,
  reveal: AssembleRevealState | null
): EntranceProps {
  const from = FROM[region]
  if (!reveal) return { initial: false, animate: RESTING }
  return {
    initial: from,
    animate: reveal.revealing ? RESTING : from,
    transition: ASSEMBLE_TRANSITIONS[region],
  }
}

/** How long stage two holds the post-login state open: the entrance
 *  choreography (the content column settles at ~0.68 s) plus a short
 *  settle. Purely visual bookkeeping — the portal underneath is
 *  already the real, interactive dashboard while this runs. */
export const ASSEMBLE_ENTRANCE_MS = 1000
