# Implementation Plan

## Current Specification

SPEC-003 — Task Search and Reuse

## Active Task

TASK-003-002 — Implement Bounded Suggestion Queries and Projections

## Status

Complete

---

# Immediate Plan

1. Add one bounded grouped query for matching, ordering, recency, and durations.
2. Reuse the DST-safe local-day boundary helper with a supplied `now` snapshot.
3. Add disposable-SQLite tests for matching, all tie-breakers, projections,
   anomalous tasks, query count, result limit, and read-only behavior.
4. Run focused repository/history regressions, typecheck, lint, and the full suite;
   record evidence.

---

# Scope Guard

Do not add service orchestration, IPC/preload exposure, UI behavior, schema changes,
or per-result queries.

---

# Completion

TASK-003-002 is complete. One bounded, read-only grouped query returns deterministic
suggestions and timestamp-derived projections using the supplied snapshot and
DST-safe day boundaries. Focused tests, formatting, typecheck, lint, all 207 tests,
and diff checks pass. TASK-003-003 is the next unblocked task.
