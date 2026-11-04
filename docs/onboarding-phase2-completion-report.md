# Phase 2 completion assessment

Current owner scope, 2026-11-03: Phase 3 student onboarding development and UX refinement are explicitly authorized on `main-full-dev`. Phase 2 remains **NOT READY**. The dated records below describe earlier assignments and their authorization boundaries; their statements that Phase 3 or commits were unauthorized are historical. The final-verification sections at the end supersede earlier outstanding-status tables. Owner-reported manual categories are PASS/APPROVED; production student-scope A1 has committed-source evidence and strict cleanup; corrected cal1/cal2 are valid but miss the unchanged draft limits, which the owner instructed us to keep unresolved. Timing misses its draft limit and long-task attribution remains inconclusive. See the dated sections for exact evidence and limitations.

Date: 2026-11-02, Asia/Shanghai.
Branch: `main-full-dev`. Committed HEAD: `e0e688089791e86b539cb98123b04b52bac139dd`.

Recommendation: **NOT READY**. Two confirmed implementation defects have been repaired, but mandatory runtime evidence is incomplete. This report does not accept Phase 2 or authorize Phase 3.

## Repairs and findings

1. Production exclusion failed under the installed Next 16.1.3 webpack production compiler. The committed build succeeded, but six of the nine prohibited markers occurred in a lazy client chunk. `OnboardingDevMount.tsx` now encloses the dynamic import in a compile-time development conditional. Its former early return did not prevent webpack from emitting the dependency. Rebuilding the isolated copy with the working mount and overlay fixes exited 0. The subsequent scan found zero matches across 78 client chunk files. This is a targeted scan, not exhaustive proof of zero related bytes or modules.
2. The saved custom theme produced 2.23:1 contrast on the tour's Next/Finish control. The historical theme script counted that observation as PASS unconditionally. `TourOverlay.tsx` now uses the ink/surface pair for those controls and their hover state. `07-themes.mjs` now requires at least 4.5:1 for Next and Finish, normal and hovered, across the nine concrete theme combinations. Fresh browser confirmation passed all 72 theme assertions. Both saved custom variants measured 13.59:1 for Next/Finish, normal and hovered.
3. `04-sr.mjs` now inspects Chromium's actual accessibility tree. The old deprecated-API fallback could label DOM-only inspection as an accessibility snapshot PASS. The new assertion requires the named dialog and all three named controls and fails if the accessibility tree is unavailable.
4. The prior account preflight falsely failed the test password because it decoded the salt as hex bytes. The application hashes with the hex string as its salt. The new read-only `account-preflight.mjs` imports the application's `verifyPassword` function.
5. Local verification needed safer infrastructure. The canonical smoke's PID-file cleanup, working-checkout build, and broad environment inheritance were not used. New isolated runners export verified Git blobs, record executing source hashes, reuse existing dependencies, use kernel jobs, block external browser requests and database mutations, and preserve failed runs. The login readiness path is `/`; `/portal/login` redirects and cannot satisfy a redirect-rejecting readiness probe.

## Executed checks

| Check | Actual result | Evidence |
|---|---|---|
| `bun test src/lib/authz/ src/lib/onboarding/ src/lib/aics/theme-palette.test.ts scripts/lib/` | PASS, 157 tests, 0 failures, 783 assertions, 11 files | `.phase2-local/unit-all.log` |
| ESLint and `tsc --noEmit` in isolated working-source exports | PASS, exit 0 for both | `phase2-completion-interactions/attempt-2` and `attempt-3` logs |
| Targeted ESLint on the two changed components and changed interaction scripts | PASS, exit 0 | `.phase2-local/final-targeted-lint.log` |
| `git diff --check` | PASS | Executed in the checkout |
| Committed-source `next build --webpack` | PASS | `phase2-completion-a1/attempt-1/prod-smoke/build.log` |
| Committed-source production marker scan | FAIL, six marker hits in one chunk, 79 files scanned | Same directory, `chunk-scan.json` |
| Working-source repaired `next build --webpack` | PASS, exit 0, including TypeScript and static page generation | `.phase2-local/working-build.log`, `working-build-exit.txt` |
| Repaired production marker scan | PASS, zero hits in 78 files; both patched file hashes match the working source | `.phase2-local/working-chunk-scan.json` |
| Real production login/navigation after the repair | NOT EXECUTED: listener inspection timed out before server launch | `.phase2-local/working-smoke/result.json` |
| Fresh interaction suite, attempt 2 | INCONCLUSIVE: navigation/launcher timeouts and poisoned supervisor protocol prevented useful assertions | `phase2-completion-interactions/attempt-2/interaction-result.json` |
| Focused browser rerun, attempt 3 | PASS assertions: 72 theme and 13 announcement/name checks, 0 assertion failures. Overall runner FAIL from browser cleanup | `phase2-completion-interactions/attempt-3/interaction-result.json` |
| `bun test scripts/onboarding/settle-timing.test.mjs` | PASS, 1 regression test, 3 assertions; a missing spotlight cannot settle before the delayed new target | `.phase2-local/timing-regression.log` |
| Evidence reader rejection checks | PASS: failed committed run rejected; dirty working gate rejected | `.phase2-local/evidence-reader-check.json` |
| Manual screen-reader pass | NOT EXECUTED | Remains mandatory under D3 |

Evidence directories above are under `docs/done/qa_evidence/ui-ux/onboarding/`. Raw failed artifacts have not been rewritten into passing results. Attempt 1 of the interaction adapter was interrupted during preparation and is not acceptance evidence. Attempt 2 was interrupted after repeated infrastructure failures; its partial JSON must not be represented as a clean completed run.

The initial checkout-wide lint invocation was interrupted. Subsequent full static checks used an isolated export containing permitted tracked inputs, so they did not traverse the protected design export. The initial checkout typecheck exited 0. No protected-file content has been used as test evidence.

## A1 evidence integrity

The exact previously reviewed seven-file adapter was not recovered from the searched repository, local gate-tools directory, or temporary opencode artifacts. Its approved `7641c1d6...` fingerprint remains untouched in the existing reader.

A distinct seven-file producer was reviewed and independently hashed with Node crypto and PowerShell/.NET. Its fingerprint is `ac6e6f8560f518c689a9c35ce5593edca5955a83fea8422a68808f571f5e4b80`. It is registered separately in `a1-v2-registry.mjs`. The registry identifies reviewed bytes; it does not approve an outcome. The executed producer copies are archived with the failed A1 run. Later ownership-inspection changes produce different bytes and do not inherit this registration.

`isolated-a1-observer.mjs` records the worker's exit and independently queries recorded process IDs. `a1-v2-evidence.mjs` checks producer and artifact hashes, Git source identities, raw build/login/page facts, assertions, cleanup, and the independent observer. Its gate wrapper retains rejection of dirty application inputs. The existing Rule 4a reader has not been weakened or fed fabricated legacy evidence.

A1 is **FAIL for committed HEAD** because of the marker hits. It is **INCONCLUSIVE for the repaired working source** because only build and targeted exclusion have been verified. The working fixes remain uncommitted as requested; evidence for the old committed source cannot approve those changes. The default Turbopack build was not rerun in this completion session. Webpack was selected explicitly because dependencies were shared through an external junction.

## I2 performance and memory

The extensive pre-existing Rule 4b work in `10-perf.mjs` was preserved and extended with allowlisted child environments, local completion simulation with `persisted:false`, external-request blocking, dependency inventory/reuse, an optional temporary probe directory, import-safe ownership exports, and bounded cleanup diagnostics. No packages were added or installed for these runs.

| Calibration | Findings | Disposition |
|---|---|---|
| cal1 attempt 1 | Production build passed; probe chunks contained 36 attribution-marker hits. Readiness used a redirecting path. Cleanup removed the probe and preserved worktree records. A concurrent source edit invalidated the main-tree fingerprint. Zero samples. | INCONCLUSIVE, invalid run retained |
| cal1 attempt 2 | Production build and production HTTP asset checks passed. Browser readiness failed before sampling. Owned browser/server cleanup passed; main-tree and worktree integrity passed. Zero samples. | INCONCLUSIVE |
| cal2 | Not run after the browser lifecycle/inspection blockers were reproduced separately | NOT EXECUTED |

No end-drift, slope, listener-growth or retained-memory PASS is claimed. Draft limits remain 150 KB end drift and 25 KB/cycle. The owner still decides their final acceptance after valid calibration.

The historical roughly 33 ms timing evidence is unreliable: the old timer treats a self-closing spotlight with no child elements as absent and can settle on two `gone` frames. `settle-timing.mjs` now supplies both timer paths in `10-perf.mjs` and waits for the new step and a positive, stable spotlight rectangle. The old timer implementation was removed. Its delayed-target regression test passed, but a fresh browser timing series was not obtained. Rules 2 and 3 are INCONCLUSIVE for this session; historical measurements are not promoted to current evidence. Syntax validation of the revised measurement script and `git diff --check` passed.

