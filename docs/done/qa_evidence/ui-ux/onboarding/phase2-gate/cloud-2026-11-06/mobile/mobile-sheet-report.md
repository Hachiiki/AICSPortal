# Mobile sheet report

F1: at 375x667 the tour falls back to the documented bottom-sheet presentation — the spotlight ring collapses to a plain scrim, the card pins to the bottom of the viewport, Next and Back operate the tour, and the mobile navigation dialog opens above the sheet at z-50, takes the click and the focus, and closes on Escape without ending the tour. The tour then ends cleanly with focus restored to the launcher. The gate contexts run with cookie consent pre-decided; in a fresh profile the legal consent banner (z-50, bottom-docked) overlays the dev launcher corner until decided, a dev-only cosmetic note recorded here for completeness.

Run: 2026-11-06T01:06:29.502Z
Baseline SHA: 3e40a2d7f5043a050c8a5f8ae7c72570fc170fba  HEAD SHA: 3e40a2d7f5043a050c8a5f8ae7c72570fc170fba

## F1 sheet presentation

Sheet pinned at the bottom (card bottom within 24px of the viewport edge), spotlight collapsed, plain scrim.

## F1 nav-dialog coexistence

The mobile navigation dialog (z-50) paints above the sheet, receives Escape first, and the tour continues; no focus fight in either direction. When the drawer closes it restores no focus itself, so the H1 repair (2026-11-04) returns focus to the open tour card heading instead of stranding it on body; where focus lands elsewhere, the card stays reachable through the tab order. Escape then ends the tour with focus restored to the launcher.

## F1 operability

Next advances, Back returns, Escape ends the tour from the sheet with focus restored to the launcher; zero page errors.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | F1: at phone width the card pins as a bottom sheet (no spotlight ring) ({"cardTop":467,"cardBottom":655,"viewportH":667,"spotlightCollapsed":true,"disposition":"waiting"}) |
| 2 | PASS | F1: the sheet is operable (Next advances, Back returns) |
| 3 | PASS | F1: the mobile navigation dialog paints above the sheet and takes the click ({"ok":true,"why":"inside","rect":{"top":0,"left":-0.4924218952655792,"w":256,"h":667},"zIndex":"50"}) |
| 4 | PASS | F1: Escape closes the navigation dialog, not the tour ({"overlay":true,"navDialog":false}) |
| 5 | PASS | F1: after the drawer closes, focus is usable (connected, not body) ({"isBody":false,"connected":true,"inCard":true,"desc":"H2"}) |
| 6 | PASS | F1: the card is reachable through the tab order when focus landed elsewhere (focus already in the card (H2); no walk needed) |
| 7 | PASS | F1: the tour ends cleanly from the sheet with focus restored (active=dev-tour-launcher) |
| 8 | PASS | F1: no page errors on the mobile pass (errors=0) |

8 pass, 0 fail
