/** Display choices are persisted separately from the approved progress keys. */
export interface OnboardingPreferences {
  welcomeSeen: boolean
  checklistDismissed: boolean
  tourSkipped: boolean
  tasksGuideSeen: boolean
  tasksGuideCompleted: boolean
}

export function onboardingPreferences(value: unknown): OnboardingPreferences {
  const saved = value && typeof value === 'object' ? value as Partial<OnboardingPreferences> : {}
  return { welcomeSeen: saved.welcomeSeen === true, checklistDismissed: saved.checklistDismissed === true, tourSkipped: saved.tourSkipped === true,
    tasksGuideSeen: saved.tasksGuideSeen === true, tasksGuideCompleted: saved.tasksGuideCompleted === true }
}
