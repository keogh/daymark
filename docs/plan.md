# Implementation Plan

## Current Specification

SPEC-005 — Manual Time Entry

## Active Task

TASK-005-002 — Implement transactional manual interval creation

## Status

In Progress

---

# Immediate Plan

1. Add the transactional manual-entry service flow and any repository helpers
   needed for global overlap detection.
2. Cover success, rollback, overlap rejection, missing-task handling, and
   unchanged `AppState` behavior with focused service and SQLite tests.
3. Run the focused manual-entry test subset plus `npm run typecheck` and
   `npm run lint`.
4. Update `docs/specs/005-manual-time-entry/tasks.md` and `docs/progress.md`
   with status and verification evidence.

---

# Scope Guard

Do not add IPC registration or renderer UI for manual entry in this task. Keep
scope limited to transactional service/repository behavior and supporting tests.

---

# Completion

Completion is reached when manual interval creation is transactional, overlap and
missing-task failures are controlled and non-mutating, focused tests pass, and
the task breakdown/progress docs record the evidence for `TASK-005-002`.
