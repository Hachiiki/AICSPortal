// Shared contract for the sign-in progress overlay (stage one of
// the post-login transition). The page hands the stage the branch,
// the completion callback, and the real readiness of the portal's
// initial data; the stage runs the shared sequence hook and owns
// the presentation.

/** Real readiness of the portal's initial data (see page.tsx). */
export interface AuthReadiness {
  ready: boolean
  error: boolean
}

/** Props of the sign-in progress stage (the Route Trail journey). */
export interface AuthStageProps {
  branch: string
  onComplete: () => void
  readiness: AuthReadiness
}
