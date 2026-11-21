# Student mobile before and after

The preceding version appears on the left and the next version appears on the right. Each pair uses the same viewport, synthetic student data and interaction state. The first comparison starts at the original PR head. [PR #95](https://github.com/Hachiiki/AICSPortal/pull/95)

[Original PR versus the latest Home, Tasks, Events, dark Notifications and short sign-in](baseline-to-latest.png)

## Published app revisions

| Before | After | Screenshots |
| --- | --- | --- |
| [2469add](https://github.com/Hachiiki/AICSPortal/commit/2469add9c20ede3f356664bc10b2d63055f30a7c) | [4d7caef](https://github.com/Hachiiki/AICSPortal/commit/4d7caef1e5f95540308610beba0fff47fbbae353) | [Before and after](commit-first.png) |
| [4d7caef](https://github.com/Hachiiki/AICSPortal/commit/4d7caef1e5f95540308610beba0fff47fbbae353) | [11a1dce](https://github.com/Hachiiki/AICSPortal/commit/11a1dcec36ef491af8b7da6079bc34949920bab5) | [Before and after](commit-second.png) |
| [11a1dce](https://github.com/Hachiiki/AICSPortal/commit/11a1dcec36ef491af8b7da6079bc34949920bab5) | [d52c2e5](https://github.com/Hachiiki/AICSPortal/commit/d52c2e5b39aa461397a34991f8e257234240d1ab) | [Before and after](commit-third.png) |
| [d52c2e5](https://github.com/Hachiiki/AICSPortal/commit/d52c2e5b39aa461397a34991f8e257234240d1ab) | [281bde8](https://github.com/Hachiiki/AICSPortal/commit/281bde8b6f4012933d9b68968cfb09a5dd81ecf5) | [Before and after](15-grades-calendar-notifications.png) |
| [281bde8](https://github.com/Hachiiki/AICSPortal/commit/281bde8b6f4012933d9b68968cfb09a5dd81ecf5) | [cf053de](https://github.com/Hachiiki/AICSPortal/commit/cf053de2fed3b12021cb8d90685f4b1e7e9f42e7) | [Before and after](16-heading-and-calendar-text.png) |
| [cf053de](https://github.com/Hachiiki/AICSPortal/commit/cf053de2fed3b12021cb8d90685f4b1e7e9f42e7) | [a7dec5d](https://github.com/Hachiiki/AICSPortal/commit/a7dec5dad2d5c423ef42147d004af3f67421e46e) | [Before and after](commit-coursework.png) |
| [a7dec5d](https://github.com/Hachiiki/AICSPortal/commit/a7dec5dad2d5c423ef42147d004af3f67421e46e) | [8a36fa8](https://github.com/Hachiiki/AICSPortal/commit/8a36fa86df18d70c7d5f0fb74084f96a4234f4eb) | [Before and after](commit-calendar.png) |

## Iteration comparisons

| Pass | Screenshots |
| --- | --- |
| 1 | [First phone layout](01-first-composition.png) |
| 2 | [Home at 320 px](02-narrow-screen-reflow.png) |
| 3 | [Short sign-in, More, the calendar and Tasks](03-short-screens-and-calendar.png) |
| 4 | [Home priorities, dark Notifications, guide and Grades](04-priorities-and-dark-contrast.png) |
| 5 | [Enlarged Home and minimized guide](05-large-text-and-guide.png) |
| 6 | [Academic destinations and calendar agenda](06-destinations-and-agenda.png) |
| 7 | [Calendar markers and labeled actions](07-labeled-actions.png) |
| 8 | [The first enlarged Home view](08-large-text-first-screen.png) |
| 9 | [Open work and reading space](09-open-work-and-zoom.png) |
| 10 | [Calendar totals, task counts and sign-in help](10-explicit-counts-and-help.png) |
| 11 | [Checklist button reflow](11-checklist-reflow.png) |
| 12 | [Academic standing and busy dates](12-standing-and-busy-dates.png) |
| 13 | [Grade status and the enlarged dock](13-grades-and-enlarged-navigation.png) |
| 13 | [Tasks and Events reflow at 200% text](13-reflow-at-enlarged-text.png) |
| 14 | [Classroom location at enlarged text](14-room-and-dock-clearance.png) |
| 15 | [Grade titles, calendar cells and Notifications](15-grades-calendar-notifications.png) |
| 16 | [Notifications heading and larger calendar labels](16-heading-and-calendar-text.png) |
| 17 | [First coursework and Materials course at enlarged text](17-first-coursework-and-materials.png) |
| 18 | [Overdue status and file action](18-task-status-and-material-action.png) |
| 19 | [Calendar filters and file size formatting](19-calendar-filters.png) |
| 20 | [First busy week at enlarged text](20-first-calendar-week.png) |

## Independent council review

| Focus | Visual design /10 | Mobile usability /10 |
| --- | ---: | ---: |
| Visual design | 9.1 | 9.2 |
| Student workflows | 9.1 | 9.0 |
| Accessibility | 9.2 | 9.3 |

The council examined 30 screenshots. At 320 px and 200% text, the first busy calendar date, first overdue task and classroom location fit above the dock. Materials shows the first course heading before scrolling. The file title and Open action are visible after scrolling. Compact calendar counts and the height of the enlarged dock are the remaining density tradeoffs.

## Verification

- 51 browser checks and 16 additional enlarged-text checks passed in Chromium using the portal components and synthetic data. [Browser results](browser-checks.json)
- Desktop student and phone faculty and admin navigation passed smoke checks. The portal, onboarding and authorization suites passed 178 unit tests.
- [GitHub CI for the reviewed app revision](https://github.com/Hachiiki/AICSPortal/actions/runs/43346657708) · [Vercel preview build](https://vercel.com/wilardzysenpais-projects/aics-portal/EE7GB61nLf9qQr8o7V4Uj5jPxeXN)

Physical devices, native keyboards, assistive technology, PDF downloads and completed assignment submission remain unverified.
