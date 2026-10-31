# prod-smoke-report

A1 + provisional rule 1 (NOT provisional): next build a production bundle with the gate env (disclosed repo-contained smoke AUTH_SECRET; production rejects the dev fallback), scan every client chunk under .next/static/chunks for onboarding implementation markers (TourOverlay token, overlay/card/spotlight attributes, the dev launcher contract, the completion sentence, the board contract, the synthetic host symbol): expected 0 matches = 0 onboarding bytes and 0 onboarding modules in the production client; then `next start` the build and smoke the real production portal: it renders fully (nav present, page operable) with NO tour overlay machinery, NO dev launcher, and no guided-tour strings in the live DOM.

Run: 2026-10-30T16:22:00.173Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## Method

The chunk scan is a source-substring scan over minified client JS: presentation attributes (data-tour-overlay etc.) and aria strings survive minification only if the module that renders them is present, so a 0-match scan is positive proof of exclusion, not a style check. The DOM assertions run in the live production page over CDP with the same helpers every other gate script uses.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | A1: next build exits 0 (full log in prod-smoke/build.log) |
| 2 | PASS | A1 RULE 1: zero onboarding modules in the production client chunks (9 markers x every file under .next/static/chunks: 0 matches, onboarding client bytes = 0, onboarding modules = 0) |
| 3 | PASS | A1: next start serves the production build |
| 4 | PASS | A1: real seeded demo login works against the production server (status=200) |
| 5 | PASS | A1: production page has NO tour overlay machinery in the DOM ({"overlay":false,"launcher":false,"markerAttrs":7,"bodyHasGuideText":false,"navOk":true}) |
| 6 | PASS | A1: production page has NO dev tour launcher |
| 7 | PASS | A1: production page carries no guided-tour strings |
| 8 | PASS | A1: the production portal itself is fully rendered (nav present, page works) |

8 pass, 0 fail
