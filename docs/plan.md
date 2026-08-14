# Implementation Plan

## Current Specification

SPEC-001 — Core Time Tracking

## Active Task

TASK-001-004 — Implement Duration Projections

## Status

Complete

---

# Source

- Specification: `docs/specs/001-core-time-tracking/spec.md`
- Task breakdown: `docs/specs/001-core-time-tracking/tasks.md`

The task breakdown contains the full ordered implementation sequence. This file is
only the execution plan for the active task.

---

# Immediate Plan

1. Implement pure interval duration and half-open range-overlap calculations using
   an authoritative `now` for open intervals.
2. Add query-backed session, current-task local-today, and lifetime projections.
3. Add deterministic unit and disposable-database tests for empty data, multiple
   intervals, pauses, exact boundaries, open intervals, and midnight.
4. Run focused tests and project validation, then record completion evidence.

---

# Scope Guard

Do not implement timer transitions, timer-state reconstruction, mutable counters,
history grouping, formatting, IPC, or UI in this task.

---

# Completion

TASK-001-004 is complete. Pure interval overlap calculations and a query-backed
projector now derive session, local-today, and lifetime active durations from
persisted intervals at an authoritative `now`. Focused and full project validation
passed.
