# Phase 2 cost memo

Updated during final verification on 2026-11-03. Facts use application commit `62d1354fe374cf12a7641878c24c87d8750ed99c` and pinned baseline `46c33a53c5a502c4a6e5937bdeb7b81e2a82622f`. Later tooling/documentation commits do not change these application inputs. Exact counts and hashes are in `.phase2-local/final-verification-1/cost-facts.json` and `.phase2-local/final-bundle-comparison.json`. This replaces the earlier synthetic-only cost assessment. Owner review of cost proportionality remains required.

## Measured facts

| Source group | Bytes | Lines |
|---|---:|---:|
| TourOverlay.tsx | 15,193 | 388 |
| tour/geometry.ts | 4,289 | 132 |
| tour/steps.ts | 2,457 | 64 |
| Engine core total | 21,939 | 584 |
| Development synthetic host OnboardingDev.tsx | 10,017 | 265 |
| Development mount OnboardingDevMount.tsx | 1,132 | 34 |
| Largest baseline interactive component, SettingsPage.tsx | 44,396 | 928 |
| Baseline TasksTab.tsx | 32,893 | 594 |
| Baseline EnrollmentPage.tsx | 25,157 | 647 |

These are source sizes. The engine-core subtotal excludes the registry, persistence API, real student controller/content, portal hooks and tests. It is not bundle size or retained heap. The full source diff spans 38 files under `src/`; per-file additions/removals are in `cost-facts.json`. Preferences, contextual navigation and password-completion instrumentation mean this integrated revision cannot be described as the original purely additive synthetic scope.

`package.json` runtime and development dependencies are unchanged from baseline. No new runtime dependency or separate licensing review was introduced. Playwright was already a development dependency; that alone does not prove its exclusion from a client bundle. The production marker scan is targeted evidence only.

Two isolated, normally minified webpack production builds used the same installed Next 16.1.3 / React 19.2.3 dependencies without installation:

| Build | Client chunk files | Raw bytes | Per-file gzip sum, level 9 |
|---|---:|---:|---:|
| Pinned baseline | 77 | 2,468,842 | 716,797 |
| Integrated student revision | 78 | 2,496,622 | 725,261 |
| Delta | 1 | 27,780 | 8,464 |

Evidence is `final-bundle-baseline-1/result.json`, its build logs, the A1 archived `client-chunks/`, and `final-bundle-comparison.json` under `.phase2-local/`. Both owned build groups finalized successfully. This is cumulative Phase 1 through student-integration revision cost, not engine-only attribution, initial-route payload or hosting cost. The owner-approved production scope permits the student engine; zero total tour bytes is no longer the active criterion.

Production timing p95 values of 368.6, 626 and 1052.4 ms missed the draft 100 ms limit. Fifteen resize/scroll long tasks lacked reliable tour-handler attribution. Corrected Rule 4b cal1/cal2 measured 549/525 KB drift and 47.46667/42.30303 KB per cycle, with zero node/listener growth and clean finalization. Both miss the draft memory limits, which the owner instructed us to retain. These costs remain unresolved. The completion report records measurement limitations.

## Structured signals and reasoned estimates

**S1:** the 21,939-byte engine core is smaller than the largest baseline interactive component. This supports manageable source size, not proof that the entire feature is cheaper or fast enough. Persistence, controller, content and test costs sit outside that subtotal. S1 requires owner judgment rather than an automatic line-count pass.

**S2:** PASS. Zero new runtime dependencies is verified against baseline and checkout. Existing dependency licensing obligations remain unchanged.

**S3:** a representative palette-token adjustment has one documented touch point in `src/lib/aics/theme-palette.ts`; the tour uses shared CSS variables. A navigation rename preserving its view ID has one touch point in `src/lib/aics/nav-config.ts`, since Sidebar derives `data-tour="nav-${item.view}"` from that ID. These are source-backed estimates, not timed historical work. Removing a target or changing a view ID can require content updates. No demonstration edit was applied.

Target contract: steps resolve live `data-tour` attributes, use the existing portal route callback for `view`, wait within the step budget for delayed targets and skip missing targets. A removed target releases the spotlight; an unavailable final target must not count as full completion. Shared theme and route seams have regression coverage.

**S4:** student-production verification reused the existing overlay, registry/controller, settled-spotlight helper and owned browser/server mechanisms. The real-host Finish regression parameterizes the replay target while retaining the synthetic default. Target/content fixtures remain tour-specific. This demonstrates student-tour reuse; Faculty/Admin reuse is NOT EXECUTED and outside scope. Future scenario adaptation is an estimate.

**S5:** the owner approved a runtime interpretation on 2026-11-03. Retirement removes synthetic `OnboardingDev` host/board and its development import while retaining an inert mount entry and the student engine/API. Shared authorization, persistence, controller and production hooks remain. The old proposal to delete engine/API/authz additions is obsolete. The import lives in a production source path; the literal no-source-path-touch rule was explicitly superseded. No retirement demo was executed. Actual retirement requires a focused diff and student regression; this is a removal plan, not an executed removal claim.

There is no historical maintenance-time or long-run operational dataset for this engine. Future portal evolution, real-user memory distributions and hosting cost cannot be quantified from these local runs. Source/bundle counts, demonstrated reuse and the removal plan support owner review. I1/S1/S3/S4/S5 proportionality judgment and performance acceptance remain open separately.
