# Phase 2 manual review

## Student Phase 3 owner review, 2026-11-06

The owner approved the welcome panel and tour's explanation of the portal, confirmed that checklist and replay controls make sense, and approved desktop usability in this chat. The owner was unsure about mobile and explicitly agreed to defer mobile acceptance to the planned mobile UI overhaul. Student Phase 3 completion uses those desktop observations and the recorded technical verification. This entry claims no additional manual scenarios, browser/device identity or mobile PASS. The mobile review is tracked in TODO.md.

Overall status, 2026-11-06: **Phase 2 complete, accepted by the owner with deferred follow-ups**. The [owner decision](onboarding-phase2-completion-report.md#owner-acceptance-decision-2026-11-06) amends acceptance for the four I2/A3 follow-ups in [TODO.md](../TODO.md#onboarding-phase-2-acceptance-and-deferred-follow-ups). H1's owner-reported PASS and all manual observations/limitations below remain unchanged. The manual trace comparison remains supporting evidence only, within the compared traces' recorded scope; it proves no compliant timing series, Windows task ownership or complete memory attribution. Earlier references below to overall non-acceptance describe the pre-amendment state. Phase 3 student development may proceed on `main-full-dev`; no PR, merge to `main` or deployment is authorized.

## Required H1 recheck after the focus repair

Status recorded on 2026-11-05: **H1 MANUAL RECHECK PASS, OWNER-REPORTED**. The owner supplied the following observations after the focus repair, superseding the earlier awaiting-verification status:

- Navigating during the guided tour worked correctly.
- Tab and Shift+Tab keyboard focus worked correctly.
- Windows Narrator announced the tour controls correctly.

Source: the owner's post-repair H1 recheck message in this chat. The owner explicitly reported **H1 manual recheck: PASS**, based on these observations. The recording date is not a claimed execution date. No exact tested commit, browser, Narrator version, recording or additional scenario details were supplied. The detailed procedure below remains a procedure; this report does not claim that every listed action was separately observed. Other Phase 2 criteria and the overall non-acceptance verdict remain unchanged.

1. Enable the screen reader and start the student tour with the keyboard. Advance to a step that will remain open while its current view is replaced.
2. Navigate unexpectedly using a portal navigation link, then repeat using browser Back/Forward during a new active tour. Do not use the tour's Next button to cause these view changes. If the active view or focused control disappears while the tour stays open, focus must return to the useful tour heading/card, not BODY, a removed element or an invisible control. If a live portal control retains useful focus, the engine must leave that focus intact.
3. Confirm the screen reader identifies the current tour content and position without duplicate speech. Use Tab and Shift+Tab to reach named controls, then Next and Back. Confirm visible focus, useful speech and no trap. Escape/Skip must dismiss cleanly and return focus to a usable opener, Help replay or main content if the opener unmounted.

Record the actual PASS/FAIL and a brief observation. Include the tested commit and browser/OS/screen-reader where available. A problem in any step remains a mandatory H1/accessibility blocker. This is a small recheck of repaired behavior; the previously supplied manual categories are preserved below.

Scope update, 2026-11-02: Phase 3 student development is now explicitly authorized. This checklist still records outstanding human review and does not accept Phase 2 or authorize deployment. Review the real student welcome, checklist and Help replay as well as the synthetic engine when a safe local review session is available. For welcome dismissal, focus should return to a usable portal control or main content; for a tour crossing views, an unmounted opener should fall back to Help replay or main content.

Status: **Owner-reported manual review received**, recorded 2026-11-03 from the owner's final-verification request. These observations concern the updated student onboarding preview and are separate from automated results and Phase 2 technical acceptance.

| Owner's reported category | Reported result |
|---|---|
| Visual design and overall student experience | APPROVED |
| Keyboard navigation and focus | PASS |
| Screen-reader announcements | PASS |
| Tour targets, dropdowns and overlays | PASS |
| Reduced-motion behavior | PASS |
| Mobile accessibility | PASS |
| Visual themes and readability | PASS |

Reviewer attribution is the repository owner who supplied the message. No reviewer name, execution date, browser/OS, screen-reader product/version, exact reviewed source identity, recording, screenshot or detailed per-scenario observations were supplied. The recording date above is not an invented test date. These reported categories do not establish that every detailed action or synthetic edge case listed below was executed. Existing automated screenshots/results retain their own source identities and do not become human recordings. Technical gate reconciliation remains pending.

Technical continuation, 2026-11-04: automation observed focus on BODY after unplanned manual navigation while a tour remained open. The old stability test did not assert that focus requirement; its strengthened rerun was blocked by ownership inspection. This is separate from the owner's supplied categories. No new human result is claimed. The blocker is now resolved on the engineering side: the tour engine repairs genuinely stranded focus back into the open card (commit `7da5ec0`), the strengthened regression failed 4 assertions before the repair and passes 13/13 after, and the repaired behavior is covered by the keyboard, mobile and stability suites. After this repair, manually navigate away mid-tour and confirm focus lands on useful tour or portal content and that Tab/Shift+Tab and screen-reader orientation remain usable; the engine now restores card focus itself, so confirm the restored orientation feels right with a screen reader. Missing/delayed/removed synthetic-target cases below also lack detailed owner observations; their expected outcomes are instructions, not retrospective claims.

## Local student preview

Open `http://onboarding.localhost:4341/` in Edge or Chrome. Sign in with the existing approved synthetic student credentials for `juan.santos`. Wait for Route Trail and Workspace Assemble to finish. The welcome then offers **Show me around** and **I'll explore on my own**.

This is the existing verified production-compiled student interface. A separate development script guards the sole HTTP listener before Next receives requests. Onboarding GET/PATCH use a process-local fixture, separate for each browser cookie. Password changes, uploads, account edits, server actions and other mutations are blocked; logout clears only this preview's cookie. Real student data reads and the already-verified synthetic account login use local MongoDB. No environment files, account data or production source are patched. Browser network policy restricts resources and connections to this origin.

1. Use **Show me around** and Next through dashboard, announcements, Academics, Tasks, Events, account menu and Help. Try Back, Skip and Escape.
2. Choose Explore to inspect Getting started. Review profile and announcements, hide the checklist, then use Help & Support > **Resume Getting started**. Finish the tour and try **Replay guided tour**. Refresh to check simulated progress survives within this preview process.
3. Open `http://onboarding.localhost:4341/__preview` in the same browser. **Reset welcome and return to sign-in** clears only that browser's fixture and preview login, so you can repeat the first-login experience. **Simulate completed password and photo steps** supplies those two prior-action fixtures without changing a password or uploading a photo.
4. For mobile, open DevTools and press Ctrl+Shift+M, then select a phone width. For themes, use Settings > Appearance. For reduced motion, use DevTools > Rendering > Emulate CSS media feature prefers-reduced-motion > reduce, then replay the tour.
5. When finished, open the controls URL and select **Stop preview**, then close the browser tab. This stops only the local preview process and discards its fixtures. Closing a tab alone does not stop the server.

After the November 3 refinements, also check:

- Open Profile from Getting started. Opening alone should not complete it. Read to the final information banner and keep it at least half visible for 1.5 seconds after loading; profile progress should then update without a confirmation button. Briefly passing it, loading placeholders, or a background tab should not count.
- Use **Read announcement** to open the full notice, then Escape to close and restore focus. This should complete onboarding without marking the notice read or dismissing it. Swiping alone should not complete onboarding. The deck's existing checkmark and snooze semantics remain separate.
- Open the password checklist item. Security should already be selected, with focus at Change password. Refresh and use Back/Forward. Open the photo item and confirm its photo area is selected while upload consent is still required.
- Visit Academics > Tasks. The optional inline guide should offer **Show Tasks guide** and **Not now**, without opening a modal automatically. Dismiss and revisit, then replay the five-step guide. Skip/Escape must not complete it; Finish must preserve the separate seven-step overview progress. Check its mobile sheet and saved theme too.

To restart the refined preview after stopping, run `node scripts/onboarding/manual-preview.mjs --evidence=.phase2-local/refinement-quality-1/result.json` from `C:\Projects\loginAICSPortal`. It verifies branch and build/source equivalence before serving. It requires that local evidence and its production build; it refuses a stale/missing build or unexpected environment files. The earlier default `phase3-quality` build predates these refinements and is correctly rejected. Another service occupying the port is left alone. Preview verification logs are under `.phase2-local/manual-preview*` and `.phase2-local/refinement-preview*`; temporary data and credentials are not committed.

## Human review

The table above is the received human evidence. The following actions and expected outcomes remain the detailed review procedure, not additional observations attributed to the owner. For any further review, use only a verified local fixture session. Confirm the address is loopback and onboarding PATCH requests are fulfilled locally instead of forwarded to MongoDB. The synthetic failure fixture reports `persisted:false`; the healthy real-student fixture reports `persisted:true` for simulated storage only. Neither permits a database write. If further recordings are supplied, never include cookies, passwords or other account data.

| Check | Action | Expected outcome |
|---|---|---|
| Student welcome and resumption | In the supplied fixture session, dismiss welcome with the keyboard, reopen the checklist from Help, start the real tour, then replay after completion. | The welcome waits for sign-in animations, offers both choices and restores usable focus. Checklist dismissal does not mean completion. Replay preserves completed work. |
| Keyboard and focus, D1/D2 | Without a mouse, use the portal skip link, start the tour, use Next and Back, dismiss with Escape, then start again and finish. | Focus is visible, enters each step card, stays reachable through Tab/Shift+Tab and returns to the launcher after dismissal/completion. The skip link still reaches main content. No focus lands on a removed element. |
| Screen-reader speech, D3/D4 | With a real screen reader enabled, listen to start, one Next/Back transition, the absent-target auto-skip, Skip/Escape and Finish. Inspect the named card and each control. Compare announcement pacing with the portal's GlobalSearch results. | One polite announcement per meaningful transition conveys step position/title. Auto-skip explains what happened. Completion/dismissal is spoken once. The dialog and controls have useful names; decorative spotlight geometry is not read as content. No duplicate, missing or excessive speech. |
| Target changes and overlays, B2/C5 | Confirm a missing target degrades calmly; on the removable-target step remove it. During a tour open a modal, dropdown and toast, then close the interactive overlay. | The card remains usable, without a stale or blank spotlight. Existing overlays paint above the tour and receive focus without a focus fight. Closing them leaves the tour/portal operable. |
| Reduced motion, E1 | Enable the operating system's reduced-motion preference, restart the tour and advance/back across steps. | Spotlight and card changes settle without movement animation. Keyboard and screen-reader operation remain intact. |
| Mobile, F1 | At a phone width, start the tour and open/close the mobile navigation dialog. | A readable bottom sheet fits the screen. Controls remain usable. The navigation dialog and sheet do not fight for focus or obscure essential controls. |
| Visual themes, G1 | Review the fresh theme screenshots and, where needed, the local session for Light, Dark, Midnight, Slate, OLED Black, saved Custom in light/dark, and System resolved light/dark. Inspect card, sheet, scrim, focus indicators and Next/Finish normal/hover states. | Text, boundaries and focus remain readable in every combination, without clipping or hidden controls. Automated contrast values remain attached to the corresponding images; visual review does not replace numerical contrast assertions. |

Record each row as PASS, FAIL or NOT EXECUTED, with a screenshot/recording or concise observation. A failed or missing accessibility, stability or theme-readability check blocks acceptance; these cannot become conditional polish items. Owner review of the cost memo and provisional performance thresholds is a separate approval requirement. Phase 3 development is already authorized; completing this checklist does not authorize deployment.
