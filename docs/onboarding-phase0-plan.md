# AICS Portal - Onboarding & Guided Tours, Phase 0 - Research, Audit & Implementation Plan

**Date:** 2026-10-29

**Branch:** `main-full-dev` @ `46c33a5` (remote-verified)

**Status:** Phases 1 and 2 are authorized for implementation on `main-full-dev` as of 2026-10-29, per my explicit authorization recorded in sections 2.5 and 13. Phase 3 onward, porting to `main`, merging, and deployment are not authorized. The Phase 2 gate outcome stays my decision alone.

**What this is:** The canonical Phase 0 plan and decision register for the onboarding and guided-tour work, consolidated from my reviewed and confirmed decision update, `AICS_Onboarding_Decision_Register_Update.md` (2026-10-29). That update is the source of truth for every decision recorded here. Section 1 explains why a consolidation was needed at all.

**Rev 2026-10-29 (documentation cleanup, plan-only):** punctuation normalized to ASCII per the repo's unslop convention, metadata line breaks fixed, the state-model count corrected from four to five across sections 6 and 8 (section 5 always listed five), section 12 item 5 clarified so the confirmed Phase 2 gate is not read as an open decision, and the D4/D8 reconfirmation recorded under section 2.2. Zero application code changed; nothing committed, pushed, merged, or deployed.

**Rev 2026-10-29, second pass (plan-review approvals applied):** I reviewed the plan and approved three items, and this pass folds them in: the major/minor revision rule is approved with my clarifications (section 6.1), the Help & Support notification dot is approved with my safeguards (section 6.2), and the Getting Started checklist moves into v1 alongside the welcome panel and the tours (sections 3.3 and 9, phases re-sequenced). D5, D7, and D9 stay unresolved, the Phase 2 gate stays mandatory with its outcome still mine to decide, and implementation stays unauthorized. Zero application code changed; nothing committed, pushed, merged, or deployed.

**Rev 2026-10-29, third pass (gate plan of record):** the mandatory Phase 2 gate now has a criterion-by-criterion plan of record in the companion document `docs/onboarding-phase2-gate-plan.md`: acceptance criteria with verification methods and pass and fail rules, the evidence package layout, the outcome definitions, the cost questions, and the review template I fill in when the gate runs. Nothing in this plan was weakened, D5, D7, and D9 stay unresolved, and implementation stays unauthorized. Zero application code changed; nothing committed, pushed, merged, or deployed.

**Rev 2026-10-29, fourth pass (final decision review and implementation authorization):** I made the remaining decisions and authorized implementation for Phase 1 and Phase 2 only, on `main-full-dev`. The three gate decisions are recorded in section 2.5 and written into the companion gate plan: performance evaluation is the hybrid option with provisional thresholds, cost proportionality is judged by the structured signal rubric, and a conditional pass carries at most three items, resolved by the Phase 3 acceptance review. D5, D7, and D9 are dropped as unresolved historical decisions; their meanings stay uninvented and their IDs are retired. The Phase 2 gate approval remains mine alone. Nothing in this pass authorizes Phase 3, production, `main`, or deployment.

**Rev 2026-10-30 (Phase 1 dimension identities approved):** I reviewed the five registry dimension identities exactly as implemented in `src/lib/onboarding/registry.ts` and approved all of them per role as the baseline; they are not renamed or restructured without separate approval from me (section 2.6). The recovery note in the registry flagged them as this phase's review checkpoint; that checkpoint is closed and the note says so. This pass also aligns the push wording in section 13 and the gate plan's section 11 with the standing rule recorded in `CLAUDE.md` section 6 (updated 2026-10-30): every completed commit pushes immediately to `origin/main-full-dev`, never `main`, and a push still authorizes no PR, merge, or deployment. No behavior changed; nothing merged or deployed.

## 1. What this document is, and what happened to the original

