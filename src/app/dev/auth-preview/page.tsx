'use client'

import dynamic from 'next/dynamic'
import { notFound } from 'next/navigation'

// ============================================================
//  /dev/auth-preview — the dev-only test surface for the sign-in
//  progress animation. Production builds fold the guard to a 404
//  and drop the preview loader entirely (the NODE_ENV constant
//  folds the dynamic import away), so none of this is reachable —
//  or fetched — in a deployed login flow.
// ============================================================

const AuthPreview = process.env.NODE_ENV === 'development'
  ? dynamic(() => import('./AuthPreview').then((m) => m.AuthPreview), { ssr: false })
  : null

export default function DevAuthPreviewPage() {
  if (process.env.NODE_ENV !== 'development') notFound()
  if (!AuthPreview) return null
  return <AuthPreview />
}
