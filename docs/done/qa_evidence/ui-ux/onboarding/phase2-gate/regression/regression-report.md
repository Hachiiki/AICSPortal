# regression-report

J2 scripted regression smoke of existing surfaces alongside the engine. Skip link: still the first tab stop with its committed #main-content target, activation still moves focus into the content. Notifications: the topbar trigger still opens its menu, Escape still closes it and restores focus to the trigger. Cookie consent: the settings button still opens its dialog with consent already stored. F1 coexistence: with the tour overlay ON the topbar step, the notifications menu still opens under the spotlight - the overlay never blocks the app its own menus and dialogs.

Run: 2026-10-30T16:01:11.677Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## Method

Everything is driven through the committed selectors (skip link via keyboard Tab order, topbar trigger by its data-tour hook, dialogs by role=dialog presence, Escape/close by committed behavior) with no test-specific app changes. This is a SURFACES smoke: it proves existing behavior is not regressed BY the engine work; full engine behavior lives in scripts 01-09.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | J2: the skip link is still the first tab stop on a portal page ({"tag":"A","text":"Skip to content","href":"http://localhost:4310/portal/commonwealth/student/juan.santos#main-content"}) |
| 2 | PASS | J2: activating the skip link still moves focus into #main-content ({"id":"main-content","inMain":true}) |
| 3 | PASS | J2: the topbar notifications trigger still exists |
| 4 | PASS | J2: the notifications menu still opens |
| 5 | PASS | J2: Escape closes it (no strand) |
| 6 | PASS | J2: focus is restored to the notifications trigger after close |
| 7 | PASS | J2: the cookie banner still reopens from its Cookie settings button (consent stored) (Cookie settings clicked in-page; banner region verified (class prefix + text)) |
| 8 | PASS | J2: the notifications dialog opens while the tour overlay is up (F1 coexistence intact) (tour on the topbar step, trigger clicked under the spotlight) |

8 pass, 0 fail
