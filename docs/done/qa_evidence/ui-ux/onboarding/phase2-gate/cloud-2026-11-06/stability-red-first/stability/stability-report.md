# stability-report

H1: scripted unplanned mid-tour navigation. The user navigates away mid-step through the app its own usePortalRoute (the same pushState view swap the engine follows for steps with a view), from a topbar step deep in the tour and from the first step with a rapid second navigation. Documented behavior demonstrated: the engine follows the user (continues on the incoming view) or ends calmly; no crash, no orphaned overlay, no fired dialogs, and the step stays operable afterwards.

Run: 2026-11-06T01:15:21.395Z
Baseline SHA: 3e40a2d7f5043a050c8a5f8ae7c72570fc170fba  HEAD SHA: 3e40a2d7f5043a050c8a5f8ae7c72570fc170fba

## Method

Per scenario: a real tour reaches the target step through normal engine advancement, the script then clicks a live nav hook mid-step exactly as a user would, waits out the view swap, and reads the overlay state (presence, data-disposition, card presence, active element). Sanity = the overlay is gone (calm end) or carries a valid disposition; plus zero page errors and zero window dialogs, and one more Next click proving operability.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | H1: the URL actually moved to the user-chosen view (http://localhost:4310/portal/commonwealth/student/juan.santos/events -> http://localhost:4310/portal/commonwealth/student/juan.santos) |
| 2 | PASS | H1: mid-step navigation leaves a sane engine state (overlay disposed or a valid disposition) ({"overlay":true,"disposition":"spot","stepId":"dev-6","activeIsBody":true,"activeConnected":true,"activeDescription":"body"}) |
| 3 | FAIL | H1: focus is not stranded on body/root after the mid-step view swap (active=body overlay=true disposition=spot) |
| 4 | FAIL | H1: the active element after navigation is connected (no dead focus target) (active=body connected=true) |
| 5 | PASS | H1: no orphaned overlay on the new view |
| 6 | PASS | H1: no page errors during mid-step navigation (errors=[]) |
| 7 | PASS | H1: no window dialogs fired (dialogs=[]) |
| 8 | PASS | H1: the step stays operable after the user navigated away mid-step (Next click after nav accepted without error) |
| 9 | PASS | H1: focus re-enters the tour card after the post-navigation advance ({"active":"h2#_r_4_","overlay":true,"stepId":"dev-7"}) |
| 10 | PASS | H1: navigation on the first step (+rapid second nav) ends calmly or follows ({"overlay":true,"disposition":"spot","stepId":"dev-1","activeIsBody":true,"activeConnected":true,"activeDescription":"body"}) |
| 11 | FAIL | H1: focus is not stranded on body/root after early/rapid navigation (active=body overlay=true disposition=spot) |
| 12 | FAIL | H1: the active element after early navigation is connected (active=body connected=true) |
| 13 | PASS | H1: no page errors under rapid navigation (errors=[]) |

9 pass, 4 fail
