# Faculty mobile redesign

The faculty phone layout follows the student header, dock, Search, and account drawer from #95 and #96. Home, Students, and Grades occupy the three main dock slots. More holds the remaining teaching destinations.

## Screenshot comparisons

Capture the unchanged app from `0e3cbf6` first. Use the same `capture-faculty.mjs` and `fixtures.mjs` from this PR for both runs. Use Windows checkouts with installed dependencies, Playwright Chromium, and an existing `.next` font cache from the app's fonts. Run `npm run build` first if the font cache is missing and the build environment can reach Google Fonts. Point the scripts to the isolated local builds created with `node scripts/mobile/quality.mjs` and started with `node scripts/mobile/serve.mjs`. Run `node scripts/mobile/capture-faculty.mjs before` against the baseline and repeat with `after` against the PR build. The script saves matching 320 and 390 px captures for Home, My Students, the expanded roster, Grade Encoding, Tasks, and Schedule.

Run `node scripts/mobile/verify.mjs faculty-mobile` against the PR build for the dock, roster, grade period, More, faculty appearance route, Search, student, and admin checks. Post matching before-and-after images in PR #99 for the design review.
