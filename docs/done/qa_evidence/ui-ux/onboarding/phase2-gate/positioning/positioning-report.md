# Positioning report

C1 through C5: viewport-resize repositioning, scroll tracking with the sticky topbar in play, content shifts inside a route (skeleton resolving behind a delayed API), cross-route steps through the app pushState navigation, and overlay coexistence with the z-50 dropdowns, modals, and toasts above the tour. The overlay layer choice is documented in TourOverlay: z-40, above content and the z-20 topbar/z-30 sidebar so nav targets can be framed, below the z-50 surfaces so they paint above and take focus without the engine fighting back.

Run: 2026-10-30T15:46:32.160Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## C1 resize

A resize series through 1100x800, 1024x700, 1280x600, back to 1280x800. After every stop the spotlight re-frames the target and the card stays inside the viewport (flip and clamp rules).

## C2 scroll

While framing the events view content, a scroll series (+240, +240, -480) keeps the spotlight on its target; the sticky Topbar stays above the page but never above the overlay by design.

## C3 layout change within a route

The events view resolves its own skeleton once data arrives (the existing path, verified intact on a direct load). At SPA step time the seeded events data is already prefetched, so the mid-step shift is exercised deterministically: a 320px block inserted above the framed target shifts the flow layout and the engine repositions the spotlight without manual help.

## C4 cross-route

The dev-5 step navigates via window.history.pushState through the host (the app own navigation) and the engine waits out the incoming mount; the URL ends at /events with the target framed. Recorded as c4-cross-route.webm.

## C5 overlay layering

The notifications dropdown, the profile COE modal, and the settings data-export sonner toast all open above the tour (z-50 over z-40), receive the click/focus, and close without ending the tour or leaving an orphaned overlay. Crash detection tracks page errors (the Next dev overlay portal is present in every dev page and is not an error).

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | C1: a resize series through 1100/1024/height-600 repositions correctly at every stop |
| 2 | PASS | C2: the spotlight tracks its target through a scroll series over the events view |
| 3 | PASS | C3: the events view resolves its skeleton once data arrives (existing path intact) (skeleton observed then content on direct load) |
| 4 | PASS | C3: a mid-step content shift repositions the spotlight without manual help ({"before":0,"after":320}) |
| 5 | PASS | C4: the cross-route step navigated through pushState to /events (url=/portal/commonwealth/student/juan.santos/events) |
| 6 | PASS | C4: cross-route clip recorded (c4-cross-route.webm) |
| 7 | PASS | C5: the notifications dropdown paints above the tour and takes the click |
| 8 | PASS | C5: Escape closes the dropdown, not the tour |
| 9 | PASS | C5: the COE modal opens above the tour (documented z-40 layer) |
| 10 | PASS | C5: closing the modal leaves the tour intact and operable ({"overlay":true,"modals":0}) |
| 11 | PASS | C5: a sonner toast paints above the tour |
| 12 | PASS | C5: the tour survives dropdown, modal, and toast with no page errors ({"overlay":true,"pageErrors":0}) |

12 pass, 0 fail
