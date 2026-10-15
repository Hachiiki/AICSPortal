[⬅️ Back to Index](./00_INDEX.md)

# 04 UI and vision findings

Browser: headless Chromium via agent-browser. Screenshots in `../qa-evidence/screenshots/`. No videos were supplied with the brief, so all findings below come from my own walkthrough.

## Login screen (01, 02, 03)

- Renders correctly: branch branding, credentials form, show-password toggle, remember-me (checked by default), support contact.
- Wrong password shows a single toast, "Invalid username or password." No user enumeration. Good.
- Empty fields are blocked with a validation message.
- A "Test Student Login" demo button is visible because this is a dev build. The underlying `DEV_CREDENTIALS` constant ships in the client bundle regardless of environment, see [BUG-012](./06_BUG_REGISTRY.md#bug-012).
- Face ID tab opens a scan panel. In the headless browser it showed a clean "Camera Unavailable" state with Try Again (10, 11). Code-level: a successful scan logs in with the dev credentials rather than any biometric match, see [BUG-012](./06_BUG_REGISTRY.md#bug-012).

## Student dashboard (04)

Login as `juan.santos` redirected to `/portal/commonwealth/student/juan.santos` and rendered:
- Welcome header with program, year, section
- GPA, units enrolled (20), subjects (7), standing (Regular)
- Announcements deck, "1 of 5", with dismiss and history controls
- Grades and Subjects table with per-period columns and "Pending" remarks; released values are correctly withheld by the server, so the table shows dashes, not leaked drafts

One cosmetic note: the Next.js dev tools badge overlaps the footer copyright text at 1280x800. Dev-mode only, not a production defect.

## localStorage spoof demo (05, 06)

This is the walkthrough result behind [BUG-009](./06_BUG_REGISTRY.md#bug-009):

1. Logged in as `juan.santos`, localStorage held exactly three keys: `aics_username`, `aics_branch`, `aics_role`
2. Deep-linking to `/portal/commonwealth/student/maria.cruz` while logged in as juan did NOT leak maria's data; the app renders from localStorage, so it showed "Welcome back, Juan!" (the URL username is ignored)
3. Editing `aics_username` to `maria.cruz` in localStorage and reloading gave the full portal as maria: "Welcome back, Maria!" with her GPA history, subjects, and documents (screenshot 06)

There is no server-side guard to defeat: the portal shell is a client component re-exported by `src/app/portal/[...slug]/page.tsx`, and no middleware exists. The data underneath is equally open through the API, so the spoof is a demonstration of the model, not an additional leak.

## Faculty portal (07, 09)

- Login as `m.reyes` redirected to `/portal/commonwealth/faculty/m.reyes`; the UI switched to the faculty navigation set (My Students, Grade Encoding, Previous Records, Announcements, Schedule, Tasks)
- Dashboard: 5 subjects, 75 students, 4 sections; My Subjects table with schedule and room
- Grade Encoding: section chips (7 sections, 81 rows), period filters, status legend (No status / Draft / Submitted / Released), auto-compute button, per-row History
- Auto-compute math verified against two rows: 82/85/84 gives 83.70 and 88/84/86 gives 86.00, matching the 30/30/40 weights with INC as 0

## Mobile (08)

At 390x844 the portal shows an intentional "Desktop Required" modal with a "Continue anyway" escape. The banner collapses to a hamburger. This is a designed gate (`MobileWarning.tsx`), not a defect.

## Console and errors

Console output across the walkthrough contained only dev-time analytics and HMR logs. Zero page errors, zero unhandled rejections observed during the flows exercised.

## Responsive and accessibility spot checks

- Mobile gate verified; I did not audit the full portal layout below desktop width because the app blocks it by design
- Accessibility: the login form uses proper labels; focus and contrast looked reasonable. A full audit was out of scope and I flag nothing beyond that observation
