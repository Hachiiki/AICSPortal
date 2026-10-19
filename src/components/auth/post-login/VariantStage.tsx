'use client'

import { BranchRedirect } from '../BranchRedirect'
import { WorkspaceAssemble } from './WorkspaceAssemble'
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
 * to today. Used by both PostLoginTransition (real sign-in) and the
 * AnimationLab preview harness.
 */
export function VariantStage({ variant, branch, username, onComplete }: VariantStageProps) {
  switch (variant) {
    case 'assemble':
      return <WorkspaceAssemble branch={branch} username={username} onComplete={onComplete} />
    case 'aperture':
      return <Aperture branch={branch} username={username} onComplete={onComplete} />
    case 'framedraw':
      return <FrameDraw branch={branch} username={username} onComplete={onComplete} />
    default:
      return <BranchRedirect branch={branch} onComplete={onComplete} />
  }
}