I planned the onboarding work in an earlier agent session, and that session did not survive handoff. When I went to reconcile my confirmed decisions this time, the original Phase 0 document and the separate decision register could not be found anywhere I can reach: not in the working tree, not on any local or remote branch, not in the issues or PRs, not in the repo wiki, not in the 2nd Brain vault. The planning work evidently stayed inside that session's context and was never saved to a durable location. I searched all of those places before concluding the originals are gone. I am not treating "hard to find" as "gone" lightly, and I am not creating this consolidation to compete with a surviving original. There is no surviving original.

So this document consolidates what is actually confirmed. My decision update carries the full decision set, the phase order, the conflicts it superseded, and the gate requirements, and I integrated all of that into the sections below rather than appending the update as a duplicate. What the update does not carry, I did not invent. The original research prose, the audit detail, and decisions D5, D7, and D9 were lost with the session that held them. I record that gap honestly in section 12 instead of papering over it, and section 11 points at the research and repo references that are verifiable today.

Three things stay explicitly separate throughout: what I already confirmed, what this plan proposes for my review, and what is still open. Confirmed decisions in section 2 are settled unless I say otherwise. The phased plan in section 9 is a proposal, not an authorization. Implementation needs a separate, explicit go from me, and even then Phase 2 has its own hard stop.

## 2. Decision register (confirmed)

I reviewed and confirmed these decisions. The wording below follows my decision update; I do not reinterpret it, and nothing later in this plan overrides it.

### 2.1 Headline decisions

| ID | Decision | Approved direction | Implementation constraint |
|---|---|---|---|
| D1 | Onboarding design | A role-aware welcome panel, an optional guided tour, and a persistent Getting Started checklist. | The welcome panel is dismissible. The tour is never forced. The checklist is dismissible and reopenable. |
| D2 | Tour engine | An in-house engine built on the pieces the project already has. | Phase 2 is a mandatory review gate covering implementation cost, positioning reliability, keyboard and focus behavior, accessibility, responsive behavior, reduced motion, and theme support. The full three-role rollout does not proceed until that gate is passed. |
| D3 | Progress persistence | Server-side, per-user persistence. | Identity comes from the authenticated server session. Branch scoping and own-record access are enforced. Persistence failures never block portal access or trap a user inside onboarding. |
| D6 | Versioning policy | Independent versions per role. Minor changes are silent. Major changes show a dismissible notice. | A major update never forces a full tour replay. The notice is dismissible once for that role and version. Replay stays available voluntarily from Help & Support. A change to one role's tour never re-prompts other roles. |
| D10 | Initial scope | All three roles: student, faculty, and admin. | Delivered in phases: the student vertical slice first, then faculty and admin. No unauthenticated onboarding. No role-switching functionality. |

### 2.2 Supporting policies

| Item | Confirmed direction |
|---|---|
| D4 - Tour launch | The welcome panel asks whether the user wants the tour. It never auto-starts the tour. |
| D8 - Replay | Help & Support is the canonical tour-replay location. The checklist may provide a shortcut to it. |
| Branch rollout | Roll out only to branches whose relevant routes and UI are compatible. Gate incompatible branches rather than assuming every branch can take the feature at the same time. |
| Checklist | Dismissible and reopenable. Dismissal is never confused with completion. |
| Save failures | Non-blocking. A user may keep exploring, or close onboarding, even if a progress write fails. The failure and retry are handled safely and never restrict portal access. |
| Implementation boundary | Work on `main-full-dev` only. Production merge, porting to `main`, and scope expansion each need a separate explicit approval from me. |
| Authorization boundary | Onboarding state never grants, denies, or otherwise affects access to portal data or features. This work does not alter authentication, authorization policy, existing collection schemas, or environment variables. |
| Analytics | Not included. Any onboarding analytics or extra telemetry needs a separate privacy and scope decision. |

D4 and D8 were reconfirmed on 2026-10-29 during the plan review, and the reconfirmation matched these rows with no discrepancy. The original update file no longer survives, so this table plus that reconfirmation are the durable record for those two rows.

### 2.3 What is not carried forward

