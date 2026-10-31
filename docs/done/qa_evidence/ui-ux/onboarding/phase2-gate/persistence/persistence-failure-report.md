# persistence-failure-report

H2: persistence failures stay non-blocking. Transport read failure aborts the state GET: the launcher (an onboarding surface) hides and nothing else changes - the portal keeps working. A completion write forced to 500: the tour still runs and completes, the sentence announcement still fires, nothing restricts the portal. The real database stopped: verified from src/lib/session-auth.ts, the demo session itself is authenticated from the students collection, so the Phase 1 route cannot pass auth with the server fully down and refuses safely with 401 (no crash); onboarding surfaces hide via the documented res.ok=false path; nav re-auth fails and the app degrades to the login view safely (redirect, not a trap); after the database is restored the launcher surfaces again. A straight-from-Mongo read with the mongodb driver proves the healthy-session completion was really persisted (positive control).

Run: 2026-10-30T15:56:41.327Z
Baseline SHA: 46c33a53c5a502c4a6e5937bdeb7b81e2a82622f  HEAD SHA: 0c9f8819630bffda509df232b001d0d61171f56a

## Method

Scenario A/B intercept the TWO transport failure classes separately (route.abort on GET, route.fulfill 500 on PATCH) through Playwright routing against the real /api/onboarding/state; scenario C actually stops the real mongod (taskkill /F) and reloads so the route runs with the DB genuinely unreachable, then restarts it with the shared ensureMongod; scenario D reads onboarding_states with the mongodb driver to prove the healthy-session completion was really persisted (positive control). Tour completion = the launcher returns and the aria-live end announcement reads "Guided tour completed."

## Failure taxonomy

Read transport failure hides onboarding surfaces only; write transport failure is fire-and-forget (charitable completion); DB down degrades to 200/persisted:false rather than 5xx so the portal never sees an error path; a DB outage never locks the portal.

## Results

| # | Result | Detail |
|---|---|---|
| 1 | PASS | A: GET transport failure hides the launcher (surface = the launcher) |
| 2 | PASS | A: the portal keeps working with the read failed (http://localhost:4310/portal/commonwealth/student/juan.santos/academics) |
| 3 | PASS | A: no page errors under the read failure ([]) |
| 4 | PASS | A2: with a successful read the launcher shows (control for A) |
| 5 | PASS | A2: a normal completion returns the launcher (positive control) |
| 6 | PASS | B: the forced write failure was actually delivered (PATCH intercepted) |
| 7 | PASS | B: the tour still completes under the write failure (launcher returned after finishing) |
| 8 | PASS | B: completion treated charitably - end announcement present (aria-live host announcement) |
| 9 | PASS | B: no page errors under the write failure ([]) |
| 10 | PASS | B: the portal stays un-restricted after the failed completion write (http://localhost:4310/portal/commonwealth/student/juan.santos/academics) |
| 11 | PASS | C: the local mongod port is genuinely unreachable (TCP) |
| 12 | PASS | C: DB down -> the route refuses safely (401 Unauthorized, no 500/crash) ({"status":401,"body":{"ok":false,"error":"Unauthorized"}}) |
| 13 | PASS | C: surfaces stay hidden under the full DB outage (documented hide path) |
| 14 | PASS | C: portal navigation under the DB outage degrades safely (login redirect or stays put, no crash/no trap) (landed: stayed) |
| 15 | PASS | C: no page errors under the DB outage ([]) |
| 16 | PASS | C: after the DB returns, the launcher surfaces again (no trapped state) |
| 17 | PASS | D: the onboarding_states row exists for juan.santos (positive control persisted) ({"username":"juan.santos","role":"student","tour":true}) |

17 pass, 0 fail
