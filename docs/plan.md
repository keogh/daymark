# Implementation Plan

## Current Specification

SPEC-007 — Task Management

## Active Task

TASK-007-001 — Define Task Management Contracts and Validation

## Status

Complete

---

# Immediate Plan

1. Add `INVALID_TASK_RENAME`, `INVALID_TASK_DELETE`, `TASK_DESCRIPTION_CONFLICT`,
   and `ACTIVE_TASK_CANNOT_BE_DELETED` to `AppErrorCode` (reuse existing
   `TASK_NOT_FOUND` and `INTERNAL_ERROR`).
2. Add `RenameTaskInput`, `DeleteTaskInput`, `TaskDeletionSummaryInput`,
   `TaskSummary`, `TaskMutationResult`, `TaskDeletionResult`,
   `TaskDeletionSummary`, and the three explicit channel constants to
   `src/shared/contracts/tasks.ts`. Do not extend the `TasksAPI` interface yet —
   consistent with the SPEC-004/SPEC-006 precedent, the API surface and preload
   wiring are added together with IPC registration in TASK-007-004, so
   `TimeTrackerAPI`/preload stay green in the meantime.
3. Add `src/shared/validation/task-management-input.ts` with
   `validateRenameTaskInput`, `validateDeleteTaskInput`, and
   `validateTaskDeletionSummaryInput`, reusing `task-description.ts`
   normalization/length rules and the strict trimmed-ID convention established
   by `interval-correction-input.ts`.
4. Add focused tests under `test/shared/contracts/` and
   `test/shared/validation/` mirroring the new files.
5. Run the focused new tests, `npm run typecheck`, and `npm run lint`.

---

# Scope Guard

No repository mutations, service transactions, IPC registration, or renderer UI
in this task (TASK-007-002–006).

---

# Completion

Completion is reached when TASK-007-001's contracts and validators exist with
passing focused tests, `npm run typecheck`, and `npm run lint`, and
`docs/specs/007-task-management/tasks.md` records the task as Complete with
evidence.
