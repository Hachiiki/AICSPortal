# stability-report

H1: scripted unplanned mid-tour navigation. The user navigates away mid-step through the app its own usePortalRoute (the same pushState view swap the engine follows for steps with a view), from a topbar step deep in the tour and from the first step with a rapid second navigation. Documented behavior demonstrated: the engine follows the user (continues on the incoming view) or ends calmly; no crash, no orphaned overlay, no fired dialogs, and the step stays operable afterwards.

Run: 2026-10-30T16:16:12.786Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## Method

Per scenario: a real tour reaches the target step through normal engine advancement, the script then clicks a live nav hook mid-step exactly as a user would, waits out the view swap, and reads the overlay state (presence, data-disposition, card presence, active element). Sanity = the overlay is gone (calm end) or carries a valid disposition; plus zero page errors and zero window dialogs, and one more Next click proving operability.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | H1: the URL actually moved to the user-chosen view (http://localhost:4310/portal/commonwealth/student/juan.santos/events -> http://localhost:4310/portal/commonwealth/student/juan.santos) |
| 2 | PASS | H1: mid-step navigation leaves a sane engine state (overlay disposed or a valid disposition) ({"overlay":true,"disposition":"spot","stepId":null,"activeIsBody":true}) |
| 3 | PASS | H1: no orphaned overlay on the new view |
| 4 | PASS | H1: no page errors during mid-step navigation (errors=[]) |
| 5 | PASS | H1: no window dialogs fired (dialogs=[]) |
| 6 | PASS | H1: the step stays operable after the user navigated away mid-step (Next click after nav accepted without error) |
| 7 | PASS | H1: navigation on the first step (+rapid second nav) ends calmly or follows ({"overlay":true,"disposition":"spot","stepId":null,"activeIsBody":true}) |
| 8 | PASS | H1: no page errors under rapid navigation (errors=[]) |

8 pass, 0 fail