The Windows browser lifecycle probe successfully opened a page but repeatedly failed final confirmation: `TerminateJobObject` and empty membership were followed by `WaitForSingleObject` result 258 for the retained root handle. Graceful CDP shutdown did not resolve that failure. These attempts remain FAIL, even when a later listener query found no test listener. Separate listener/supervisor queries also timed out. No unknown process was terminated, and no Windows security setting was changed.

## Gate disposition

| Criteria | Disposition |
|---|---|
| A1 production exclusion/runtime | FAIL at committed HEAD; repaired build/scan PASS, complete gate INCONCLUSIVE |
| A2 authorization/data boundary | PASS for this change set: no authorization or persistence behavior changed; authz integration tests pass |
| A3 evidence completeness | INCONCLUSIVE: artifacts for remaining runtime/calibration requirements are incomplete. Synthetic scope is separately preserved |
| B1-B4, C1-C5, D1-D2, E1, F1, H1 | INCONCLUSIVE for a fresh runtime pass; historical evidence is separately dated |
| D3 | Automated announcements PASS; manual screen-reader requirement NOT EXECUTED |
| D4 | PASS automated DOM and real Chromium accessibility-tree assertions; manual pass NOT EXECUTED |
| G1 | PASS automated full matrix, 72/72; manual visual review NOT EXECUTED |
| H2 | Route-level mocked integration tests PASS; fresh real DB-down scenario NOT EXECUTED because stopping the shared MongoDB service is outside scope |
| I1 cost | S2 PASS. S1/S3 historical rationale remains reviewable. S4/S5 require the corrections below; overall INCONCLUSIVE |
| I2 | INCONCLUSIVE; no valid calibration series |
| J1 | Lint/typecheck and repaired webpack build PASS |
| J2/J3 | Unit/integration PASS; fresh interaction coverage incomplete, so overall INCONCLUSIVE |

Accessibility, scope, stability and data-safety gaps cannot be waived as conditional items under the gate plan. Consequently CONDITIONAL ACCEPT is not justified.

The older cost memo overstates S4/S5. `openPortal` and `startTour` contain synthetic-launcher assumptions, so role-tour reuse needs adaptation. Removing synthetic scaffolding means removing its host, loader and mount reference while retaining the Phase 1 API/registry and engine. It does not require deleting authorization or persistence. The mount reference is in `src/app/page.tsx`, so the literal claim of touching no production source path needs owner interpretation; dead production code and source paths are distinct. The marker scan also does not establish absence of Playwright bytes. No new runtime dependencies were introduced.

## Local MongoDB and preservation

The local listener was `127.0.0.1:27017`, owned by PID 10428, matching the running MongoDB Windows service. Its service configuration points to MongoDB Server 9.0 and binds only to loopback. Process executable/command-line fields were not readable through the process query; no account correction relied on them.

The application-verifier preflight passed uniqueness, student role, commonwealth branch, modern scrypt format, expected credential, absent photo, and client cleanup. Writes attempted: **0**. The old read-only preflight was also rerun and reproduced its false credential failure. No password correction, reseed, rollback record, index change, or other database modification was performed. Browser completion writes were blocked or locally simulated.

The branch and HEAD remain unchanged. No commit, push, merge, deployment, Atlas access, environment-file edit or Phase 3 work occurred. `next-env.d.ts` retains SHA-256 `7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`. The protected design export was neither edited nor used as source. Performance fingerprints use metadata only for that export.

## Reviewable files and remaining work

Application changes are confined to `TourOverlay.tsx` and `OnboardingDevMount.tsx`. Existing test changes are `04-sr.mjs`, `07-themes.mjs`, and additions to the pre-existing `10-perf.mjs` work. New local verification files are `account-preflight.mjs`, `isolated-source.mjs`, `isolated-build.mjs`, `isolated-smoke.mjs`, `isolated-a1-observer.mjs`, `isolated-interactions.mjs`, `settle-timing.mjs`, `a1-v2-evidence.mjs`, and `a1-v2-registry.mjs` under `scripts/onboarding/`. New scripts/docs fall under existing ignore rules and are intentionally unstaged. `.phase2-local/` contains this session's logs and diagnostics.

Before acceptance: resolve reliable Windows ownership/exit inspection; complete the remaining fresh interaction checks; perform manual screen-reader and visual review; obtain valid cal1/cal2 and owner threshold judgment; and obtain full A1 evidence for the eventual reviewed source identity. The user must decide when to commit the fixes. No commit has been made automatically.

The completed focused rerun recorded unchanged producer bytes and unchanged protected-file hash, zero external requests, one simulated completion PATCH and no actual database write. The dev server's job was empty and its supervisor exited 0. Chromium cleanup failed at root wait result 258, and its supervisor exited 1, so the runner correctly exited 1 despite all 85 assertions passing. No clean lifecycle PASS is claimed.

Final read-only observation, `.phase2-local/final-process-observation.json`: no listeners on test ports 4310, 4320, 4321, 4331, 4332 or 4333. PID 13928 was still returned by the process query, with creation time recorded in that artifact. A PID-only observation does not resolve process identity or exclude reuse. It was not terminated by PID. Browser process-exit confirmation remains an explicit cleanup blocker.

## Final stabilization continuation, 2026-11-02

Recommendation remains **NOT READY**. Earlier passing assertions and repaired application files are preserved. The continuation changes only bounded lifecycle diagnostics, this report, and review/retention artifacts. It does not introduce another controller or change a cleanup acceptance assertion.

### Windows lifecycle finding

Two fresh isolated browser probes successfully opened a page and reproduced the cleanup failure. Native diagnostics now record `GetProcessId`, `GetProcessTimes`, `GetExitCodeProcess`, `IsProcessInJob` and a zero-time wait through the retained process handle. The two reported root identities were:

| Probe | Root identity | Native state at failed final wait | Result |
|---|---|---|---|
| Diagnostic | PID 6932, creation FILETIME 134380902281177693 | exit code 0, wait 258, in owned job | FAIL |
| Corrective attempt | PID 11356, creation FILETIME 134380903387894977 | exit code 0, wait 258, in owned job | FAIL |

Evidence is `.phase2-local/lifecycle-continuation-1/result.json` and `lifecycle-continuation-2/result.json`. The native APIs succeeded, returned the expected process IDs and a creation identity, and the control protocol returned a structured failure. These runs therefore establish a root-handle wait failure rather than an inspection-response timeout. They do not establish that the handle is stale or that a running browser remains indefinitely.

The focused corrective attempt allowed two seconds for graceful exit before the existing job termination backstop. It did not resolve the failure and was reverted. No deadline was raised and no root/job assertion was removed. The useful native identity diagnostics remain in `10-perf.mjs`.

Independent process queries found PID 6932 absent after its supervisor exit. A final saved observation also found the corrective browser PID 11356 and HTTP-server PID 13284 absent. See `.phase2-local/continuation-process-observer.json`. This later absence does not convert either failed synchronous cleanup into PASS. The precise unresolved blocker is that the identified root process reports exit code 0 but its retained handle remains unsignaled through the bounded cleanup wait while the supervisor is alive. Explaining the underlying Windows termination/handle behavior requires further platform diagnosis; it has not been proven from this evidence. No process was killed by PID, and no security setting changed.

Because lifecycle reliability is still unestablished after the requested focused diagnostic and corrective attempt, no additional browser interaction or Rule 4b runs were launched. This follows the continuation's priority boundary. It avoids counting another lifecycle-invalid run as fresh verification. Previous failed and invalid attempts remain retained.

### Independent production verification

The browser-free production HTTP check passed with proper server cleanup. Command: `node .phase2-local/production-http-continuation.mjs`, against the already compiled isolated working-source export. It did not run a new build or claim committed-source evidence.

- Login returned 200, issued a session cookie, and returned `juan.santos`, `student`, `commonwealth`. The cookie itself was never logged.
- The authenticated portal returned 200 and HTML. The HTML contained neither the dev launcher marker nor the overlay marker. This is an HTML observation, not proof of hydrated client behavior.
- The production server's job was confirmed empty, the retained root termination was confirmed, and the supervisor exited 0. No cleanup errors or fallback termination.
- The result records the build-ID hash, prior actual-build-log hash, and the two repaired source hashes. `.phase2-local/working-source-binding-continuation.json` additionally matches all 202 exported `src/`, `public/` and selected build-configuration inputs to their current working files. Generated `next-env.d.ts`/`tsconfig.json` are explicitly outside that comparison. Protected `next-env.d.ts` remains unchanged in the checkout.

Evidence: `.phase2-local/production-http-continuation.json` and its log. There was no new credential investigation, password change or reseed. Login used the already verified modern-hash synthetic account. Apart from the permitted login request, this check only made an authenticated GET; no application mutation request was sent. No remote database was used.

### Current remaining gate status

