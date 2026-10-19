'use client'

import { BranchRedirect } from '../BranchRedirect'
import { BrandBloom } from './BrandBloom'
import { PortalSweep } from './PortalSweep'
import { WorkspaceAssemble } from './WorkspaceAssemble'
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
 * AnimationLab preview.
 */
export function VariantStage({ variant, branch, username, onComplete }: VariantStageProps) {
  switch (variant) {
    case 'bloom':
      return <BrandBloom branch={branch} username={username} onComplete={onComplete} />
    case 'sweep':
      return <PortalSweep branch={branch} onComplete={onComplete} />
    case 'assemble':
      return <WorkspaceAssemble branch={branch} username={username} onComplete={onComplete} />
    default:
      return <BranchRedirect branch={branch} onComplete={onComplete} />
  }
}
