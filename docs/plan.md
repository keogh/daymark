# Implementation Plan

## Current Specification

SPEC-007 — Task Management

## Active Task

TASK-007-003 — Implement Transactional Task Deletion and Deletion Summary

## Status

Complete

---

# Immediate Plan

1. Add `TaskRepository.delete(id)` and a bounded aggregate deletion-summary
   read using the established lifetime-duration semantics.
2. Extend `TaskService` with `AppStateRepository`, transactional `delete`, and
   read-only `getDeletionSummary` operations, including validation, missing
   target, active-task, rollback, and safe internal-error behavior.
3. Update application and test composition sites for the new dependency.
4. Add focused repository and service tests for valid, missing, active,
   invalid, summary, cascade, isolation, and unexpected-failure behavior.
5. Extend disposable-SQLite integration coverage for cascading deletion,
   authoritative projections, and running/paused active-task rejection.
6. Run focused regressions, then `npm run typecheck`, `npm run lint`, and the
   full test suite.

---

# Scope Guard

No IPC registration, preload, renderer controls, or confirmation UI in this
task (TASK-007-004–006).

---

# Completion

Completion is reached when TASK-007-003's delete and deletion-summary
service/repository behavior exists with passing focused and regression tests,
`npm run typecheck`, and `npm run lint`, and the task breakdown records the
task as Complete with evidence.