| Requirement | Current disposition | Kind of remaining issue |
|---|---|---|
| Browser lifecycle | FAIL in both fresh probes; independent later absence recorded | Reproducible test-infrastructure/platform blocker |
| B1-B4, C1-C5, D1/D2, E1, F1, H1, J2 runtime regression | Historical artifacts retained; fresh full rerun NOT EXECUTED in this continuation | Depends on reliable lifecycle |
| D3/D4 automated | Prior 13 assertions retained as passing assertions; prior runner lifecycle still failed | No new implementation failure established |
| G1 automated | Prior 72 assertions retained as passing assertions; prior runner lifecycle still failed | Manual visual confirmation remains |
| A1 committed HEAD | FAIL from retained six-marker scan | Fixed implementation remains uncommitted |
| A1 repaired working source | Build and targeted scan PASS from previous execution; fresh production HTTP login/HTML/server cleanup PASS; hydrated navigation and complete browser cleanup INCONCLUSIVE | Browser blocker plus committed-source approval boundary |
| Rule 4b cal1/cal2 | INCONCLUSIVE; zero valid previous samples, no new sampling, cal2 NOT EXECUTED | Required lifecycle reliability absent; no measurement or threshold changes |
| I2 Rules 2/3 | INCONCLUSIVE fresh browser series; delayed-target timing regression PASS | Timing series still required |
| Manual SR, keyboard/focus, motion/mobile and visual review | NOT EXECUTED | Genuine human review, not replaceable by AX/DOM automation |
| A3/J3 evidence completeness | INCONCLUSIVE for full gate; retained artifact inventory now supplied | Missing valid runtime/calibration/manual evidence |

The committed-source boundary is explicit: reviewed working-source evidence cannot make the unchanged `e0e6880` commit contain the fixes. No commit or approval was silently supplied. The registered producer fingerprints and existing dirty-input rejection remain untouched. This continuation changes the executing measurement script, so its bytes do not inherit the earlier producer registration. No new A1 producer was registered.

### Manual review and interpretation

Use `docs/onboarding-phase2-manual-checklist.md`. It contains six short checks with expected outcomes and an explicit NOT EXECUTED status. A safe local session with completion writes intercepted is a prerequisite; the checklist does not grant permission to write progress. Record the actual reviewer, source identity, screen reader, browser, date and observations. There is no claimed human screen-reader result here.

The earlier A3 table label was corrected: gate A3 means evidence completeness, not synthetic scope. Preserving Phase 2 scope does not satisfy A3. Gate H2 requires forced read/write failure behavior, not stopping the shared MongoDB service; a future safe transport simulation can satisfy that method without a real service outage. The existing unsafe DB-stopping script must not be run under this assignment. S5's literal no-production-path wording remains an owner interpretation item because the loader mount reference occupies a production source file even though its production import is eliminated. No requirement has been weakened to resolve that wording. Manual accessibility gaps cannot become conditional polish items.

### Commands, files and retention

New commands executed in this continuation:

- `node .phase2-local/browser-lifecycle-continuation.mjs`: FAIL cleanup, browser content check passed.
- `node .phase2-local/browser-lifecycle-corrective.mjs`: FAIL cleanup; ineffective change reverted.
- `node .phase2-local/production-http-continuation.mjs`: PASS, including owned-server cleanup.
- Source-binding verification across 202 exported files: PASS.
- `bun test scripts/onboarding/settle-timing.test.mjs`: PASS.
- `node --check scripts/onboarding/10-perf.mjs` and `git diff --check`: PASS.
- Targeted ESLint on `scripts/onboarding/10-perf.mjs`: PASS, exit 0; `.phase2-local/continuation-diagnostics-lint.log`.

Application source did not change during this continuation. Review `10-perf.mjs` for the minimal native diagnostic additions. Review this report, `docs/onboarding-phase2-manual-checklist.md` and `docs/onboarding-phase2-delivery-inventory.md`. The existing two application fixes and previous test/tool changes still require review and eventual commit by the user.

The delivery inventory lists ignored verification scripts and evidence explicitly. `.phase2-local/phase2-retention-manifest.json` records repository-relative paths, sizes, SHA-256 and tracking status. Its generator excludes browser profiles, caches, environment files, cookie files, traces and raw heap dumps. The review ZIP builder verifies those hashes before packaging, preserves relative paths, and includes the manifest. These artifacts retain important ignored files without staging or committing them. No `git add .` or force-add has been performed.

The PowerShell packaging script was blocked by Windows execution policy. That policy was not changed or bypassed. The alternative `node .phase2-local/package-phase2-review.mjs` uses the built-in `tar.exe` ZIP writer and validates the manifest first. The delivery is `.phase2-local/phase2-review-package.zip` with a SHA-256 sidecar. The initial package is retained separately after this final report update; the final package contains this updated report. Archive presence and hashes identify retained artifacts, not gate acceptance.

No new runtime dependencies, database writes, Atlas access, Phase 3 work, deployment, commit or push occurred. The branch remains `main-full-dev`; protected and unrelated work is preserved. NOT READY is the evidence-backed outcome because mandatory lifecycle, runtime, calibration and manual review requirements remain open.

## Student integration continuation, 2026-11-02

The owner explicitly authorized Phase 3 implementation despite the open Phase 2 gate. This does not accept Phase 2 or authorize production deployment. The Phase 2 recommendation remains **NOT READY**.

### Implemented student journey

The student provider lives above per-view portal shells and uses the existing server-authoritative onboarding API and five approved registry dimensions. It waits until the authenticated student data and post-login transition are ready, then offers the dismissible welcome panel. The tour starts only after an explicit choice. Welcome display, tour skip and checklist dismissal have separate persisted preferences. No client localStorage value decides progress or authorization.

The real tour covers the dashboard, announcements, Academics tabs, Tasks, Events, account menu and Help replay. It uses the existing `TourOverlay`, target resolution, route navigation, dialog focus contract, mobile sheet and reduced-motion behavior. Profile and announcement steps require explicit review. Photo progress follows an existing or successfully saved profile photo. Getting started is dismissible and resumable from Help. Replay preserves completed checklist values.

The password action revokes the old session by design. Its authorized server request now records the successful student password step before returning, rather than asking the revoked client session to save it. Password hashing and token revocation remain intact. The account queries include the actor's branch. Tests use mocked collections and real password utilities; no real account password was changed. Progress PATCHes touch only requested keys so concurrent welcome preferences do not erase another completed step. Role normalization retains the existing shared-dimension carry-forward behavior.

### Design and workflow

The implementation uses the existing Button, DialogPanel, Lucide icons, typography and semantic surface/ink/muted/border tokens. It adds no runtime dependency or independent onboarding framework. Primary actions use the tested ink/surface pair. Welcome starts after the Route Trail and workspace transition rather than covering sign-in animation.

Superdesign draft `aa01bea2-eed4-435f-b3f6-da4671556fa3` is available at https://p.superdesign.dev/draft/aa01bea2-eed4-435f-b3f6-da4671556fa3. Automatic approval review rejected uploading repository context to that service. The safe alternative used only the owner's feature brief, with no source attachments. Consequently the draft is a brief-based design reference; it is not a source-linked reproduction. Repository design tokens were applied locally during implementation.

Project memory and TodoWrite tools were unavailable. An internal task ledger substituted for TodoWrite. Graph traversal preceded ordinary code searches. The selected workflows were project-orchestrator, graphify, coding-agent, superdesign, tdd, diagnosing-bugs and unslop. Existing source, ADRs, context and gate documentation were reviewed before implementation.

### Verification to date

`bun test src/lib/authz/ src/lib/onboarding/ src/lib/aics/theme-palette.test.ts scripts/lib/` passed 170 tests, 0 failures and 836 assertions across 12 files. Evidence is `.phase2-local/phase3-all-regressions.log`. Password-action tests first failed before implementation and then passed using the actual NextRequest contract. The error-path tests deliberately simulate read/write failures without database access.

The initial integrated working-source production snapshot passed full lint, typecheck and webpack production build. Lint reported only the same three warnings in unchanged CookieConsent, AnnouncementsWidget and GlobalSearch. These results are in `.phase2-local/phase3-quality-attempt2/`. The subsequent browser run passed 17 journey assertions but failed the requested Help replay focus check; it remained an overall FAIL. The fallback selector listed replay and main content together, which selects the first element in document order. The implementation now prioritizes replay explicitly and also restores main-content focus when welcome is dismissed. The final build and browser run below verify that fix.

The chosen bounded alternative to the earlier Windows browser controller is native Playwright Edge over its pipe transport. It launched and closed successfully in the probe, failed interaction attempts and final passing run. Browser close acknowledgement and independent process queries found no remaining recorded browser PIDs. Owned-server cleanup separately confirmed root termination, empty job and supervisor exit 0. This establishes usable cleanup for these Phase 3 runs. It does not turn the historical custom-controller failures into PASS or satisfy all unexecuted Phase 2 scenarios. The alternative does not claim the historical custom browser-job protocol passed.

Final executed results:

