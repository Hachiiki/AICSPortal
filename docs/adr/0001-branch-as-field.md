# ADR 0001 — Branch as field, not separate database

Date: 2026-08-30

## Context

We need to support multiple campuses. Options were separate databases per branch or a `branch` field on every doc.

## Decision

Use one database `aics_portal` and store `branch: 'commonwealth'` on every doc. Every query filters by `{branch, ...}`.

## Consequences

Good: cheap indexes, simple connection, easy cross-branch admin queries later.
Bad: must remember to filter by branch on every query. Tests should assert branch scoping.

## Status

Accepted. Implemented in `src/lib/mongodb/connection.ts:1` and all queries.