D5, D7, and D9 are not in my confirmed update, and the original register that defined them is gone. I am treating those three IDs as unset rather than guessing what they said. If something under them still matters, I need to re-raise and re-decide it. That is recorded in section 12.

### 2.4 Decisions approved at the plan review

I reviewed the first cut of this plan and approved three items on 2026-10-29. They carry the same weight as the register above, and the details live in the sections they fix:

| Item | Approval | Where it lands |
|---|---|---|
| Major/minor revision rule | Approved with clarifications: accumulated minor edits are reassessed as a set, renaming a target stays minor only while the equivalent interface surface and teaching point hold, and version bumps and notices stay scoped to the affected role, with major revisions shown as a dismissible notice and never forcing a replay. | Section 6.1 |
| Help & Support notification dot | Approved with safeguards: one meaning in v1, a pending-notice lifetime, click-through to the notice only, accessibility definitions required from the implementation phase, and dismissal never forcing replay. | Section 6.2 |
| Getting Started checklist | Approved for v1: it ships in the initial onboarding release alongside the welcome panel and the tours, dismissible and reopenable, with persistence failures never blocking portal usage. | Sections 3.3 and 9 |

### 2.5 Decisions approved at the final decision review

I reviewed the decision brief prepared from these plans and approved the following on 2026-10-29, closing every decision the plans had routed back to me except the gate outcome and the per-role step lists. They carry the same weight as the register above:

| Item | Decision |
|---|---|
| Performance evaluation | Hybrid numerical and qualitative evaluation (option D in the brief). The four rules and their validation requirement live in the gate plan of record, its section 9. |
| Performance thresholds | Provisional. They are validated during Phase 2; the evidence reports measurements and recommends adjustments rather than silently changing the approved criteria. |
| Cost proportionality | Structured signal rubric (option 3 in the brief). S2 is mandatory; S1, S3, S4, and S5 must all be satisfactory. S1's component-size comparison is a warning signal requiring justification, not an automatic failure on line count alone. |
| Conditional pass | Maximum three non-blocking items. Every remaining issue must still sit inside the permitted classes, and a conditional pass never waves a mandatory criterion. Conditional items are resolved by the Phase 3 acceptance review. |
| D5, D7, D9 | Dropped as unresolved historical decisions. Their original meanings are not invented, and their IDs are not reused for new decisions. |

The implementation authorization itself is recorded in section 13.

### 2.6 Registry dimension identities approved at the Phase 1 review

The recovered scope pinned the registry mechanism (five state dimensions per role, per-role versioned specs, version carry-forward) but not the dimension identities; the Phase 1 implementation grounded the keys and labels in the portal's first-run surfaces and flagged them in the registry's recovery note as the review checkpoint for exactly this decision. I reviewed the identities on 2026-10-30, exactly as implemented in `src/lib/onboarding/registry.ts`, and approved all five per role as the baseline. Renaming or restructuring them needs separate approval from me; the registry's own documented rule (bump the role's version when its dimension set changes) governs any future change, and a version bump never erases carried-forward progress.

| Role | Approved dimension identities (key: label) |
|---|---|
| student | password: Change your demo password; profile: Review your profile; photo: Add a profile photo; tour: Finish the sign-in tour; announcements: Check the announcements board |
| faculty | password: Change your demo password; profile: Review your profile; roster: Open My Students; gradebook: Open grade encoding; announcements: Check the announcements board |
| admin | password: Change your demo password; directory: Open the people directory; stats: Review the dashboard stats; release: Check the grade release queue; announcements: Check the announcements board |

The approved identities settle the document-shape question section 5 left to Phase 1 design work, for the version-keyed values map as implemented. The section 5 "at minimum" distinctions (the welcome panel having been shown, tour completion, tour skip, notice dismissal, checklist dismissal) stand unchanged as the constraint for the onboarding surfaces the later phases wire, and nothing in this approval reinterprets them; how those distinctions land in the stored shape stays with the phases that wire those surfaces, per the plan's own sequencing.