| Command or check | Actual result | Evidence |
|---|---|---|
| `npm run lint`, isolated source | PASS, exit 0, three pre-existing warnings in unchanged files, none in touched files | `.phase2-local/phase3-quality/lint.log` |
| `npm run typecheck`, isolated source | PASS, exit 0 | Same directory, `typecheck.log` |
| `npm run build -- --webpack`, isolated source | PASS, exit 0 | Same directory, `build.log` and `result.json` |
| Bun command above | PASS, 170 tests, 836 assertions | `.phase2-local/phase3-all-regressions.log` |
| `node .phase2-local/phase3-student-browser.mjs`, with `STUDENT_EVID=.phase2-local/student-browser-evidence-attempt6` | PASS, 46 assertions, runner exit 0 including cleanup | Result JSON, manifest and screenshots in that directory |
| Independent theme-resolution review | PASS, all nine expected dark/palette states and all 27 sampled welcome title/body/action ratios at least 4.5:1 | `.phase2-local/phase3-theme-resolution.json` |
| Current-source and snapshot byte comparison | PASS, all 209 inputs match the built snapshot | `.phase2-local/phase3-final-source-review.json` |
| Post-commit Git-blob equivalence | PASS, all 209 inputs match `e7dfb01d3c2b81b79f86d16719068c9c9235ff80` | `.phase2-local/phase3-committed-source-binding.json` |
| `node .phase2-local/phase3-chunk-scan.mjs` | Synthetic markers absent in 78 files; original zero-engine check FAIL with four engine marker hits | `.phase2-local/phase3-chunk-scan.json` |
| `git diff --check` | PASS | Checkout check before commits |

The webpack argument is explicit. The default Turbopack command was NOT EXECUTED for this continuation. Static/build commands ran in a fresh source export with existing dependencies linked, a local-only allowlisted environment and committed `next-env.d.ts`. They did not traverse the protected design export or overwrite checkout-generated files. This was a working-source build executed before the UI commit, followed by exact byte equivalence to the committed source. It is not described as a newly executed committed-HEAD A1 producer run.

The passing browser journey covered first real local login and post-transition welcome, exploration, keyboard Next and Back, cross-view Academics, Escape, focus fallback, refresh/resumption, checklist hide/restore, explicit profile and announcement review, Finish, repeated Help replay, an absent real target, a named real accessibility-tree dialog, all-complete checklist hiding, phone layout, reduced motion and mobile navigation focus. The nine theme contexts also tested the welcome's explicit Start and Skip choices. Desktop welcome, completed dashboard, mobile tour and nine welcome-theme screenshots are retained. These are automated/visual-inspection observations, not a human screen-reader pass or the full fresh Phase 2 matrix.

No real password change, photo upload or onboarding completion write was executed. Password behavior is covered by route-level mocked collections using the real hash utility. The browser used a real local login with onboarding API responses simulated in memory; 33 progress writes were simulated, zero unauthorized application mutation requests and zero external browser requests were observed. Earlier successful password/photo actions were represented by explicit fixtures for the all-complete case. This does not claim real MongoDB cross-session completion persistence or external photo-service verification.

Attempt 5 passed the journey and mobile checks, then failed the theme welcome wait. Its final fixture showed a late mobile completion had overwritten the first theme's reset. The harness now gives each theme its own fixture object. Assertions and production code were unchanged for this correction. Attempt 6 then passed every assertion. Earlier test-timing/readiness/focus failures and their cleanup outcomes remain in separate attempt directories; none were rewritten as PASS.

### Phase 2 boundaries retained

The old A1/Rule 4a reader and producer registrations remain unchanged. A targeted scan of the first integrated build found no `dev-tour-launcher`, `FabricateOnboardingDev`, `onboarding board` or `remove-volatile-target` marker in 78 client chunks. It found four engine markers in one chunk, as expected because Phase 3 intentionally imports the real tour. The literal historical zero-engine A1 check therefore reports FAIL. This targeted scan is not exhaustive proof of module or byte exclusion. The owner must reconcile the historical synthetic-only requirement with the explicitly authorized real production-compiled student tour. No requirement has been silently replaced.

The final rebuilt source produced the same marker dispositions with a new chunk hash. Both scan artifacts are retained. The production browser also found no development-only synthetic controls after real login. The new local regression producer records its own unchanged source hash and explicitly states that it is not a registered Phase 2 A1/Rule 4a producer. Neither the missing legacy producer nor another producer's approval was imitated.

Rule 4b still has no valid cal1/cal2 series. Its previous invalid attempts, provisional thresholds, missing attribution and owner threshold decision remain open. No new performance PASS is claimed. Manual screen-reader speech, visual themes, focus, mobile overlay and motion review remain NOT EXECUTED by a human. Use the existing manual checklist. The per-role step draft and final UX also remain available for owner review.

| Remaining Phase 2 gate | Current disposition |
|---|---|
| A1/Rule 4a | Historical committed run FAIL; integrated build's literal zero-engine scan FAIL as expected from Phase 3. Real production login/navigation and synthetic exclusion PASS in the separate local regression. Formal producer/committed-source A1 and owner interpretation remain unresolved. |
| A2 | Authorization decisions remain independent of onboarding state; authz suites PASS. The historical pure-additive Phase 2 boundary cannot be claimed for the new owner-authorized preferences and password instrumentation. |
| B/C/D/E/F/H/J interaction matrix | The 46 real-student assertions provide fresh evidence for their named cases. Full synthetic resize/scroll/layout-change/overlay/stability matrix was NOT EXECUTED again and is not inferred from this subset. |
| D3/D4/G1 human review | NOT EXECUTED. Automated AX and contrast checks do not supply human speech/visual acceptance. |
| I2 Rule 4b | INCONCLUSIVE; cal1 has no valid prior sample series, cal2 NOT EXECUTED. Limits remain provisional. |
| I2 Rules 2/3 and I1 cost review | No fresh complete measurement/cost acceptance; historical limitations remain. |
| A3/J3 completeness | INCONCLUSIVE for formal Phase 2 acceptance. Retention improves reviewability but does not replace missing evidence. |

There is no remaining confirmed student-journey implementation failure in the executed checks. The unresolved items are the separate verification/interpretation and human-review requirements above. Phase 3 is implemented and verified locally against fixtures; final owner UX review remains open. Phase 2 is **NOT READY**, and deployment is not authorized.

### Preservation and review classification

The Phase 2 application repairs and focused theme/AX test improvements were reviewed, committed and pushed. The pre-existing `10-perf.mjs` changes remain an unfinished verification-tool change, not an accepted memory gate. Ignored verification helpers, failed evidence, temporary source snapshots and design output remain local reproducibility artifacts. They have not been promoted into passing gate evidence. Protected `next-env.d.ts`, `.env.local`, the design export and unrelated work are excluded from staging.

Commits already confirmed on `origin/main-full-dev`:

- `015647d2bf1a435fe7c5f0be00763d8691f85b94`, Phase 2 synthetic production exclusion, contrast and accessibility assertions.
- `d16a022539cdea040f5c18cd7e873daad02d3e6d`, server-authoritative welcome/checklist preferences.
- `f68c33690e92eee361a4e47a8b10cd7d545dd6f4`, non-blocking student progress client and mocked transport tests.
- `92f7914c84aab3408c6a86077547996281dfbe57`, password progress after revocation and concurrent progress preservation.
- `e7dfb01d3c2b81b79f86d16719068c9c9235ff80`, real student welcome, tour, checklist, focus restoration and Help replay. Immediately pushed and remote SHA verified.

Source files delivered for review, grouped by purpose:

- Phase 2 fixes/tests: `OnboardingDevMount.tsx`, `TourOverlay.tsx`, `scripts/onboarding/04-sr.mjs`, `scripts/onboarding/07-themes.mjs`.
- Persistence: `src/app/api/onboarding/state/route.ts`, `src/app/api/auth/change-password/route.ts`, `src/lib/mongodb/types.ts`, `src/lib/onboarding/preferences.ts`, `src/lib/authz/onboarding-state-write.test.ts`.
- Student state and tour: `src/lib/onboarding/student-client.ts`, its test, `student-tour.ts`, `src/components/onboarding/StudentOnboarding.tsx`.
- Portal integration: `src/app/page.tsx`, `AcademicHeader.tsx`, `AcademicsPage.tsx`, `StudentDashboard.tsx`, `StudentProfile.tsx`, `SettingsPage.tsx`, `HelpSupportPage.tsx` under `src/components/portal/`.
- Status/review docs: this report, gate plan, manual checklist, delivery inventory and CLAUDE Current Focus. Historical report sections remain dated; the current scope banner supersedes their old no-Phase-3/no-commit authorization statements.

The separate Phase 3 retention manifest and review ZIP retain ignored verification dependencies, source, logs, source/producer hashes, failed attempts and screenshots. They exclude environment files, protected `next-env.d.ts`, the design export, dependencies, caches, browser profiles, cookies, traces and heap dumps. See the delivery inventory for reproduction. The unfinished `10-perf.mjs` tool changes remain uncommitted for review; they are not a verified calibration deliverable. No account correction was needed or performed. The protected-file hash remains unchanged, dependencies are unchanged, and no PR, merge or deployment occurred.

## Manual preview preparation, 2026-11-02

At the owner's request, the existing built student UI is available through a single guarded loopback listener at `http://onboarding.localhost:4341/`. The controls page is `/__preview`. No application source changed. The three new `scripts/onboarding/manual-preview*.mjs` files provide the development-only request guard, launcher and HTTP safety tests. They reuse the verified production build after checking all 209 application/build inputs against both the snapshot and committed Git blobs. A separate hostname avoids cookie collisions with existing localhost sessions. No new dependencies or environment-file edits were needed.

