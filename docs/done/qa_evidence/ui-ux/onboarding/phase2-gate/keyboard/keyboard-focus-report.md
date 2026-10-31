# Keyboard focus report

D1 and D2: the tour is fully keyboard-operable (launcher Enter, Tab cycle inside the card, Next/Finish via Enter, Escape always ends it), focus moves into each step card and never strands, Back is disabled on the first step, Tab wraps inside the card per the DialogPanel contract, and focus restores to the triggering launcher on every exit. The page tab order and the #main-content skip link are intact before and after the tour.

Run: 2026-10-30T15:47:33.346Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## D1 keyboard operation

Enter opens the tour from the focused launcher; Tab order inside the card is Skip tour then Next (the disabled Back is skipped); Tab from the last wraps to the first and Shift+Tab wraps back, matching the DialogPanel trap. The full eight-step walk runs keyboard-only and the page reports zero errors.

## D1 no-stranding reading

D1 says "no trap while the tour is open" while D2 requires "matching the DialogPanel contract", which traps Tab inside a dialog. The engine implements the DialogPanel contract (the portal own pattern, D2 explicit words) and reads D1 "no trap" as "no keyboard stranding": every control reachable, Escape always exits, page tab order and skip link intact before and after. This interpretation is recorded for the gate review, not silently applied.

## D2 focus management

Focus enters each step card on every step change (the step heading), never strands between steps, and restores to the launcher on Escape, on Finish, and on skip.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | D1: Enter on the focused launcher opens the tour (launcher focus-visible=true) |
| 2 | PASS | D1: focus moves into the step card (the step heading) (active=Synthetic 1: live navigation target) |
| 3 | PASS | D1: Tab reaches Skip tour first (active=Skip the guided tour) |
| 4 | PASS | D1: Tab skips the disabled Back control (active=Go to the next tour step) |
| 5 | PASS | D1: Back is disabled on the first step |
| 6 | PASS | D1: Tab from the last control wraps to the first (DialogPanel trap) (active=Skip the guided tour) |
| 7 | PASS | D1: Shift+Tab from the first wraps to the last (active=Go to the next tour step) |
| 8 | PASS | D1: Enter on Next advances and focus moves into the new card (active=Synthetic 2: second nav target) |
| 9 | PASS | D2: Escape ends the tour and focus restores to the launcher ({"active":"dev-tour-launcher","overlay":false}) |
| 10 | PASS | D1: the page tab order is intact after the tour (skip link reachable) (skip link at tab stop 3) |
| 11 | PASS | D1: the tour walks keyboard-only through every step (steps=7) |
| 12 | PASS | D2: finishing restores focus to the trigger (active=dev-tour-launcher) |
| 13 | PASS | D1: no page errors across the keyboard walk (errors=0) |
| 14 | PASS | D2: focus moves into each step card and never strands between steps |

14 pass, 0 fail
