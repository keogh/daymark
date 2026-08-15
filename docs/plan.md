# Implementation Plan

## Current Specification

SPEC-002 — Daily History

## Active Task

TASK-002-002 — Define History Contracts and Projection Primitives

## Status

Complete

---

# Source

- Specification: `docs/specs/002-daily-history/spec.md`
- Task breakdown: `docs/specs/002-daily-history/tasks.md`

The task breakdown contains the full ordered implementation sequence. This file is
only the execution plan for the active task.

---

# Immediate Plan

1. Define the shared history page contracts and strict runtime validation for the
   optional local-day cursor.
2. Add pure local-calendar, interval projection, total, deterministic ordering, and
   bounded activity-day pagination primitives.
3. Add focused unit tests for closed/open intervals, cross-midnight clipping, exact
   boundaries, ordering, cursor behavior, and daylight-saving transitions.
4. Run focused history tests, typecheck, lint, and formatting verification; record
   task evidence when all checks pass.

---

# Scope Guard

Do not add SQLite queries, service orchestration, IPC registration, preload wiring,
or React history UI in this task.

---

# Completion

TASK-002-002 is complete. Shared renderer-facing history contracts and the fixed
30-activity-day limit are defined alongside strict runtime validation for empty and
cursor requests. Pure projection utilities cover local calendar boundaries,
half-open overlap, open and cross-midnight intervals, totals, deterministic
ordering, and initial/older page selection. Focused history tests, the full test
suite, typecheck, lint, and formatting verification passed.