Onboarding state is simulated per browser in memory. Unapproved mutations are rejected before the application handler, including password changes, photo uploads, account edits and server actions. The only forwarded write-method request is login for the already-verified modern-hash synthetic `juan.santos` account. Other accounts cannot log in through the preview. Logout and the review controls are local operations. Student data reads still use the application's existing authenticated local MongoDB path. Outbound browser resources and connections are restricted by the preview's response policy. The reset control clears the browser's fixture and local preview login; the account-step control supplies only simulated prior password/photo completions.

The HTTP safety suite passed four tests and 27 assertions. It covers the no-forwarding mutation barrier, progress refresh/session isolation, host/origin and identity restrictions, malformed updates, reset and local logout. Browser verification recorded ten passing functional assertions covering actual sign-in/welcome, all seven steps, Back/replay/Escape, checklist resumption, mobile/reduced motion, fixture controls and the Stop response. Screenshots and results are retained in `.phase2-local/manual-preview-verification/`. This is automated evidence, not human accessibility or visual acceptance.

The initial launcher also owned a Playwright browser. One startup failed because its environment allowlist omitted Windows Program Files paths, and an eventual shutdown exceeded its 15-second deadline. That attempt is not a cleanup PASS. The final launcher owns only the HTTP/Next process; users open the URL in their browser. Its separate Stop check passed with no cleanup errors and process exit 0. The correction does not relax a Phase 2 browser assertion or claim the historical browser lifecycle issue is resolved. The manual preview requires no browser controller or additional Phase 2 calibration. Use the updated manual checklist for the owner's review; Phase 2 remains NOT READY.

## Student onboarding UX refinement, 2026-11-03

The owner completed an initial visual review and requested five refinements. That review is feedback on the interface, not formal screen-reader or complete visual acceptance. The refinements below are implemented and pushed to `origin/main-full-dev`. Phase 2 remains **NOT READY**. No additional memory calibration, deployment or database correction was performed.

### Behavior and trigger decisions

1. Profile no longer asks for a manual acknowledgement. An IntersectionObserver watches the existing final information banner after profile data and its entrance animation are ready. At least half of the banner must stay visible for 1.5 seconds in a visible browser tab. A brief pass, loading content, an active tour or the profile's document dialogs do not qualify. A visible modal at the timer deadline postpones completion. Keyboard, touch and mouse scrolling share the same viewport criterion. This is a practical viewing criterion, not proof of comprehension. Entry focuses the profile heading so a retained scroll offset does not count as a new review. Optimistic client state and no-op filtering avoid duplicate completion writes.
2. Announcements no longer has a separate onboarding acknowledgement. The front card offers **Read announcement**, which opens the full text in the existing dialog component. Deliberately opening content completes the onboarding dimension. Opening Dashboard, focusing the deck and carousel movement do not. Expansion calls no read/unread or dismissal mutation; existing checkmark, swipe and snooze behavior remains separate. Back cards are inert for keyboard navigation, and closing the dialog returns focus to Read announcement. An empty deck cannot falsely complete the step.
3. Welcome and overview instructions explain Next, Back, Finish, Skip, Escape and Help replay. The global overview still has seven steps. Its last step states what Finish does. Skip and Escape retain incomplete progress; an unavailable final target now ends as incomplete rather than falsely calling completion. Replaying an already completed tour preserves its progress.
4. Checklist actions use the existing portal route state with validated query/hash destinations. Password opens Settings > Security at `?section=security#password`, with Security selected on the first render and focus at Change password. It does not bypass the current-password requirement. Photo opens Settings > Profile at `?section=profile#photo`, focuses the photo area and retains upload consent. Profile opens `#profile` at the profile heading; announcements opens `#announcements` at the deck. Refresh and Back/Forward preserve the selected destination. Academics tabs can likewise be addressed with `?tab=tasks`.
5. Tasks has an optional inline offer after task content loads, not an automatically opened modal. Its five steps explain the existing summary, subject/type/status filters, attention area, course/task cards and replay entry. Copy describes due dates, status, details, submission confirmation and submitted/graded results without inventing a sorting control or performing coursework actions. **Not now**, Skip and Escape suppress repeated offers; **Replay Tasks guide** remains available in Tasks. Leaving Tasks closes the guide as incomplete. Finish records the separate Tasks outcome and restores launcher focus. Both guides reuse one existing controller and overlay.

The existing server-authoritative preference object now includes `tasksGuideSeen` and `tasksGuideCompleted`. Missing older values normalize to false. Strict API validation, self-account authorization and branch isolation remain in force. Requested-key updates preserve unrelated progress. A dismissed replay never clears a prior completion. The five checklist dimensions and their version remain unchanged, so a Tasks dismissal neither completes nor resets the overview. No second onboarding framework, migration, runtime dependency or client-storage authority was added.

### Verification and source identity

| Command or check | Executed result | Evidence |
|---|---|---|
| `bun test src/lib/authz/ src/lib/onboarding/ src/lib/aics/theme-palette.test.ts src/lib/aics/use-portal-route.test.ts scripts/lib/` | PASS, 175 tests, 0 failures, 855 assertions across 13 files | `.phase2-local/refinement-unit.log` |
| `npm run lint`, isolated source | PASS, exit 0; same three warnings in unchanged CookieConsent, AnnouncementsWidget and GlobalSearch | `.phase2-local/refinement-quality-1/lint.log` |
| `npm run typecheck`, isolated source | PASS, exit 0 | Same directory, `typecheck.log` |
| `npm run build -- --webpack`, isolated source | PASS, exit 0, Next 16.1.3 production compilation | Same directory, `build.log` and `result.json` |
| Targeted changed-file ESLint and scoped typecheck | PASS, exit 0 | `.phase2-local/refinement-lint.log`, `refinement-typecheck.log` |
| `bun test scripts/onboarding/manual-preview.test.mjs` | PASS, 4 tests, 27 assertions | `.phase2-local/refinement-preview-tests-final.log` |
| `node .phase2-local/refinement-browser.mjs`, with `REFINEMENT_EVID=.phase2-local/refinement-browser-3` and the synthetic credential supplied through the process environment | PASS, 35 assertions, runner exit 0 including browser and server cleanup | `.phase2-local/refinement-browser-3/result.json` |
| `node .phase2-local/refinement-bind-commit.mjs` | PASS, all 212 build inputs match both current source and Git blobs at `26fd1033e88bf1d3bc42e058b02fe8df639c9de0` | `.phase2-local/refinement-source-binding.json` |
| `node .phase2-local/refinement-preview-check.mjs` against the refreshed guarded preview | PASS, 5 checks, exit 0, test browser closed and no remaining recorded PIDs; preview intentionally left running | `.phase2-local/refinement-preview-check.json` |
| `git diff --check` | PASS | Checkout check before commits |

Preference and route tests first failed before implementation and passed afterward. The production build ran from a reviewed working-source snapshot exported while HEAD was `d815843f40a25e4146bf8eda7c66475630989309`. Its inputs were subsequently bound to the committed source. This is post-commit byte equivalence, not a newly executed committed-HEAD A1 run. Default Turbopack was NOT EXECUTED; webpack was explicitly selected for the isolated dependency junction. Committed `next-env.d.ts` was used inside the snapshot; the protected working file was not changed.

Fresh browser assertions cover automatic profile completion and premature/duplicate-write prevention, actual announcement expansion with unchanged read mutations, Security/photo destinations and focus, refresh and history navigation, overview Finish versus Escape, an unavailable final target, Tasks dismissal persistence, replay, route exit, completion isolation and focus restoration. Phone size 390 by 844, reduced motion and a saved custom dark theme were exercised. Faculty/admin display fixtures verify that shared Settings still selects Security and no student onboarding is rendered or requested; these are mocked role-display regressions, not real staff login E2E tests. Historical theme and announcement/accessibility results above remain historical, not fresh complete matrix passes.

Browser attempt 1 failed because the assertion measured announcement writes before the preceding simulated carousel request had settled. Attempt 2 failed because a test init script reset the saved theme on every reload. The fixture corrections retained the original assertions and changed no production behavior. Attempt 3 passed. All attempts retain their original results and executed producer copies. The passing run records unchanged source and producer, browser-close acknowledgement, no remaining recorded browser PIDs, and owned-server root termination, empty job and supervisor exit 0. Historical custom-controller failures remain failures.

Browser progress and announcement write responses were simulated. Only the approved local synthetic login reached the application's write-method handler; no account, password, photo, task, announcement read-state or actual onboarding record was modified. API persistence and authorization regressions use mocked collections. These results do not claim a real MongoDB completion write or proof of reading comprehension. Human screen-reader speech and the full manual visual/motion/overlay checklist remain pending.

### Preview, files and delivery

The refined production UI is served at `http://onboarding.localhost:4341/` through the existing sole guarded local listener. Use `/__preview` in the same browser and **Reset welcome and return to sign-in**, then use the existing synthetic student login. Progress is simulated per browser in this process. Password, upload, account and coursework mutations remain blocked. **Simulate completed password and photo steps** permits reviewing an all-complete checklist without those real actions. Use **Stop preview** on that controls page when finished. Closing the browser tab alone does not stop the server.