## 3. The experience I want

### 3.1 Welcome panel

Each account sees the initial welcome panel once for the role-appropriate onboarding experience. The panel is dismissible, and it offers two honest choices: "Show me around" starts the tour, and "I'll explore on my own" closes it without penalty. Per D4, the panel asks. It never launches the tour by itself. A user who explores on their own keeps every path the tour would have shown, including voluntary replay from Help & Support.

### 3.2 Optional guided tour

The tour is a short sequence of spotlighted steps through the surfaces that matter for the user's role. It can be skipped at any step, and skipping is not failure. It uses the existing portal shell, navigation, and animation stack rather than a heavyweight third-party walkthrough library. The experience targets for each role come from the live navigation config, which today is:

- Student: Dashboard, Academics, Events, Professors, Enrollment, plus Settings and Help & Support.
- Faculty: Dashboard, My Students, Grade Encoding, Previous Records, Announcements, Schedule, Tasks, plus Settings and Help & Support.
- Admin: Dashboard, Release Queue, Events, Announcements, Professors, Students & Faculty, Enrollment, plus Settings and Help & Support.

The specific step lists are Phase 3 and Phase 4 design work, drafted during implementation and reviewed with me per phase. I am not fixing them in this document, because the original drafts were lost and I do not invent replacements silently.

### 3.3 Getting Started checklist

The checklist is a persistent, small surface that tracks the first things a user might want to do, with a shortcut into the tour's replay entry in Help & Support. It is dismissible and reopenable, and dismissing it is recorded as checklist dismissal, never as completion. I approved it for v1 in the plan review, so it ships in the initial onboarding release alongside the welcome panel and the optional guided tour, riding inside the role phases instead of as a later release. Two separations still hold: the tour does not depend on the checklist, and persistence keeps checklist state distinct from tour state. A persistence failure for the checklist never blocks portal usage, per section 5.

## 4. The in-house tour engine and the Phase 2 review gate

I chose an in-house engine over a third-party tour library, with the open risk stated plainly: a custom engine can cost more to maintain than it looks. The Phase 2 gate is the control for that risk, and it is mandatory. It is a stop-and-review gate, not advice, not a suggestion, and not optional guidance.

### 4.1 What Phase 2 delivers

Phase 2 produces a working synthetic, dev-only tour with no real role content, plus an evidence package. The evidence covers:

- Positioning: flipping and clamping of the spotlight, behavior when a target is missing, and behavior across viewport resizes.
- Keyboard: full keyboard-only operation, sensible focus movement and focus restoration after each step and after tour end.
- Screen readers: announcement behavior for step changes, on par with the rest of the portal.
- Motion and layout: reduced-motion behavior, and the mobile sheet fallback for small viewports.
- Themes: readability and contrast across all seven supported themes, verified against the live set from `src/lib/aics/theme-palette.ts`: Light, Dark, Midnight, Slate, OLED Black, Custom, System. A saved custom theme is included in that check.
- Stability: behavior when a tour target is absent, and when the user navigates to another route mid-tour.
- Cost: the maintenance weight and complexity of the in-house engine, compared honestly against what this plan expected.

### 4.2 Gate outcome

Phase 3 does not start until I review the evidence and explicitly approve continuation. That approval is a separate act from the implementation authorization itself, and both come from me. If the engine misses the acceptance criteria, or its cost is disproportionate, the work stops and I get options presented. Nobody silently switches to a third-party library, and nobody quietly expands scope, if the gate goes badly. The gate going well also does not skip review: I still see the evidence before anything proceeds.

### 4.3 Gate plan of record

The gate now has a criterion-by-criterion plan of record in the companion document `docs/onboarding-phase2-gate-plan.md`: acceptance criteria with verification methods and pass and fail rules, the evidence package layout, the outcome definitions including what a conditional pass may and may not wave, the cost questions, and the review template I fill in when the gate runs. That document sharpens this section without weakening it; where the two could be read differently, this plan wins and the companion gets fixed. Preparing it was documentation only: the repo baseline it tests against was verified read-only, no application code changed, and the gate has not run.

