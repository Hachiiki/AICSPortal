# Phase 2 completion assessment

Current owner scope, 2026-11-02: Phase 3 student onboarding development is explicitly authorized on `main-full-dev`. Phase 2 remains **NOT READY**. The dated records below describe earlier assignments and their authorization boundaries; their statements that Phase 3 or commits were unauthorized are historical. See the student-integration continuation at the end for the current implementation and verification status.

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
