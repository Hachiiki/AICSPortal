'use client'

import type { View } from '@/lib/aics/types'
import { Sidebar } from '../portal/Sidebar'

// Deprecated. Use PortalShell with role faculty instead. Kept so older
// imports keep working while pages migrate to the single shell.
interface FacultySidebarProps {
  active: View
  onNavigate: (view: View) => void
  mobileOpen: boolean
  onMobileClose: () => void
}

export function FacultySidebar({
  active,
  onNavigate,
  mobileOpen,
  onMobileClose,
}: FacultySidebarProps) {
  return (
    <Sidebar
      role="faculty"
      active={active}
      onNavigate={onNavigate}
      mobileOpen={mobileOpen}
      onMobileClose={onMobileClose}
    />
  )
}
