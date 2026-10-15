# ADR 0003 — INC counts as 0 in final grade math

Date: 2026-08-30

## Context

Not all students have grades at start of term. We seed `2026-2027 1st Sem` with `INC` everywhere and no status. Teachers asked what `INC` means for final. Some wanted `INC` to block final (stay `INC`), some wanted numeric.

## Decision

`INC` counts as 0 in the weighted formula `final = prelim*0.3 + midterm*0.3 + finals*0.4`. `src/lib/aics/use-faculty-rows.ts:46` implements `computedFinalINCasZero`. If any input is empty, final stays `''`. If any is `INC`, that term is 0. `remarksFor` then derives `Failed` etc for numeric final, or `INC` badge if final is `INC`.

## Consequences

Good: teachers see a numeric final even with one `INC`, useful for early warnings. Matches user statement that INC equals 0.
Bad: a single `INC` drags final down strongly. Teachers must change `INC` to a number to recover.

## Status

Accepted.
