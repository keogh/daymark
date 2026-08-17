# Implementation Plan

## Current Specification

SPEC-007 — Task Management

## Active Task

TASK-007-002 — Implement Transactional Task Rename

## Status

Complete

---

# Immediate Plan

1. Add `TaskRepository.updateDescription(id, description, normalizedDescription,
   updatedAt)` (conditional update by `id`, returns the updated row or
   `undefined`) and `TaskRepository.findByNormalizedDescriptionExcluding(
   normalizedDescription, excludedTaskId)` for the different-Task collision
   check.
2. Extend `TaskService` with `tasks: TaskRepository` and
   `transactions: TransactionRunner` dependencies and a `rename(input)` method:
   validate, run in one transaction — load target (`TASK_NOT_FOUND` if
   missing), check collision excluding self (`TASK_DESCRIPTION_CONFLICT`),
   update description/normalizedDescription/updatedAt via `clock.now()`,
   return `TaskMutationResult`. Reuse the `InvalidPersistedTimerStateError` /
   `console.error` + `INTERNAL_ERROR` pattern from `IntervalService` for
   unexpected persistence failures.
3. Update `registerApplicationLifecycle` (`src/main/app/lifecycle.ts`) to pass
   the new `tasks`/`transactions` dependencies into `TaskService` so the app
   keeps compiling (no IPC/preload wiring — that stays in TASK-007-004).
4. Add repository tests (`updateDescription`, collision lookup) to
   `test/main/database/repositories/task-repository.test.ts`.
5. Add service tests to `test/main/services/task-service.test.ts` (switch its
   fixture to a disposable database + real `TaskRepository`/`TransactionRunner`
   like `interval-service.test.ts`) covering: valid rename, self-collision
   exclusion (AC-007-004), different-Task collision without mutation
   (AC-007-005), missing target (AC-007-010), and rollback/INTERNAL_ERROR on
   unexpected persistence failure.
6. Add a disposable-SQLite integration test (new
   `test/main/services/task-service.integration.test.ts`, mirroring
   `interval-service.integration.test.ts`) proving: a Task visible across
   multiple Daily History days is renamed everywhere (AC-007-011), and
   renaming the currently active (running/paused) Task leaves `AppState` and
   every interval unchanged (AC-007-009).
7. Run the focused new/changed tests, then `npm run typecheck` and
   `npm run lint`.

---

# Scope Guard

No delete/deletion-summary behavior, IPC registration, preload, or renderer UI
in this task (TASK-007-003–006).

---

# Completion

Completion is reached when TASK-007-002's rename service/repository behavior
exists with passing focused tests (including the disposable-SQLite
integration case), `npm run typecheck`, and `npm run lint`, and
`docs/specs/007-task-management/tasks.md` records the task as Complete with
evidence.
