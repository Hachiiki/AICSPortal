'use client'

import type { ComponentType } from 'react'
import { BranchRedirect } from '../../BranchRedirect'
import { RouteTrailVariant } from './RouteTrailVariant'
import { SignalLedgerVariant } from './SignalLedgerVariant'
import { FocusStagesVariant } from './FocusStagesVariant'
import { OrbitVariant } from './OrbitVariant'
import { BootConsoleVariant } from './BootConsoleVariant'
import { IdPassVariant } from './IdPassVariant'
import { ThresholdVariant } from './ThresholdVariant'
import { WireframeVariant } from './WireframeVariant'
import { HairlineVariant } from './HairlineVariant'
import { WordmarkVariant } from './WordmarkVariant'
import { InlineButtonVariant } from './InlineButtonVariant'
import type { AuthStageProps, AuthVariant } from './types'

// ============================================================
//  The development review bundle for stage one — the variant
//  presentations. Reached only through the preview selection in
//  redirect-stage (aics.authVariant, dev builds only); a production
//  sign-in never loads this module. Classic is the fallback for any
//  unknown value, so a stale selection can never break a sign-in.
// ============================================================

const VARIANTS: Partial<Record<AuthVariant, ComponentType<AuthStageProps>>> = {
  'route-trail': RouteTrailVariant,
  'signal-ledger': SignalLedgerVariant,
  'focus-stages': FocusStagesVariant,
  orbit: OrbitVariant,
  'boot-console': BootConsoleVariant,
  'id-pass': IdPassVariant,
  threshold: ThresholdVariant,
  wireframe: WireframeVariant,
  hairline: HairlineVariant,
  wordmark: WordmarkVariant,
  'inline-button': InlineButtonVariant,
}

export default function DevVariantStage({
  variant,
  ...props
}: AuthStageProps & { variant: AuthVariant }) {
  const Component = VARIANTS[variant]
  if (!Component) return <BranchRedirect {...props} />
  return <Component {...props} />
}