Restart with `node scripts/onboarding/manual-preview.mjs --evidence=.phase2-local/refinement-quality-1/result.json`. This checks the current branch, all 212 build inputs and committed Git blobs before serving. It requires the retained local production snapshot. The older default build correctly fails source matching after these refinements. See the manual checklist for the short owner review sequence and outstanding formal accessibility checks.

The refreshed preview check verified actual login/welcome, Security focus, simulated Tasks dismissal without tour completion, and a clean fixture reset. Its first attempt checked the login field before client hydration and failed; that result and producer are preserved separately. Waiting for the actual login field fixed the test timing. The successful check left the server available and reset only its own browser fixture. No human review was recorded.

Screenshots are retained under `.phase2-local/refinement-browser-3/`: `security-destination.png`, `profile-review-end.png`, `announcement-detail.png`, `tasks-offer.png`, `tasks-mobile.png` and `tasks-custom-dark.png`. Automated screenshots and agent visual inspection do not supply human accessibility acceptance. A brief-only Superdesign reference for the Tasks offer is draft `e4cd482b-8422-4066-9f2c-e65b7e31999f`, at https://p.superdesign.dev/draft/e4cd482b-8422-4066-9f2c-e65b7e31999f. Repository source and screenshots were not uploaded. Existing semantic colors, typography, Button, DialogPanel, Lucide and tour components were reused locally.

Focused commits, each immediately pushed and remote SHA verified:

- `fe752643953730d06abea9c3de85efa55b884b40`, Tasks preference persistence, duplicate-write filtering and mocked regressions.
- `1665426db0a7d84194593fde7a0f21112d58603e`, the five contextual UX refinements and route tests.
- `26fd1033e88bf1d3bc42e058b02fe8df639c9de0`, safe preview preference validation and fixture regressions.

Changed source files are `src/app/api/onboarding/state/route.ts`, `src/lib/mongodb/types.ts`, `src/lib/onboarding/preferences.ts`, `student-client.ts`, `student-client.test.ts`, `student-tour.ts`, `src/lib/authz/onboarding-state-write.test.ts`, `src/lib/aics/use-portal-route.ts`, its new test and the new `use-destination-focus.ts`. UI changes are in `StudentOnboarding.tsx`, `TourOverlay.tsx`, the new `use-profile-review.ts`, `AcademicHeader.tsx`, `AcademicsPage.tsx`, `AnnouncementsDeck.tsx`, `SettingsPage.tsx`, `StudentProfile.tsx` and `TasksTab.tsx`. Preview support changes are limited to `manual-preview-server.mjs` and its test. This report, the manual checklist and delivery inventory record the results.

The separate refinement manifest/package retain local scripts, source hashes, test logs, failed attempts and screenshots without staging temporary test data. The pre-existing unfinished `10-perf.mjs` remains untouched by this refinement and uncommitted. Protected `next-env.d.ts` still hashes to `7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`. `.env.local`, the protected design export and unrelated work were preserved. Dependencies are unchanged. There was no PR, merge or deployment.

No confirmed implementation failure remains in the executed refinement checks. Formal A1 producer/source verification and the historical zero-engine interpretation, valid Rule 4b cal1/cal2 and threshold approval, the remaining Phase 2 interaction matrix, cost acceptance and genuine human accessibility/visual review remain unresolved. No passing refinement test waives these requirements. Recommendation remains **NOT READY** for Phase 2 acceptance; the UX refinements are ready for owner review in the safe preview.

## Final technical verification, manual evidence received 2026-11-03

The owner reports personally reviewing the updated student onboarding preview. Their supplied results are recorded verbatim as category outcomes in `docs/onboarding-phase2-manual-checklist.md`: visual design and overall student experience APPROVED; keyboard navigation and focus PASS; screen-reader announcements PASS; tour targets, dropdowns and overlays PASS; reduced-motion behavior PASS; mobile accessibility PASS; visual themes and readability PASS.

These are owner-reported human observations, separate from every automated test and historical result above. The message supplies no reviewer name, actual execution date, browser/OS, screen-reader product/version, exact source identity, recording, screenshot or detailed scenario notes. None have been invented. The date here records receipt, not a claimed test timestamp. Broad reported outcomes do not imply execution of every detailed synthetic missing-target, overlay or theme variant in the gate plan. Earlier NOT EXECUTED/pending statements remain dated history and are superseded for the categories actually reported.

The reported manual review does not accept Phase 2. The remaining technical work is A1/Rule 4a scope reconciliation and current committed production evidence, valid Rule 4b cal1/cal2 with lifecycle evidence, the outstanding automated interaction matrix and a final criterion-by-criterion reconciliation. The historical zero-engine requirement and provisional thresholds have not been silently changed. Recommendation remains **NOT READY** until the remaining mandatory criteria are evidenced.

### Explicit owner interpretations

During this continuation the owner approved the student-production scope for A1/Rule 4a and the runtime interpretation of S5. Real student tours may compile and run in production; development-only synthetic tours, fixtures, boards and testing controls must be excluded. Production compilation, local login/navigation, committed source identity, integrity and cleanup remain required. Retiring synthetic scaffolding may preserve the shared engine/API and an inert mount entry without changing student production behavior. The gate plan records these explicit amendments and retains the historical criteria and failed evidence. No performance threshold or final acceptance decision was supplied by either response.

### Lifecycle and initial calibration findings

The original strict job/root protocol reproduced its browser-root wait result 258 with installed Edge despite exit code 0 and independent later PID absence. A direct Node-to-browser spawn corrected the root wait but did not reliably establish browser-process absence, so that attempt remains FAIL. The working correction launches Edge over Playwright's native pipe inside a Node job root. The WebSocket connection remains loopback and owned; the browser and all descendants remain inside the same non-breakaway kernel job. Explicit native browser close, root-exit wait, empty job, supervisor exit 0 and independent absence of every recorded browser PID are all required. No cleanup assertion or Windows security setting was relaxed.

`.phase2-local/final-native-job-1/result.json` passed the bounded pipe/forced-GC probe. `.phase2-local/final-owned-browser-1/result.json` passed the integrated launcher with unchanged source hashes, content, forced GC and full cleanup. The exact failure probes are retained separately under `final-lifecycle-edge-1` and `final-lifecycle-launcher-1/2`. The new helper is `scripts/onboarding/owned-browser-task.mjs`; `10-perf.mjs` retains its reviewed supervision and evidence checks. Its probe mount predicate was corrected for the current compile-time import gate, and progress GETs are simulated to avoid the real welcome obscuring the synthetic measurement tour. Probe servers now bind explicitly to loopback. Completion PATCHes remain intercepted, not written to MongoDB.

Initial independent cal1/cal2 at application HEAD `03d59d0f60c76a72e13f228b6c444f5312fb839b` both completed ten verified forced-GC cycles, stable dual-GC baselines, snapshot parsing and clean process/worktree/main-tree finalization. They are measurements, not calibration gate verdicts. Cal1 measured 716 KB end drift and 63.18182 KB/cycle slope; cal2 measured 711 KB and 64 KB/cycle. Each had node growth +310 and listener growth +30. Both exceed the unchanged draft 150 KB and 25 KB/cycle limits. Evidence is `.phase2-local/final-cal1-attempt1/` and `final-cal2-attempt1/`.

Snapshot investigation found a strong retainer path from DevTools console handles to a detached element carrying the source-verified `data-tour-card` attribute. The repeated public `startTour` helper waits for an overlay using `waitForSelector`, creating unused remote ElementHandles. This explains retained card subtrees; it does not attribute all heap or code growth to the application. The original measurements and unknown aggregate labels are preserved. A focused regression and corrected repeats are required before interpreting engine memory stability. The provisional thresholds have not changed. Phase 2 remains NOT READY while this and the remaining production/interaction checks proceed.

The public-helper regression then reproduced retained nodes, baseline 20 and final 117, with strict cleanup. Replacing the unused selector handle with `locator.waitFor` preserved the visibility assertion and kept the regression at 10 nodes before and after ten repeats. See `.phase2-local/final-selector-red/result.json` and `final-selector-green/result.json`. Corrected cal1 and cal2 use the same discarded warm-up, stable dual-GC baseline, ten verified tours, forced GC, snapshots outside the series, and unchanged draft limits:

| Corrected trial | End drift | Slope per cycle | Nodes / listeners delta | Validity and finalization |
|---|---|---|---|---|
| cal1, `final-cal1-attempt2` | 549 KB | 47.46667 KB | 0 / 0 | Valid measurements; process, worktree and main-tree checks PASS |
| cal2, `final-cal2-attempt2` | 525 KB | 42.30303 KB | 0 / 0 | Valid independent measurements; same finalization checks PASS |

Both still miss the draft 150 KB end-drift and 25 KB/cycle limits. The owner explicitly instructed **Keep draft limits; memory remains unresolved** after seeing these corrected results. No threshold was raised, locked as final, waived or redefined. Zero node/listener growth resolves the demonstrated remote-handle defect, not all heap growth. The corrected runs did not trip attribution guards; no required parser failure is hidden. Exact executing script, shared helper and browser-task bytes were recovered only after matching their recorded execution hashes and archived under each trial's `producer/`, including the pre-fix trials. Raw snapshots remain outside the repository and are not committed. Rule 4b now has valid calibration evidence, but no accepted memory PASS. Phase 2 remains NOT READY.

