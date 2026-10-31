# Mobile sheet report

F1: at 375x667 the tour falls back to the documented bottom-sheet presentation — the spotlight ring collapses to a plain scrim, the card pins to the bottom of the viewport, Next and Back operate the tour, and the mobile navigation dialog opens above the sheet at z-50, takes the click and the focus, and closes on Escape without ending the tour. The tour then ends cleanly with focus restored to the launcher. The gate contexts run with cookie consent pre-decided; in a fresh profile the legal consent banner (z-50, bottom-docked) overlays the dev launcher corner until decided, a dev-only cosmetic note recorded here for completeness.

Run: 2026-10-30T16:11:42.903Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## F1 sheet presentation

Sheet pinned at the bottom (card bottom within 24px of the viewport edge), spotlight collapsed, plain scrim.

## F1 nav-dialog coexistence

The mobile navigation dialog (z-50) paints above the sheet, receives Escape first, and the tour continues; no focus fight in either direction. After the drawer closes, keyboard focus falls to body and the engine deliberately does not steal it back; keyboard users reach the card again through the normal tab order, and Escape then ends the tour with focus restored to the launcher.

## F1 operability

Next advances, Back returns, Escape ends the tour from the sheet with focus restored to the launcher; zero page errors.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | F1: at phone width the card pins as a bottom sheet (no spotlight ring) ({"cardTop":467,"cardBottom":655,"viewportH":667,"spotlightCollapsed":true,"disposition":"waiting"}) |
| 2 | PASS | F1: the sheet is operable (Next advances, Back returns) |
| 3 | PASS | F1: the mobile navigation dialog paints above the sheet and takes the click ({"ok":true,"why":"inside","rect":{"top":0,"left":0,"w":256,"h":667},"zIndex":"50"}) |
| 4 | PASS | F1: Escape closes the navigation dialog, not the tour ({"overlay":true,"navDialog":false}) |
| 5 | PASS | F1: the card is reachable again through the tab order after the dialog closes (reached at Shift+Tab 4) |
| 6 | PASS | F1: the tour ends cleanly from the sheet with focus restored (active=dev-tour-launcher) |
| 7 | PASS | F1: no page errors on the mobile pass (errors=0) |

7 pass, 0 fail
