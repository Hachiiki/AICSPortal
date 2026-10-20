'use client'

import type { ComponentType } from 'react'
import { BranchRedirect } from '../../BranchRedirect'
import { RouteTrailVariant } from './RouteTrailVariant'
import type { AuthStageProps, AuthVariant } from './types'

// ============================================================
//  The development review bundle for stage one — the Route Trail
//  presentation. Reached only through the preview selection in
//  redirect-stage (aics.authVariant, dev builds only); a production
//  sign-in never loads this module. Classic is the fallback for any
//  unknown value, so a stale selection (including one of the
//  retired variant ids) can never break a sign-in.
// ============================================================

const VARIANTS: Partial<Record<AuthVariant, ComponentType<AuthStageProps>>> = {
  'route-trail': RouteTrailVariant,
}

export default function DevVariantStage({
  variant,
  ...props
}: AuthStageProps & { variant: AuthVariant }) {
  const Component = VARIANTS[variant]
  if (!Component) return <BranchRedirect {...props} />
  return <Component {...props} />
}