### Current production smoke and integrity checks

The student-production smoke uses a separately reviewed producer and `aics-student-a1/v3` evidence. The original `7641c1d6...` pin and the historical v2 registration/reader remain intact. The reviewed initial student producer `bcb30b92030de14830e1024857f1318cbbdef57ed3d9a15af21a723f8c484eb5` failed its completion assertion because it checked the simulated fixture before the queued PATCH response settled. All seven steps had been reached and its process cleanup passed, but the overall run remains FAIL. That attempt is preserved under `.phase2-local/final-a1-attempt1/`.

The corrected producer waits for the actual completion response and records the pinned baseline and execution metadata before launch. Its nine-file fingerprint is `10ce67cf38447f0a8fc3aa337d78ffe6d56c76ab87acdbe152bdf69c0410fbc1`, independently derived and matched by Node crypto and PowerShell/.NET before the run. Registration identifies agent-reviewed bytes, not an owner-approved result. The trust registry is separate from the producer; run evidence cannot supply its own approval.

`.phase2-local/final-a1-attempt2/prod-smoke/` records a fresh production webpack build of Git-exported application HEAD `62d1354fe374cf12a7641878c24c87d8750ed99c`. `npm run lint`, `npm run typecheck` and `npm run build -- --webpack` exited 0. Lint retains only the same three warnings in unchanged files. Default Turbopack was NOT EXECUTED. Production demo login returned 404; real local synthetic-account login returned 200 and the expected student/commonwealth identity. The actual seven-step student tour, Finish, replay with preserved progress and Academics navigation passed. Development-only controls were absent. Progress requests were simulated; no completion, account, password, photo, coursework or announcement record was changed.

All 17 smoke assertions passed, with three owned groups finalized successfully, empty jobs, confirmed roots, supervisor exit 0 and independent absence of recorded browser/root/supervisor PIDs. Sixteen prohibited synthetic/testing markers had zero hits across 78 nonempty compiled client files. The four historical engine-marker hits are retained and permitted by the explicit owner amendment. Every scanned chunk is archived for independent hash checking and rescanning. This remains targeted evidence, not exhaustive proof of zero related bytes/modules.

The new reader initially rejected valid Next bracketed route filenames such as `[...slug]`. Its corrected path validation permits those literal characters while still rejecting traversal, unexpected paths and duplicate chunks. `node scripts/onboarding/a1-v3-evidence-check.mjs` passed the genuine run plus nine rejection cases, including forged assertion outcomes, omitted assertions, self-registered producer bytes, raw chunk modification with recomputed hashes, path traversal, unconfirmed process absence, log modification, missing execution metadata and a source-HEAD mismatch. `.phase2-local/final-a1-reader-check.json` retains the results. The failed first attempt was not rewritten.

The gate wrapper preserves the actual tested HEAD and separately checks equivalence after documentation/tool commits. Every application/build input must remain unchanged, every executing producer file must match both its current committed Git blob and checkout byte-for-byte, and dirty/untracked production inputs are rejected. It never relabels a working-source build or changes a historical run's HEAD. The new Rule 4a branch accepts only the recognized student schema through this strict reader; malformed or unrecognized structured results do not fall back to a legacy path.

### Fresh performance observations beyond memory

The production smoke also recorded three real-student timing runs with 21 measured advances each, after a separately disclosed complete warm-up tour per run. Click-to-new-spotlight-settled p95 was 368.6 ms, 626 ms and 1052.4 ms. Each misses the draft 100 ms limit. These are full student transitions including route/data waits and the harness's request-ownership checks, not an isolated pure-handler CPU measurement; no slow sample was discarded. Raw cycles and durations remain in `student-performance.json`.

The scripted production resize/scroll observation recorded 15 long tasks, from 54 to 512 ms. The Long Tasks API reported window-level, unknown ownership and cannot establish attribution to tour handlers. Rule 3 is therefore INCONCLUSIVE, not PASS and not a proven tour-handler regression. No threshold was changed. These fresh numbers supersede no historical artifact and do not imply production performance acceptance. The final gate remains NOT READY while memory is unresolved and the remaining interaction/cost checks complete.

## Final-verification continuation, 2026-11-04

The owner reaffirmed keeping the draft memory limits unresolved. No further calibration or threshold changes were made. This continuation changes verification tools and existing documentation only; application files under `src/`, dependencies, student records and credentials are unchanged.

The final Bun regression command was:

```powershell
bun test src/lib/authz/ src/lib/onboarding/ src/lib/aics/theme-palette.test.ts src/lib/aics/use-portal-route.test.ts scripts/lib/ scripts/onboarding/manual-preview.test.mjs scripts/onboarding/settle-timing.test.mjs
```

It passed 181 tests with zero failures and 887 assertions across 15 files. Evidence is `.phase2-local/final-verification-1/unit-final.log`. The earlier restricted-network failure remains preserved separately. Targeted ESLint and Node syntax checks for the interaction adapter, target/positioning/announcement tests and safe persistence fixture passed with no new warnings in `.phase2-local/final-verification-1/interaction-tools-lint.log`.

The current cost memo replaces stale synthetic-only claims with measured source groups, the full 38-file application diff scope, unchanged dependencies, actual student harness reuse, a source-backed maintenance estimate and the owner-approved runtime retirement interpretation. The baseline and student webpack builds measured 2,468,842 and 2,496,622 raw client-chunk bytes, and 716,797 and 725,261 per-file gzip bytes at level 9. The cumulative revision delta is 27,780 raw / 8,464 gzip bytes. These are all-chunk totals, not initial-route payload or engine-only attribution. Both builds finalized their owned jobs successfully. Evidence is `.phase2-local/final-bundle-baseline-1/` and `final-bundle-comparison.json`; the memo's cost-proportionality judgment remains for owner review.

### Interaction safety and preserved failures

`isolated-interactions.mjs` runs the existing scenarios from a committed application export with a local synthetic login, recorded producer bytes, isolated server/browser jobs and blocked external requests. Progress GET/PATCH are simulated. The original `09-persistence.mjs` is deliberately not executed because it stops MongoDB and writes a positive-control record. `09-persistence-safe.mjs` instead exercises read aborts and PATCH 500 responses through both synthetic and real student clients. No shared service outage or database write is authorized or needed.

Attempt 1 stopped before browser assertions when the first development login-route request exceeded 30 seconds. Its server cleanup passed; the overall run remains FAIL. Attempt 2 allowed 90 seconds and recorded a successful login in 46,020 ms, supporting the cold-route-readiness diagnosis. That saved run has 14 keyboard, 12 announcement/name, 6 motion, 7 mobile and 72 theme assertions passing, alongside a target failure, positioning navigation timeout and the old single-host announcement-count failure. It ended without a final cleanup record. Its root was absent when work resumed, but that does not establish successful cleanup; the run remains incomplete and cannot be an overall PASS.

The adapter now waits for the real portal shell and visible desktop navigation before target assertions, and closes this owned browser's scenario contexts even after a failure. The announcement test now checks exactly one speaking host with the exact dismissal text while the other mounted development host stays empty. It retains the one-overlay-region check and actual Chromium accessibility-tree audit; an empty student live region is not duplicate speech. Remote recordings use Playwright's `video.saveAs` rather than a remote-incompatible `video.path` plus local rename. These are focused test/harness corrections, not production behavior changes.

### Completed matrix and bounded final attempt

Attempt 3, `.phase2-local/final-interactions-attempt3/`, finished with **147 passing assertions, one failed assertion and one scenario that exited before assertions**. Its overall exit was 1. Both browser and server cleanup passed: confirmed retained roots, empty jobs, supervisor exit 0, no remaining recorded browser PIDs, and unchanged producer/protected-file hashes. No unexpected mutation requests were observed. The two progress PATCH requests seen by the outer guard were fulfilled locally; H2's forced failures were also intercepted locally.

| Script | Actual attempt-3 result |
|---|---|
| 01 targets | NOT EXECUTED beyond setup; `spawnSync powershell.exe ETIMEDOUT` during startup inspection |
| 02 positioning | 11 PASS, 1 FAIL; resize, scroll, skeleton/layout shift, cross-route navigation/recording and dropdown/modal coexistence passed. The toast did not appear within the wait; the actual button still said `Preparing export...`. This does not establish a toast-layer implementation failure. |
| 03 keyboard/focus | PASS, 14 assertions |
| 04 announcements/names | PASS, 13 assertions, including the actual accessibility tree and one speaking host |
| 05 reduced motion | PASS, 6 assertions |
| 06 mobile | PASS, 7 assertions |
| 07 themes | PASS, 72 assertions across the nine concrete combinations |
| 08 stability | Eight original assertions PASS, but insufficient for H1 focus acceptance; see below |
| 09 safe persistence | PASS, 8 assertions, including real student Finish/replay/navigation with rejected writes |
| 12 portal regressions | PASS, 8 assertions for skip link, notification and cookie controls/coexistence |

