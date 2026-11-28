'use client'

import { useSyncExternalStore } from 'react'
import type { PortalRole } from './nav-config'

type StaffRole = Exclude<PortalRole, 'student'>
const changeEvent = 'aics:navigation-labels'
const labelsVisible: Record<StaffRole, boolean> = { faculty: true, admin: true }
const storageKey = (role: StaffRole) => `aics.${role}.navigation-labels`

function getSnapshot(role?: PortalRole) {
  if (role !== 'faculty' && role !== 'admin') return true
  try {
    return window.localStorage.getItem(storageKey(role)) !== 'off'
  } catch {
    return labelsVisible[role]
  }
}

function subscribe(listener: () => void) {
  window.addEventListener('storage', listener)
  window.addEventListener(changeEvent, listener)
  return () => {
    window.removeEventListener('storage', listener)
    window.removeEventListener(changeEvent, listener)
  }
}

export function setNavigationLabels(role: StaffRole, visible: boolean) {
  labelsVisible[role] = visible
  try {
    window.localStorage.setItem(storageKey(role), visible ? 'on' : 'off')
  } catch {
    // Keep the preference for this tab when storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent))
}

export function useNavigationLabels(role?: PortalRole) {
  return useSyncExternalStore(subscribe, () => getSnapshot(role), () => true)
}
