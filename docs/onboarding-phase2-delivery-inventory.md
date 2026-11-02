# Phase 2 delivery inventory

Student-integration update, 2026-11-02: the original Phase 2 retention manifest and ZIP remain historical and have not been rewritten. Phase 3 artifacts use a separate `.phase2-local/phase3-retention-manifest.json` and `.phase2-local/phase3-review-package.zip`. The Node packaging script is `.phase2-local/package-phase3-review.mjs`. It selects source and explicit logs/results/screenshots, records hashes and tracking status, and excludes protected files, environment files, dependencies, build caches, profiles, cookies, traces and heap dumps. The package is reproducibility material, not Phase 2 acceptance.

Phase 3's browser and quality scripts remain local artifacts because their owned-server helper currently comes from the unfinished `10-perf.mjs` work. The package retains that exact helper and its imported source files. It does not register those bytes as an A1 producer or approve the unfinished calibration code. New local artifacts include `phase3-quality.mjs`, `phase3-student-browser.mjs`, `phase3-chunk-scan.mjs`, their output JSON/logs, source bindings and screenshots. Successful and failed browser attempts are retained separately. See the completion report for actual dispositions and the final package manifest for exact paths.

The retention manifest is `.phase2-local/phase2-retention-manifest.json`. Each entry gives the exact repository-relative path, byte count, SHA-256, tracked status and Git-ignore status. It records retained evidence identity, not test acceptance. Rebuild it after the last report/evidence update:

```powershell
node .phase2-local/build-retention-manifest.mjs
```

At the initial inventory in this continuation, 139 files were retained, including 94 ignored untracked files. The manifest enumerates 82 ignored evidence files under the three `phase2-completion-*` evidence trees. Later runs can increase these counts. The manifest intentionally excludes browser profiles, caches, crash state, environment files, cookies, network traces and raw heap snapshots. Those exclusions must not be force-added as a substitute for reviewable evidence.

These new source files are ignored by the repository's anchored `/scripts/` rule and need an explicit review and eventual `git add -f` of the named paths, if approved:

- `scripts/onboarding/a1-v2-evidence.mjs`
- `scripts/onboarding/a1-v2-registry.mjs`
- `scripts/onboarding/account-preflight.mjs`
- `scripts/onboarding/isolated-a1-observer.mjs`
- `scripts/onboarding/isolated-build.mjs`
- `scripts/onboarding/isolated-interactions.mjs`
- `scripts/onboarding/isolated-smoke.mjs`
- `scripts/onboarding/isolated-source.mjs`
- `scripts/onboarding/settle-timing.mjs`
- `scripts/onboarding/settle-timing.test.mjs`

The new completion report, manual checklist and this delivery inventory are also ignored by `/docs/` and need explicit review and eventual force-add:

- `docs/onboarding-phase2-completion-report.md`
- `docs/onboarding-phase2-manual-checklist.md`
- `docs/onboarding-phase2-delivery-inventory.md`

The exact ignored evidence paths to review are the manifest entries with `ignored:true`, `tracked:false`, and a `docs/done/qa_evidence/ui-ux/onboarding/phase2-completion` prefix. They include actual run metadata, producer copies, result JSON, build/static logs, reports and screenshots. Preserve failed attempts with their failure status. Review every selected path before staging; do not use a blanket force-add on `docs/` or `scripts/`.

`.phase2-local/` is untracked but is not ignored. It contains useful current build, scan, lifecycle and unit-test evidence, alongside preparation diagnostics and the pre-existing-change patch. The manifest identifies their exact bytes so the final report's references remain usable. Retain the referenced current evidence and the inventory generator/manifest, but review individual files before any eventual commit. Do not stage the whole directory automatically.

Existing tracked edits in the gate plan, interaction scripts, performance script, tour overlay and dev mount remain ordinary review items; their tracked status prevents ignore rules from hiding changes. The protected `next-env.d.ts`, environment configuration, design export and unrelated modifications are not delivery candidates for this work. No files have been staged or committed by this inventory task.
