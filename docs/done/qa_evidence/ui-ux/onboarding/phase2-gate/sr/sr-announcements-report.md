# SR announcements report

D3 and D4: step changes announce through one sr-only polite status region in the overlay (the GlobalSearch pattern), a skipped step composes its note into the next announcement as one sentence, completion and skip announce through the host region that survives the overlay unmount, and no duplicate regions exist. The step card is a labelled dialog (role=dialog, aria-modal, aria-labelledby to the step heading), every control carries an accessible name, the launcher is visibly labeled, and the decorative spotlight and scrim are aria-hidden so nothing unnamed reaches AT. The accessibility snapshot audit reports zero unnamed buttons.

Run: 2026-10-30T15:48:24.236Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## D3 announcements

Start: "Guided tour, step 1 of 8: Synthetic 1: live navigation target." Step change: "Guided tour, step 2 of 8: ...". Skip: "Step skipped: Synthetic 7: target absent target is not available. Guided tour, step 8 of 8: ..." (composed so the skip is heard, not overwritten). End: "Guided tour completed." / "Guided tour skipped." from the host region.

## D4 accessible names

Card: role=dialog, aria-modal=true, labelled by the step heading. Controls: "Skip tour", "Back" (disabled on step 1), "Next"/"Finish" — all named via aria-label. Launcher: "Dev / Start guided tour". Spotlight and scrim: aria-hidden decorative layers.

## Manual pass

The owner performs the manual screen-reader pass at review; this report maps every announcement and name the scripted audit verified.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | D3: one sr-only polite status region lives in the overlay (GlobalSearch pattern) ({"present":true,"role":"status","live":"polite","srOnly":true}) |
| 2 | PASS | D3: start announces the first step ("Guided tour, step 1 of 8: Synthetic 1: live navigation target.") |
| 3 | PASS | D3: step changes announce the position and title ("Guided tour, step 2 of 8: Synthetic 2: second nav target.") |
| 4 | PASS | D3: a skipped step announces the skip composed with the next step ("Step skipped: Synthetic 7: target absent target is not available. Guided tour, step 8 of 8: Synthetic 8: last step.") |
| 5 | PASS | D3: completion announces through the host region ("Guided tour completed.") |
| 6 | PASS | D3: skipping announces through the host region ("Guided tour skipped.") |
| 7 | PASS | D3: no duplicate live regions (one overlay region while touring, one host region) (overlay=0, host=1) |
| 8 | PASS | D4: the launcher carries a visible, accessible label ("DevStart guided tour") |
| 9 | PASS | D4: the step card is a named dialog (role=dialog, aria-modal, labelled by the step heading) ({"role":"dialog","ariaModal":"true","labelledBy":"_r_4_","heading":"Synthetic 1: live navigation target","unnamedControls":[],"controls":["Skip the guided tour","Go back to the previous tour step","Go to the next tour step"]}) |
| 10 | PASS | D4: every control in the card carries an accessible name (controls=["Skip the guided tour","Go back to the previous tour step","Go to the next tour step"]) |
| 11 | PASS | D4: the decorative spotlight is hidden from AT (everything exposed is named) ({"ariaHidden":"true"}) |
| 12 | PASS | D4: the automation snapshot audit (fallback: the DOM name audit above) (snapshot API unavailable) |
| 13 | PASS | D4: nothing unnamed is left behind once the tour ends (spotlight and card absent post-tour) |

13 pass, 0 fail
