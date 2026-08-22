# Implementation Plan

## Current Specification

SPEC-010 — Settings and UX Polish

## Active Task

TASK-010-003 — Integrate Persisted Week Start with Analytics

## Status

TASK-010-003 Complete

---

# Immediate Plan

1. Select TASK-010-004 when further SPEC-010 implementation is requested.
2. Replace this plan with TASK-010-004's immediate steps before implementation.

---

# Scope Guard

Only persisted week-start Analytics behavior and the stale-summary invalidation
seam are included. Settings navigation/UI and theme behavior remain deferred.

---

# Completion

TASK-010-003 connected authoritative persisted Monday/Sunday settings to every
Analytics request and projection, added stale-summary invalidation support, and
made the visible week label follow the returned boundary. Focused tests (26 in 4
files), broader regressions (182 in 22 files), the full 666-test suite, typecheck,
lint, formatting, and diff checks passed on 2026-08-22.
