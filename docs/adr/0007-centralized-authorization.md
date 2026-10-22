# ADR 0007. Centralized authorization module

Date: 2026-10-22

## Context

Authorization was inlined in 33 route files: role checks, branch parity, teaching-load queries, and ownership filters each hand-rolled per route. Copies drifted apart and produced the 2026-10-21 audit findings in `docs/authz/enforcement-map.md`: writes missing ownership keys (C1, H2, M1), four routes trusting the JWT role claim for up to 7 days after a role change (M2), a 404 leaking which usernames exist before the permission gate (L1), and a skipped professor-of-record check on missing full names (H1b). Reviewing or changing a rule meant hunting every copy.

## Decision

All authorization decisions move into `src/lib/authz/`: `types.ts` (resource/action/deny-code unions), `context.ts` (DB actor resolution), `relations.ts` (ABAC attribute resolvers, memoized per request), `policies.ts` (the `can()` decision table), `guards.ts` (`requireCan`/`requireRole` plus the decision-to-HttpError mapping), `scopes.ts` (filter fragments), `permissions.ts` (client-safe IDs for the display-only nav mirror), `index.ts`. Every swap-scope route calls `requireCan(request, resource, action)`; ownership keys ride scope fragments into the Mongo filters instead of hand-built keys. The role always comes from the DB actor document, never the token claim.

Equivalence was proven before any behavior change: the golden matrix (`docs/authz/goldens.tsv`, run by `scripts/verify-authz.sh`) recorded current behavior in stage 0, the stage 2 swaps landed with zero golden movement, and the 14 owner-approved fixes (stage 3) each flipped exactly their own golden rows.

## Consequences

Good: one table to review against the enforcement map; a shared deny taxonomy mapped to HttpError statuses; scope fragments make missing-ownership-key bugs structurally impossible; the stale-role class (M2) is fixed by construction.

Bad: one indirection layer when reading a route; relations add memoized DB reads per guarded request; policy changes that alter a role's reach must update the nav mirror (`src/lib/aics/nav-config.ts`) in the same commit.

`requireRole` stays exported for surfaces where a role check is the whole rule; no route currently imports it.

## Status

Accepted. Landed on `main-full-dev` (stages 0 through 4, 2026-10-21/22, commits b897b56 through the C4 series). Porting to `main` is a post-Phase-5 owner decision per the phase-3 plan section 11: module files only, no `*.test.ts` files.