## 5. Persistence, identity, and failure behavior

Progress is server-side and per-user. Identity derives from the authenticated server session, the same `getAuthedSession` path the rest of the portal already trusts, never from client localStorage or JWT claims alone. Every read and write is scoped to the user's branch and the user's own record, consistent with the branch-as-field model in ADR-0001 and the centralized authorization rules in ADR-0007. Onboarding state never feeds an authorization decision; it is display and re-prompt state only.

The stored state distinguishes, at minimum: the welcome panel having been shown for a role version, tour completion, tour skip, "What's new" notice dismissal per role and version, and checklist dismissal. A version update never erases unrelated progress. The concrete document shape is Phase 1 design work; the constraint set above is what I confirmed. The concrete dimension identities are the approved baseline of 2026-10-30, section 2.6.

Failure behavior is non-blocking, on both read and write. If a progress read fails, onboarding surfaces simply hide and the portal works. If a progress write fails, the user keeps going: the tour still runs, completion is treated charitably on the client for the session, and a retry can happen later without trapping anyone. At no point does an onboarding failure restrict portal access. The original plan described persistence as an additive feature; that framing is superseded, per my update, by this explicit non-blocking requirement.

No existing collection schema changes, no environment variables are added or altered, and no auth or authz policy is touched by this work. A new, separate onboarding state store is the expected approach, with its exact shape settled in Phase 1.

## 6. Versioning and re-onboarding

Each role carries its own tour version identifier. The five state dimensions in section 5 are all keyed against that version. The semantics I confirmed:

1. First introduction: show the initial welcome panel once per account for its applicable onboarding experience, with the "Show me around" and "I'll explore on my own" choices.
2. Minor revision: copy edits, corrected selectors, and placement adjustments do not restart onboarding and do not re-show the welcome panel. Completion and checklist state carry forward untouched.
3. Major revision: when the experience or a workflow materially changes, show a small, dismissible "What's new" notice for the affected role and version. A major update never forces the full tour to replay.
4. Dismissal: persist notice dismissal for the role and version, so the same notice does not return every login. Dismissing a notice is not completing the tour.
5. Replay: the user can voluntarily start the current version from Help & Support at any time, regardless of prior completion or skip.
6. State integrity: version and status information is sufficient to distinguish the welcome panel having been shown, tour completion, tour skip, notice dismissal, and checklist dismissal, and a version update never erases unrelated progress.
7. Policy changes: any future decision to force a replay or materially change re-prompt behavior goes through separate review.

### 6.1 The reviewable rule for "major" (approved with clarifications)

My update asked the plan to define, before implementation, a reviewable rule for what counts as "major" instead of leaving it to undocumented judgment during a release. I reviewed the proposed rule in the plan review and approved it on 2026-10-29, with my clarifications folded in below. It takes effect as written here.

A revision is major for a role when any of these is true:

- A tour step is added, removed, or reordered in a way that changes what the user is taught, not just how a step is worded.
- A step's target surface moves or disappears, such as a route or navigation change that breaks or relocates the thing the step points at.
- The welcome panel or checklist materially changes what it asks the user to do.
- The flow gains or loses a stage, such as a new interstitial or a removed stage.
- A new role-specific workflow is introduced that the tour teaches.

Everything else is minor: copy edits, corrected selectors, color and spacing adjustments, microcopy, swatch updates, and placement tweaks that keep the same target and the same teaching point.

Three rules ride with the approval:

- Accumulated minor edits are reassessed periodically as a set. If their combined effect changes what the tour teaches, the next relevant revision is classified as major.
- Renaming or adjusting a target is minor while it preserves the equivalent interface surface and the same teaching point. A change that breaks or relocates the target is major, and the criteria above catch it.
- Version bumps and notices stay scoped to the affected role: a revision to one role's tour bumps only that role's version, shows its dismissible notice only to that role, and never re-prompts the other roles. A major revision never forces a tour replay.

