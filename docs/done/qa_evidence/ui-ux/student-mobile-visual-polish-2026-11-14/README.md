# Student mobile visual polish

[PR #95](https://github.com/Hachiiki/AICSPortal/pull/95) · [Earlier mobile comparisons](https://github.com/Hachiiki/AICSPortal/pull/95#issuecomment-6851915051)

- Baseline application: [dce5b80](https://github.com/Hachiiki/AICSPortal/commit/dce5b80b17ff659abec7b967cd30cf263ef93d59).
- Round 1 was a local preview. It introduced the revised Geist hierarchy, shared card and badge corners, and lighter Lucide strokes. The reviewers identified a three-line coursework title at 320 px, a split academic year with enlarged text, and weaker notification and calendar labels.
- Round 2 application: [c8abc84](https://github.com/Hachiiki/AICSPortal/commit/c8abc842232b9715070a01602b1117d6db4d802a). The coursework title fits on two lines at 320 px, the academic year stays together at 200% text, and Notifications and the Events agenda have clearer titles and labels.

| Baseline | Round 2 |
| --- | --- |
| [Home at 390 × 844](before/home-390.png) | [Home at 390 × 844](round-2/home-390.png) |
| [Tasks at 320 × 720](before/tasks-320.png) | [Tasks at 320 × 720](round-2/tasks-320.png) |
| [Tasks at 390 × 844](before/tasks-390.png) | [Tasks at 390 × 844](round-2/tasks-390.png) |
| [Academics at 390 × 844](before/academics-390.png) | [Academics at 390 × 844](round-2/academics-390.png) |
| [Events at 390 × 844](before/events-390.png) | [Events at 390 × 844](round-2/events-390.png) |
| [Selected date at 390 × 844](before/events-day-390.png) | [Selected date at 390 × 844](round-2/events-day-390.png) |
| [Notifications at 320 × 720](before/notifications-320.png) | [Notifications at 320 × 720](round-2/notifications-320.png) |
| [Dark Notifications at 320 × 720](before/notifications-dark-320.png) | [Dark Notifications at 320 × 720](round-2/notifications-dark-320.png) |
| [Academic summary at 200%](before/summary-large-text-320.png) | [Academic summary at 200%](round-2/summary-large-text-320.png) |

[Round 1 Tasks](round-1/tasks-320.png) · [Round 1 Events agenda](round-1/events-day-390.png) · [Round 1 Notifications](round-1/notifications-320.png) · [Round 1 enlarged academic summary](round-1/summary-large-text-320.png)

## Council review

Three independent GPT-6.1 Sol reviewers assessed the same screenshot set. All approved round 2. One task title still wraps “system” onto its own line at 320 px, as in the baseline.

| Review focus | Round 1 | Round 2 |
| --- | ---: | ---: |
| Visual design | 8.2 | 9.2 |
| Narrow-screen readability | 8.3 | 9.1 |
| Cross-screen consistency | 8.5 | 9.3 |

## Verification

- Matched Chromium emulation with the same synthetic student, reference date, viewport, font assets and interaction state. The preview bundled the actual portal components and intercepted fixture APIs.
- 62 of 62 mobile checks passed in each round, with zero browser errors. All 183 portal, onboarding and authorization unit tests passed.
- The comparison checked both navigation bars across 21 elements and found identical sizing, font, stroke, radius and color values. It also confirmed the desktop Academics title retained its typography.
- Screenshots use browser emulation. Physical devices and assistive technology remain outside this verification.

[Chromium results](round-2/results.json) · [Before-and-after measurements](comparison-checks.json)
