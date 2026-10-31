# Reduced motion report

E1: under emulated prefers-reduced-motion the spotlight lands on its final rect immediately (identical samples 80ms apart, matching the framed target plus the 8px pad), step changes settle the same way, the scrim fade duration is zero, and the tour remains fully operable with zero page errors. The engine honors the preference through both the shell MotionConfig reducedMotion="user" and its own useReducedMotion gate on every transition duration.

Run: 2026-10-30T15:50:06.220Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## E1 no movement when the setting is on

First sample equals the second sample at +80ms and equals the target rect: no tween, no drift. Escape ends the tour normally; no page errors.

## Motion-enabled observation

With the preference off, the spotlight tweens for 200ms per reposition (recorded so the reduced-motion behavior has its contrast case).

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | E1: with prefers-reduced-motion on, the spotlight lands settled with no tween ({"sample1":{"top":101.25,"left":4,"width":231,"height":52},"sample2":{"top":101.25,"left":4,"width":231,"height":52}}) |
| 2 | PASS | E1: the settled rect is the framed target (correct position, zero duration) ({"sample1":{"top":101.25,"left":4,"width":231,"height":52},"target":{"top":109.25,"left":12,"width":215,"height":36}}) |
| 3 | PASS | E1: step changes settle instantly under reduced motion ({"s1":{"top":141.25,"left":4,"width":231,"height":52},"s2":{"top":141.25,"left":4,"width":231,"height":52}}) |
| 4 | PASS | E1: the tour stays operable under reduced motion (Escape ends it) |
| 5 | PASS | E1: no page errors under reduced motion (errors=0) |
| 6 | PASS | E1: (observation) with motion enabled the spotlight tween is active (rect a=70.890625, b=101.25 (tween lands within 200ms by design)) |

6 pass, 0 fail