### 6.2 The Help & Support notification dot (approved with safeguards)

The original plan had a new-tour dot in Help when a new version was available. My update keeps that discoverability only if it is consistent with the revised notice policy, with clear rules for when the dot appears and clears, and it must not imply a full replay is required. I reviewed the proposal in the plan review and adopted it on 2026-10-29. In v1 the dot works like this:

- It has exactly one meaning in v1: a pending tour-update notice for the current role and version.
- It appears on the Help & Support entry only while that notice is pending, and it clears when the notice is read or dismissed.
- Clicking Help & Support leads to the notice, never to an automatically started tour.
- The implementation phase defines an accessible label for the dot, its screen-reader announcement behavior, and the clear and announce behavior when the pending notice is resolved. Those definitions are part of the approved requirement, not an optional extra.
- Dismissing the notice never forces a tour replay.

The dot is part of the plan from here on.

## 7. Branch compatibility and rollout

The original plan's default was all-at-once rollout. That default is superseded. Rollout is compatibility-based, with explicit gates where compatibility cannot be established.

Before onboarding turns on for a branch, the branch must be verified to contain compatible role navigation, stable tour targets, a Help & Support replay entry, the theme system's tokens, and the authenticated route and API conventions this work depends on. A branch that cannot be verified gets an explicit gate and stays off. A feature proven on `main-full-dev` is never assumed safe to port to `main` or anywhere else. Porting to `main`, merging, and deploying are outside this plan's authorization entirely and need separate approval from me, per the branch topology rules in `CLAUDE.md` section 6a.

The rollout order within the authorized boundary stays phased, per D10: student first, then faculty and admin, behind the Phase 2 gate.

## 8. Superseded defaults and resolved conflicts

For the record, these are the original defaults my update superseded, so no contradictory instruction survives in this document:

| Original plan statement or default | Resolution now in force |
|---|---|
| All-at-once branch rollout is the default. | Superseded by compatibility-based rollout with branch gating, section 7. |
| D6 mentions a new-tour dot in Help when a new version is available. | Adopted with safeguards on 2026-10-29, section 6.2: one meaning in v1, a pending-notice lifetime, click-through to the notice only, and it never implies a replay is required. |
| D6 used a general major/minor distinction. | Replaced by the explicit criteria and per-role versioning semantics in section 6, with the rule approved with clarifications on 2026-10-29, section 6.1. |
| Dismissal and completion states were described generally. | The five states are distinct and never conflated, sections 5 and 6. |
| Phases were independently reviewable, but Phase 2 was not a formal gate. | Phase 2 is now a mandatory stop-and-review gate, section 4. |
| Phase 3 and 4 described the student, faculty, admin sequence. | The sequence stands, with all three roles in v1 scope and the Phase 2 gate preceding the full rollout. |
| Server persistence was described as an additive feature. | Persistence must degrade gracefully and never block the portal on read or write failure, section 5. |

With those resolutions applied, no conflict remains among D1, D2, D3, D6, and D10. The main operational risk stays what my update said: a custom engine may cost more to maintain than expected, and the Phase 2 gate exists to catch exactly that before the cost is sunk into three roles.

## 9. Phased implementation plan (proposed, not authorized)

This is the proposed delivery order. It keeps the original sequence with one re-sequencing from my plan review: the Getting Started checklist ships in v1 alongside the welcome panel and the tours, so it rides inside the role phases instead of as its own later release, and the polish phase moves up to Phase 5. Each phase is independently reviewable, meets its acceptance criteria, and lands only on `main-full-dev`. Nothing below starts until I explicitly authorize implementation, and the Phase 2 stop is inside that authorization, not instead of it.

**Phase 1: Registry, persistence, and API.**
Build the onboarding state store and its server API: per-user, per-role, version-keyed documents behind the existing authenticated session and authorization stack. Acceptance: every query is branch-scoped, every user touches only their own record, the non-blocking failure behavior from section 5 is demonstrated for both read and write failures, no existing collection schema or environment variable changes, lint, typecheck, and build pass, and the routes follow the repo's authorization conventions without onboarding state influencing any access decision.

