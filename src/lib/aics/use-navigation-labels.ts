'use client'

import { useSyncExternalStore } from 'react'

const key = 'aics.faculty.navigation-labels'
const changeEvent = 'aics:faculty-navigation-labels'
let labelsVisible = true

function getSnapshot() {
  try {
    return window.localStorage.getItem(key) !== 'off'
  } catch {
    return labelsVisible
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

export function setNavigationLabels(visible: boolean) {
  labelsVisible = visible
  try {
    window.localStorage.setItem(key, visible ? 'on' : 'off')
  } catch {
    // Keep the preference for this tab when storage is unavailable.
  }
  window.dispatchEvent(new Event(changeEvent))
}

export function useNavigationLabels() {
  return useSyncExternalStore(subscribe, getSnapshot, () => true)
}
