/** Display choices are persisted separately from the approved progress keys. */
export interface OnboardingPreferences {
  welcomeSeen: boolean
  checklistDismissed: boolean
  tourSkipped: boolean
  tasksGuideSeen: boolean
  tasksGuideCompleted: boolean
  tourNoticeReadVersion: number
  tourNoticeDismissedVersion: number
}

export function onboardingPreferences(value: unknown, initialTourVersion = 1): OnboardingPreferences {
  const saved = value && typeof value === 'object' ? value as Partial<OnboardingPreferences> : {}
  const version = (value: unknown) => typeof value === 'number' && Number.isSafeInteger(value) && value >= 1 ? value : initialTourVersion
  return { welcomeSeen: saved.welcomeSeen === true, checklistDismissed: saved.checklistDismissed === true, tourSkipped: saved.tourSkipped === true,
    tasksGuideSeen: saved.tasksGuideSeen === true, tasksGuideCompleted: saved.tasksGuideCompleted === true,
    tourNoticeReadVersion: version(saved.tourNoticeReadVersion), tourNoticeDismissedVersion: version(saved.tourNoticeDismissedVersion) }
}
