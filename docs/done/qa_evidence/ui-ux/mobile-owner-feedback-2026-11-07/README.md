# Student phone follow-up

The phone header shows “Student portal” on one line at the standard widths tested. A circular magnifying-glass button floats above the lower-right corner of the five-destination bar. The More panel opens from the bottom and puts its X close button at the same thumb position as More. Press and selection feedback respect reduced-motion settings.

The bell opens a Notifications page with full message text, unread indicators and task links. On short screens, the guide can scroll its instructions, and the minimized guide sits across from Search. The welcome and campus photo are above sign-in, with the action visible at 320 × 720 in the fixture capture.

The two reviewers consulted the owner's mobile design reference independently. The review used that guidance for reachable controls, clear selection, text reflow and keeping secondary information out of overlays. [PR #95](https://github.com/Hachiiki/AICSPortal/pull/95)

## Verification

Reviewed application commit `871e28d`. The browser checks used Chromium with synthetic student accounts and data. Final verification completed on November 9, 2026, Asia/Shanghai.

| Check | Passed | Evidence |
| --- | ---: | --- |
| Portal browser checks | 452 | [Portal results](verification/portal.json) |
| Sign-in browser checks | 47 | [Sign-in results](verification/signin.json) |
| Page-end clearance checks | 48 | [Clearance results](verification/clearance.json) |
| Relevant unit tests | 155 | [Unit test log](verification/unit-tests.log) |
| Lint, typecheck and production build | 3 | [Quality results](verification/quality.json) |

The portal checks cover 320px, 360px, 390px and 430px phones plus wider student and staff layouts. The phone Search button measures 48px and sits above the bar with a 12px right inset in the sampled viewports. The suite verifies its accessible name, icon-only appearance, keyboard focus return, guide clearance at 320 × 420, readable labels at 200% text size, and the ability to scroll page endings above Search. Notifications checks cover browser Back, reload, task access and failed read updates. [GitHub CI](https://github.com/Hachiiki/AICSPortal/actions/runs/42637958182)

Earlier checks identified enlarged-text overflow from the Announcements heading and the dashboard standing value. Both reflow in the final application. [Earlier report](verification/earlier-enlarged-text-failure.json) · [Follow-up report](verification/remaining-enlarged-text-failure.json)

## Council scores

The reviews compare `1a893a4` with `871e28d`. Both reviewers worked from the supplied source, screenshots and test reports and read the owner's mobile design reference.

### Visual review

| Dimension | Before /10 | After /10 | Finding |
| --- | ---: | ---: | --- |
| Layout | 8.5 | 9 | The header fits on one line at standard text size. The five destinations reflow into two rows at 200% text on a 320px screen. |
| Typography | 7.5 | 8 | Welcome copy scales with text size. Course metadata and legal labels remain small. |
| Spacing | 8 | 8 | Search sits above the bar. More scrolls beneath a pinned Close control. |
| Visual hierarchy | 8.5 | 8.5 | The inbox separates titles, unread status and actions. The Search icon draws attention from nearby content. |
| Density | 7.5 | 7 | Search covers part of a task title in the first 320px viewport. The short-screen guide shows about one full line of instruction before scrolling. |
| Coherence | 8 | 8.5 | More and Close share a position. Search and the minimized guide occupy opposite corners. |
| First-use clarity | 8.5 | 8.5 | The inbox reads clearly as a page. The magnifying glass identifies Search. |
| Student task priorities | 8.5 | 8.5 | Tasks stays one tap away. The inbox offers task links and the page can scroll above Search. |
| Mobile sign-in | 8.5 | 8 | The campus welcome is readable and adds scroll before the form on short screens. |
| **Overall** | **8.2** | **8.2** | Ready for PR review. |

The visual reviewer highlighted the amount of guide text visible at 320 × 420 as the main remaining refinement. Navigation and minimize remain reachable. [Short guide](final/portal/guide-320x420.png)

### Usability review

| Dimension | Before /10 | After /10 | Finding |
| --- | ---: | ---: | --- |
| Navigation and discovery | 8.5 | 8 | Five destinations remain labeled. Search is thumb-reachable and relies on the icon for visual discovery. |
| Touch targets | 8 | 8 | Sampled checks cover the five navigation controls, Search and the More close action. |
| Phone reflow | 8 | 8 | Four phone widths, enlarged text and page-end clearance passed. |
| Modal and tour | 8 | 7.5 | The guide keeps its controls visible. Its instruction region could make scrolling easier to discover. |
| Keyboard and accessibility | 8 | 7.5 | The browser checks cover focus return, Escape, guide shortcuts and task selection. |
| Feedback and errors | 8.5 | 8.5 | Simulated read failure, retry and task access passed. |
| Task completion | 8.5 | 8.5 | Simulated search links, notification links and submission passed. |
| Shared desktop and faculty | 7 | 7 | The desktop student matrix and staff navigation checks passed. |
| Mobile sign-in | 8 | 7.5 | The photo-first design is legible and puts credentials and actions lower on short screens. |
| **Overall** | **8.1** | **7.8** | Ready for PR review. |

The before score is the mean of the listed baseline ratings. Both reviewers observed that the floating button can temporarily obscure part of a task row or calendar during scrolling. The clearance checks confirm that the sampled page endings can scroll above the button. Review evidence covers browser emulation, keyboard input and synthetic accounts. Physical phones, software keyboards, password managers and assistive technology remain coverage gaps.

## Commit comparisons

| Change | Before | After |
| --- | --- | --- |
| Campus photo and welcome before the form | [Sign-in](commits/5211635/sign-in-320.png) | [Sign-in](commits/e1f9199/sign-in-320.png) |
| One-line header and More close control | [Dashboard](commits/e1f9199/dashboard-320.png), [menu](commits/e1f9199/drawer-320.png) | [Dashboard](commits/9145c43/dashboard-320.png), [menu](commits/9145c43/drawer-320.png) |
| Notifications become a page | [Dropdown](commits/9145c43/notifications-320.png) | [Notifications](commits/aba2b65/notifications-320.png) |
| More content scrolls beneath its pinned close action | [Short screen](commits/aba2b65/drawer-320x420.png) | [Short screen](commits/6bdf1a3/drawer-320x420.png) |
| Large text reflows in the bar and dashboard | [Earlier run](commits/5128a32/phone-text-200-percent-320.png) | [Dashboard reflow](commits/f025e27/phone-text-200-percent-320.png) |
| Search moves from a left pill to a right icon | [Left pill](commits/8da1611/dashboard-320.png) | [Right icon](final/portal/dashboard-320.png) |

Captures use synthetic accounts and matching viewports. Each snapshot records its source files and asset loading. The sign-in baseline reuses a capture whose app and build inputs match the plan commit. Two intermediate Notifications commits use the compiler and generation phases to render the historical UI. The route typing fix and final production build passed the full quality checks. [File and source manifest](manifest.json)