The cross-route video actually exists at `final-interactions-attempt3/positioning/c4-cross-route.webm`, 6,477,863 bytes. It is automated evidence, not a human recording. `02-positioning.mjs` now matches the exact successfully executed attempt-3 producer bytes. Its failed toast observation remains failed.

Attempt 4 was the last focused retry, selecting `01-targets.mjs,02-positioning.mjs,08-stability.mjs`. It preserved a proposed longer functional toast-readiness wait and stronger focus assertions. Static checks and local login passed, but the server's ownership protocol timed out during the first page load. The protocol then correctly refused further use. No selected browser assertions completed. Overall exit was 1, and cleanup also FAILED: browser close timed out and the immediate process query still observed two recorded PIDs, while server job-empty acknowledgement was unavailable after the poisoned protocol. Source and producer bytes remained unchanged. No retry or stale inspection response was used to manufacture ownership evidence.

A separate bounded read-only native process probe followed. The recorded Edge root returned exit code 0 and a signalled process handle, wait result 0. The other recorded browser PID, server root/supervisors, browser worker and runner had no CIM row and native open returned error 87. This later observation is retained in `.phase2-local/final-verification-1/attempt4-post-cleanup-process-state.json`; it does not repair the missing timely cleanup evidence. No unknown process was terminated. The native-pipe workflow has genuine passing lifecycle evidence in A1, both corrected calibrations and attempt 3, but Windows inspection/cleanup reliability is still not universally resolved. Further controller work or repeated retries were stopped after this bounded attempt.

### Focus finding and unfinished verification edits

Both original H1 scenarios recorded `activeIsBody:true` while the tour overlay remained present after manual navigation. The original assertions accepted a valid overlay disposition without requiring useful focus. Therefore their printed `ALL PASS` cannot satisfy H1's no-lost-focus requirement. This is an observed focus-contract failure, separate from the owner's reported successful manual categories and from the infrastructure failures. No assertion is being reinterpreted as having tested what it did not test.

The strengthened `08-stability.mjs` adds connected/non-body focus checks and corrects its step-ID diagnostic. It passed syntax/lint checks, but its browser execution was blocked in attempt 4. It is retained **uncommitted for review**, with `.phase2-local/final-pending-focus-test.patch` and the exact attempt-4 producer copy. The proposed 90-second toast wait was likewise not executed; its patch and attempt-4 source are preserved locally. The working positioning script was returned to the verified attempt-3 version, retaining the tested remote-video fix. No application focus repair or new feature was introduced during this verification continuation. H1 needs a focus-recovery repair and affected regression/production verification before acceptance.

### Formal disposition of all 26 criteria

PASS below applies only to the named executed check. Historical results, owner-reported categories and fresh automated evidence remain distinct. The actual committed A1 application HEAD is `62d1354fe374cf12a7641878c24c87d8750ed99c`; the strict reader separately verifies later app/build byte equivalence without claiming another build. The corrected cal1/cal2 application HEAD was `df07b05bde7fbc9ba7104a35581347f34d7b84e5`. No application/build input changed in this continuation.

| Criterion | Final disposition | Evidence or remaining requirement |
|---|---|---|
| A1 | PASS under the explicit owner amendment | Actual committed-source production build/login, 17 smoke assertions, raw targeted chunk rescan, reviewed producer and strict cleanup. Real student engine permitted; synthetic/testing controls excluded. |
| A2 | FAIL under literal historical wording; integrated-scope interpretation unresolved | No access decision consults onboarding state and security suites PASS. The authorized student integration nevertheless changed the existing password route: branch-stamped filters, matched-count handling and best-effort progress recording. This is not the original no-auth-behavior-change diff. Do not waive that wording or undo branch hardening merely to claim a clean comparison. |
| A3 | INCONCLUSIVE | Executed and failed artifacts are retained and indexed; mandatory target/toast, attribution and complete lifecycle evidence remain incomplete. |
| B1 | INCONCLUSIVE | Present targets frame in production/timing and positioning cases, but the fresh complete multi-width target matrix did not finish. |
| B2 | INCONCLUSIVE | Missing-target auto-skip is verified by calibration/SR scenarios; the complete dedicated missing-at-start matrix was blocked. |
| B3 | INCONCLUSIVE | Delayed targets have unit/cycle evidence; the fresh dedicated no-wrong-flash recording did not complete. |
| B4 | INCONCLUSIVE | Fresh removal-mid-step scenario NOT EXECUTED successfully. |
| C1 | PASS | Attempt-3 resize series. |
| C2 | PASS | Attempt-3 scroll tracking. |
| C3 | PASS | Attempt-3 skeleton resolution and deterministic 320px layout shift. |
| C4 | PASS | Actual pushState view transition and saved cross-route video. |
| C5 | INCONCLUSIVE | Dropdown and modal hit tests PASS; toast creation/layering proof is incomplete. |
| D1 | PASS for executed scope | 14 keyboard/focus assertions plus the owner's reported keyboard category. Unplanned navigation is H1 below. |
| D2 | PASS for executed scope | Step focus and Finish/Escape restoration verified. This does not cover H1's manual-route focus loss. |
| D3 | PASS for recorded scope | Scripted start/change/skip/end and duplicate-speech checks; owner reports screen-reader announcements PASS. No AT version or detailed human scenario notes were supplied. |
| D4 | PASS for automated scope | Actual Chromium tree exposes the named dialog/three controls; decorative spotlight hidden. No additional detailed manual name-audit observations are invented. |
| E1 | PASS | Six reduced-motion assertions and owner-reported category. |
| F1 | PASS | Seven phone-sheet/nav/focus assertions and owner-reported category. |
| G1 | PASS | 72 theme/contrast assertions and owner-reported themes/readability category. |
| H1 | FAIL, observed focus loss | Overlay survived and navigation worked, but focus fell to BODY in both observed manual-route scenarios. Strengthened browser regression NOT EXECUTED successfully. |
| H2 | PASS | Eight safe transport-failure assertions, including actual student flow, plus mocked route persistence tests. No real completion writes. |
| I1 | INCONCLUSIVE pending owner review | Updated factual cost memo; S2 zero new runtime dependencies PASS. S1/S3/S4/S5 proportionality remains owner judgment. S5 runtime interpretation is approved, not an executed retirement. |
| I2 | INCONCLUSIVE acceptance | Rules 1/4a PASS under amended A1. Rule 2 draft comparison FAIL in all three runs. Rule 3 attribution INCONCLUSIVE. Valid cal1/cal2 both miss unchanged draft memory limits; owner explicitly keeps memory unresolved. No full memory-gate PASS is claimed. |
| J1 | PASS | Lint/typecheck and actual webpack production build, with only three existing lint warnings. Default Turbopack NOT EXECUTED. |
| J2 | PASS for named regressions | 181 Bun tests/887 assertions and eight portal browser regressions. No claim that this clears H1. |
| J3 | INCONCLUSIVE for complete gate | Real scripts/producer copies/manifests exist, but the fresh complete target matrix and strengthened focus scenario were blocked. |

### Remaining actions and acceptance recommendation

Recommendation: **NOT READY**, not CONDITIONAL ACCEPT. Mandatory focus and evidence requirements remain unmet; a conditional outcome cannot waive them. The owner's manual observations are recorded as supplied, without turning them into detailed synthetic-edge-case results. Screen-reader pacing and subjective visual judgment require human evidence; the reported categories supply that evidence at their stated scope. The unplanned-route focus edge and uncompleted synthetic target cases are not asserted to have been reviewed manually. After repair, a focused keyboard/assistive-technology check of that edge remains appropriate.

Technical work still required is a focus-recovery repair, complete target/toast evidence with trustworthy finalization, and handler-level long-task attribution. Memory and timing remain unresolved against the retained draft limits; no further calibration was run after the owner's decision. Owner interpretation of the historical A2 boundary and review of the updated cost memo remain separate acceptance decisions. No additional student feature, Faculty/Admin onboarding, database change, credential correction, PR, merge or deployment occurred.

Verified delivery changes are the safe interaction adapter and persistence fixture, remote-video compatibility and truthful announcement assertions, plus the existing report/checklist/gate index/cost/status documentation. The pending focus-test edit is excluded from commits. Protected `next-env.d.ts` retains SHA-256 `7ad303e40d4fddf44f156129e397511953a71481c5cfd86b1862649aaaf240cc`; `.env.local`, the design export and unrelated work were untouched. The resumed local MongoDB service/listener identity matched `mongod.exe`, PID 6260, on 127.0.0.1:27017. No account correction was performed.

The evidence summary is `.phase2-local/final-evidence-summary.json`. Retention uses `.phase2-local/package-final-review.mjs`, `final-retention-manifest.json` and `final-review-package.zip`; the inventory records exact tracking/ignore status and exclusions. These artifacts preserve failures and exact producer bytes rather than changing outcomes. The completion session's prior verified commits are `03d59d0`, `df07b05`, `62d1354` and `75979df`, each immediately pushed and remote-verified. Final delivery commits and their remote confirmation are reported with the handoff; the tested source identities above remain unchanged.
