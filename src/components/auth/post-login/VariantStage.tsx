'use client'

import { BranchRedirect } from '../BranchRedirect'
import { Aperture } from './Aperture'
import { FrameDraw } from './FrameDraw'
import type { PostLoginVariant } from './variants'

interface VariantStageProps {
  variant: PostLoginVariant
  branch: string
  username: string
  onComplete: () => void
}

/**
 * Dumb mapper: variant id → overlay component. 'default' renders the
 * original BranchRedirect, so the production behavior is byte-identical
 * to today. Used by PostLoginTransition for the default and the
 * single-stage candidates, and by the AnimationLab preview harness for
 * those candidates. The assemble candidate is NOT mapped here — it is
 * orchestrated as a two-stage sequence inside PostLoginTransition
 * (redirect stage gated on real readiness, then the assembly).
 */
export function VariantStage({ variant, branch, username, onComplete }: VariantStageProps) {
  switch (variant) {
    case 'aperture':
      return <Aperture branch={branch} username={username} onComplete={onComplete} />
    case 'framedraw':
      return <FrameDraw branch={branch} username={username} onComplete={onComplete} />
    default:
      return <BranchRedirect branch={branch} onComplete={onComplete} />
  }
}
