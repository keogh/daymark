# Implementation Plan

## Current Specification

SPEC-004 — One-Click Task Switching

## Active Task

TASK-004-002 — Implement atomic timer switch branches

## Status

Complete

---

# Immediate Plan

1. Extend `TimerService` with a validated `switchToTask` operation that branches
   across idle start, running switch/no-op, and paused switch/resume semantics by
   stable task ID.
2. Add deterministic service and disposable SQLite integration tests covering the
   switch branches, missing-task behavior, rollback, and invalid persisted-state
   mapping.
3. Run the focused timer test suites plus `npm run typecheck` and `npm run lint`.

---

# Scope Guard

Do not implement IPC registration, preload exposure, or renderer history-row
controls in this task.

---

# Completion

TASK-004-002 is complete. `TimerService.switchToTask(...)` now implements the
validated idle start, running switch, paused switch, same-running no-op, and
same-paused resume branches by stable task ID with atomic SQLite transactions.
Focused timer service and integration tests passed alongside `npm run typecheck`
and `npm run lint`.
