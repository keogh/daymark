# Implementation Plan

## Current Specification

SPEC-004 — One-Click Task Switching

## Active Task

TASK-004-004 — Add accessible history-row Play controls

## Status

Complete

---

# Immediate Plan

1. Add state-aware Daily History row actions that map idle, paused-same-task,
   running-same-task, and different-task cases onto the existing timer switch
   boundary without disabling unrelated timer controls.
2. Keep row-scoped pending and compact stale-task feedback in the history UI,
   and trigger authoritative timer/history refresh after success or
   `TASK_NOT_FOUND`.
3. Add focused renderer tests for labels, keyboard activation, pending, refresh,
   and controlled error behavior, then run the task verification commands plus
   `npm run typecheck` and `npm run lint`.

---

# Scope Guard

Do not add suggestion-list active switching, interval-row actions, tray
switching, analytics, or settings behavior in this task.

---

# Completion

TASK-004-004 is complete. Daily History now exposes state-aware accessible row
actions backed by the validated `switchToTask(...)` timer boundary, keeps
pending duplicate prevention scoped to the activated row, preserves unrelated
timer controls during history-triggered switching, and shows compact
non-blocking stale-task feedback while still forcing authoritative history
refresh on success and `TASK_NOT_FOUND`.