**Phase 2: Synthetic tour engine and the mandatory review gate.**
Build the engine and exercise it with a dev-only synthetic tour, then package the evidence described in section 4.1. Acceptance: the evidence exists, is reviewable without me re-running anything, and the stop holds. I review and either approve continuation, send it back, or call the engine off. Phase 3 waits for that decision.

**Phase 3: Student experience end to end.**
The student welcome panel, the student tour with its step draft reviewed by me, replay from Help & Support, the student Getting Started checklist with its shortcut to the replay entry, and student versioning wired per section 6. Acceptance: a fresh student account sees the welcome panel once, both choices work, the tour is skippable at every step, replay works after completion, a simulated save failure leaves the portal fully usable, the checklist is dismissible and reopenable with dismissal never read as completion, and the states record correctly with checklist state distinct from tour state.

**Phase 4: Faculty and admin tours.**
The same shape for faculty and admin, versioned independently per role, including each role's Getting Started checklist. Acceptance mirrors Phase 3 per role, plus the cross-role check: a change to one role's tour never re-prompts another role.

**Phase 5: Polish, documentation, and release readiness.**
Documentation sync in the living docs, the accessibility pass from section 10 re-run, dev-only scaffolding retired, and a release-readiness review. Acceptance: docs match what shipped, and the tree is clean. Porting to `main` is not part of this phase and needs its own authorization.

## 10. Testing, accessibility, responsive behavior, reduced motion, and themes

These requirements apply across the phases, and the Phase 2 gate examines them up front:

- Keyboard: every tour step, the welcome panel, and the checklist operate keyboard-only. Focus moves sensibly forward, and focus restores to the triggering element when the tour ends or is skipped.
- Screen readers: step changes and state changes announce through aria-live, verified in the browser automation pass the repo already uses, plus manual review.
- Help & Support dot: the notification dot meets the safeguards in section 6.2, with its accessible label, announcement behavior, and clear and announce behavior defined during implementation and verified in the same pass.
- Reduced motion: the tour respects `prefers-reduced-motion`, matching how the portal's existing Framer Motion animations degrade, and the spotlight settles without animation when reduced motion is on.
- Responsive: on small viewports the spotlight tour falls back to a bottom-sheet presentation, and the welcome panel and checklist stay usable on phone widths.
- Themes: every onboarding surface is verified across all seven theme choices from `src/lib/aics/theme-palette.ts`, including OLED Black and a saved custom theme, for readability and contrast.
- Stability: a missing target or a mid-tour navigation degrades calmly, per section 4.1.
- Data safety: every query branch-scoped, own-record only, onboarding state never consulted by any access decision, verified per phase.

## 11. Research basis

The original Phase 0 research prose was lost with the session that held it, so this section points at the sources that are verifiable today rather than restating lost claims. The 2nd Brain notes I consulted for this consolidation:

- Onboarding Flow Patterns: Mobbin's study of 1,460 onboarding flows across 986 apps. The durable finding for this project: teach in context rather than front-loading education, sequence instead of dumping a six-bullet modal, and checklists that persist after the first flow drive retention. That is the pattern behind D1 and the checklist design.
- Progressive Disclosure: onboarding is progressive disclosure at product scale, one pointer at a time, with the checklist persisting after the initial flow. Same conclusion from a different angle.
- UX Psychology: smart defaults read as recommendations, progress never starts at zero, and an honest dismiss option beats a manipulative one. The honest "I'll explore on my own" choice in D4 comes from this stance.
- Dashboard UI Flaws and Dashboard Design Patterns: the dashboard-orchestration guidance that shaped which surfaces the role tours point at, summarized as data driving the UI and progressive disclosure of secondary actions.
- Dark Mode Design Principles: contrast re-assessed per theme, semantic color roles, and restrained color, which is why section 10 verifies every onboarding surface against all seven themes rather than just light and dark.

