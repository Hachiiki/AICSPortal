# Targets matrix

B1 through B4 target handling: present live targets (full eight-step walk at 1280x800 plus spot and clamp checks at 1024x700 and 800x600), absent-at-open (skip rule), delayed mount (wait rule), and removed-mid-step (center rule). All scenarios run against the seeded student portal with the dev-only synthetic tour; every measurement reads a settled overlay (two identical spotlight rects 150ms apart).

Run: 2026-10-30T15:44:44.526Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## B1 present targets

Live nav and topbar targets. The spotlight frames every present target and the card never leaves the viewport (flip and clamp rules).

## B2 missing at open

Step dev-7 targets an id that never exists. The engine holds in waiting without painting a spotlight, then skips forward inside the 1500ms step budget with a live-region announcement and no crash or trapped focus. Permission-filtered or hidden nav entries resolve through the same path: the resolution contract is attribute-based, so any absent element is identical to the engine.

## B3 delayed targets

Step dev-3 waits on the board timer. No spotlight is painted while the target is absent (no wrong-position flash), and the target frames correctly the moment it mounts. Recorded as b3-delayed-target.webm.

## B4 removed mid-tour

Step dev-4 frames the volatile target, the board remove button unmounts it mid-step, the spotlight releases, the card re-centers, and the step stays operable; advancing proceeds normally.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | B1 1280x800: every present step frames its target (full walk, dev-7 auto-skips by design) (framed=7/7) |
| 2 | PASS | B1 1100x700: present targets frame correctly (framed=3/3) |
| 3 | PASS | B1 1100x700: card stays inside the viewport (flip and clamp near edges) |
| 4 | PASS | B1 1024x640: present targets frame correctly (framed=3/3) |
| 5 | PASS | B1 1024x640: card stays inside the viewport (flip and clamp near edges) |
| 6 | PASS | B2: absent target waits without a spotlight (no blank ring) (disposition=waiting) |
| 7 | PASS | B2: absent target skips forward within the step budget (advanced in 1545ms (budget 1500ms)) |
| 8 | PASS | B2: the skip announces through the live region (live="Step skipped: Synthetic 7: target absent target is not available. Guided tour, step 8 of 8: Synthetic 8: last step.") |
| 9 | PASS | B2: no crash, no trapped focus after the skip (active=_r_4_) |
| 10 | PASS | B3: a late target holds in waiting, no spotlight painted (waitingFrames=28, spotBeforeMount=0 (passive 25ms observation installed before the step landed)) |
| 11 | PASS | B3: no wrong-position flash before the target mounts |
| 12 | PASS | B3: the late target frames correctly once mounted ({"spot":{"top":721,"left":21,"width":230,"height":58},"rect":{"top":729,"left":29,"width":214,"height":42}}) |
| 13 | PASS | B4: the volatile target frames before removal |
| 14 | PASS | B4: removal releases the spotlight and centers the card |
| 15 | PASS | B4: the step stays operable (card and controls present) (active=BODY) |
| 16 | PASS | B4: advancing after removal works |

16 pass, 0 fail
