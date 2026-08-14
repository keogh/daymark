# Implementation Plan

## Current Specification

SPEC-001 — Core Time Tracking

## Active Task

TASK-001-006 — Implement Transactional Start

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

1. Implement Start using one clock snapshot and the existing transaction boundary.
2. Reuse or create the normalized task, open one interval, update AppState, and
   return authoritative running state.
3. Add deterministic disposable-database tests for success, validation, invalid
   transitions, normalized reuse, and rollback.
4. Run focused tests and project validation, then record completion evidence.

---

# Scope Guard

Do not implement Pause, Resume, Stop, switching, IPC, renderer behavior, or UI in
this task.

---

# Completion

TASK-001-006 is complete. Start now validates before persistence, uses one clock
snapshot, atomically reuses or creates a task, opens one interval, updates AppState,
and returns the authoritative running state. Focused and full project validation
passed.