In-repo references that constrain the design: `.superdesign/design-system.md` for the semantic roles and canvas ladder the tour surfaces must sit on, `docs/UI_UX_AUDIT_REPORT.md` for the standing accessibility findings, ADR-0001 for branch-as-field scoping of all onboarding reads and writes, ADR-0007 for routing authorization through `src/lib/authz/`, `src/lib/aics/nav-config.ts` for the role navigation the tours walk, and `src/lib/aics/theme-palette.ts` for the exact theme set.

## 12. Open decisions that still need me

Three items from the first cut were resolved by my plan review on 2026-10-29 and moved into the confirmed plan: the major/minor rule (approved with clarifications, section 6.1), the Help & Support notification dot (approved with safeguards, section 6.2), and the Getting Started checklist's v1 scope (approved, sections 3.3 and 9). The final decision review on 2026-10-29 then resolved the three gate decisions (section 2.5) and dropped D5, D7, and D9. What stays open is deliberately small. None of it is a gap in the confirmed record; these are the decisions the plan intentionally routes back to me:

1. D5, D7, and D9 are dropped as unresolved historical decisions (section 2.5). Their IDs are retired and their meanings stay uninvented. If something under them ever matters again, it gets re-raised as a new decision under a new record, never under these IDs.
2. The Phase 2 gate itself is confirmed and mandatory (sections 2 and 4). What stays open is its outcome: I review the evidence and explicitly approve continuation, send it back, or call the engine off. That approval is mine alone, and it is not given yet. A clean test report is evidence, never authorization.
3. The tour step lists per role are drafted during Phase 3 and Phase 4 and reviewed by me per phase, since the original drafts were lost.
4. The performance thresholds are provisional by my decision (section 2.5, and the gate plan of record, its section 9): Phase 2 measures actual behavior against them, records the evidence, and flags any threshold that looks unsuitable, with recommended adjustments coming to me rather than being applied silently.

## 13. Authorization status

- Decisions reviewed and confirmed by me: yes, recorded in section 2.
- Plan-review approvals applied (major/minor rule, Help & Support dot, checklist in v1): yes, 2026-10-29, documentation only, recorded in section 2.4.
- Final decision review applied (performance, cost, conditional pass, D5/D7/D9): yes, 2026-10-29, recorded in section 2.5 and mirrored into the gate plan of record.
- Phase 2 gate plan of record prepared: yes, 2026-10-29, companion document cross-referenced at section 4.3.
- Canonical plan and decision register consolidated: yes, this document, 2026-10-29.
- Registry dimension identities approved: yes, 2026-10-30, section 2.6; the review checkpoint flagged in the registry's recovery note is closed.
- Implementation authorized: yes, for Phase 1 and Phase 2 only, on `main-full-dev`, 2026-10-29. Phase 3, Phase 4, Phase 5 content work, porting to `main`, merging, and deployment each need their own separate, explicit authorization from me.
- Phase 2 gate approval: not given, and it cannot be. The gate outcome is decided only by me, after I review the evidence. Implementation authorization and gate approval are separate acts, and both are mine.
- Application code: Phase 1 and Phase 2 work proceeds under that authorization on `main-full-dev`, committed and pushed immediately to `origin/main-full-dev` per the repo's standing convention (`CLAUDE.md` section 6, updated 2026-10-30). A push authorizes no PR, merge, or deployment; those stay separate explicit authorizations from me.
- Database schema, environment variables, auth, or authorization touched: no existing ones. Phase 1 adds a new, separate onboarding state collection and its own API routes under the existing conventions (section 5); it changes no existing collection schema, environment variable, or authentication or authorization behavior, and onboarding state is never consulted by any access decision.
- Production branch or deployment touched: no.

This document records my decisions and the exact scope of my authorization. It is permission to build Phases 1 and 2 on `main-full-dev`, and nothing beyond them.
