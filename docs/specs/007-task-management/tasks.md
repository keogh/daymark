# SPEC-007 — Task Breakdown

## Source

- Specification: `docs/specs/007-task-management/spec.md`
- Specification status: Draft
- Last reviewed against specification: 2026-08-16

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this
breakdown to match the specification.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record focused verification evidence before marking a task `Complete`.
- Reuse SPEC-001/003/006 normalization, `AppResult`, transaction, error, dialog,
  and refresh patterns only where their semantics match SPEC-007.
- Do not add a dedicated Task list view, task merging, undo, bulk rename/delete,
  interval-level mutation, or any field beyond `description`.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-007-001 | Define task management contracts and validation | Complete | None | AC-007-004, AC-007-005, AC-007-010, AC-007-012 |
| TASK-007-002 | Implement transactional task rename | Pending | TASK-007-001 | AC-007-003–005, AC-007-009–011 |
| TASK-007-003 | Implement transactional task deletion and deletion summary | Pending | TASK-007-001 | AC-007-006–008, AC-007-010–011 |
| TASK-007-004 | Expose validated task management APIs | Pending | TASK-007-002, TASK-007-003 | AC-007-010, AC-007-012 |
| TASK-007-005 | Add task actions and rename workflow | Pending | TASK-007-004 | AC-007-001–005, AC-007-009–013 |
| TASK-007-006 | Add task deletion workflow with informative confirmation | Pending | TASK-007-004 | AC-007-001, AC-007-006–008, AC-007-010–013 |
| TASK-007-007 | Verify task management and update documentation | Pending | TASK-007-005, TASK-007-006 | AC-007-001–013 |

---

# Tasks

## TASK-007-001 — Define Task Management Contracts and Validation

### Status

Complete

### Outcome

Shared contracts and exact-shape runtime validators define rename, delete, and
deletion-summary commands, results, and controlled errors without changing
persistence.

### Dependencies

None.

### Included

- Define `RenameTaskInput`, `DeleteTaskInput`, `TaskDeletionSummaryInput`, their
  results, explicit channel names, and the extended typed `TasksAPI` surface.
- Validate entity IDs, allowed properties, and description shape/length reusing
  the established rules from `task-description.ts`.
- Add controlled codes for invalid rename, invalid delete/summary input, and the
  description-conflict and active-task-cannot-be-deleted failures; reuse the
  existing `TASK_NOT_FOUND` code.
- Add focused shared-contract and validator tests under mirrored `test/` paths.

### Excluded

- Repository mutations, service transactions, IPC registration, and renderer UI.

### Deliverables

- Shared task-management contracts, validators, error typing, and focused tests.

### Verification

- Run focused shared contract/validation tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-007-004, AC-007-005, AC-007-010, AC-007-012
- Specification sections: 9, 10, 12, 13, 16

### Completion Evidence

- `npx vitest run --run test/shared/contracts/app-result.test.ts test/shared/contracts/tasks.test.ts test/shared/validation/task-management-input.test.ts` — passed, 3 files and 55 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` (full suite) — passed, 52 files and 439 tests.
- Added `RenameTaskInput`, `DeleteTaskInput`, `TaskDeletionSummaryInput`,
  `TaskSummary`, `TaskMutationResult`, `TaskDeletionResult`,
  `TaskDeletionSummary`, and the `tasks:rename` / `tasks:delete` /
  `tasks:get-deletion-summary` channel constants to
  `src/shared/contracts/tasks.ts`.
- Added `INVALID_TASK_RENAME`, `INVALID_TASK_DELETE`,
  `TASK_DESCRIPTION_CONFLICT`, and `ACTIVE_TASK_CANNOT_BE_DELETED` to
  `AppErrorCode`, reusing the existing `TASK_NOT_FOUND` and `INTERNAL_ERROR`
  codes.
- Added `src/shared/validation/task-management-input.ts` with exact-shape
  validators for rename, delete, and deletion-summary input, reusing
  `task-description.ts` normalization/length rules and the strict
  already-trimmed-ID convention established by `interval-correction-input.ts`.
- Consistent with the SPEC-004/SPEC-006 precedent (`SwitchToTaskInput` /
  `IntervalsAPI` were defined before their API surface was wired), the
  `TasksAPI` interface and preload/`TimeTrackerAPI` wiring are intentionally
  deferred to TASK-007-004 so this task stays self-contained without touching
  IPC registration or renderer/preload code.

---

## TASK-007-002 — Implement Transactional Task Rename

### Status

Pending

### Outcome

A transactional service operation renames exactly one Task while preserving its
identity, every associated interval, and `AppState`, and rejects collisions with
a different Task.

### Dependencies

TASK-007-001.

### Included

- Add repository support for a conditional Task description update and a
  normalized-description collision lookup that excludes the target Task.
- Implement missing-target and different-Task-collision outcomes with rollback
  and no mutation.
- Allow a normalized description that only matches the target's own current
  value (self-exclusion).
- Preserve Task ID, every interval, and `AppState`, including when the target is
  the currently active Task.
- Add deterministic service, repository, and disposable-SQLite integration
  tests, including a rename of the active Task.

### Excluded

- Delete behavior, deletion-summary reads, IPC wiring, and renderer controls.

### Deliverables

- Repository/query changes, task rename service behavior, composition seams, and
  focused tests.

### Verification

- Run focused task rename service/repository/integration tests and relevant
  timer/history regressions, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-007-003–005, AC-007-009–011
- Specification sections: 7–9, 12–14, 17–18

---

## TASK-007-003 — Implement Transactional Task Deletion and Deletion Summary

### Status

Pending

### Outcome

A transactional service operation deletes exactly one Task and cascades to its
intervals while rejecting deletion of the currently active Task, and a
read-only operation reports an accurate deletion summary.

### Dependencies

TASK-007-001.

### Included

- Add repository support for Task deletion that relies on the existing
  `ON DELETE CASCADE` foreign key, plus an interval-count and lifetime-duration
  read for the deletion summary.
- Implement missing-target and active-task outcomes atomically, reading
  `AppState` within the same transaction as the delete.
- Preserve every other Task, every other interval, and `AppState` when deletion
  succeeds or is rejected.
- Add service, repository, and disposable-SQLite integration tests covering
  valid deletion, missing target, and both a running and a paused active-task
  rejection.

### Excluded

- Rename behavior, IPC wiring, and confirmation UI.

### Deliverables

- Repository deletion and summary queries, service behavior, composition seams,
  and focused tests.

### Verification

- Run focused task delete/summary service/repository/integration tests and
  relevant timer/history regressions, then `npm run typecheck` and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-007-006–008, AC-007-010–011
- Specification sections: 7–9, 12–14, 17–18

---

## TASK-007-004 — Expose Validated Task Management APIs

### Status

Pending

### Outcome

Preload and main-process IPC expose explicit runtime-validated rename, delete,
and deletion-summary operations without widening renderer privileges.

### Dependencies

- TASK-007-002
- TASK-007-003

### Included

- Register explicit `tasks:rename`, `tasks:delete`, and
  `tasks:get-deletion-summary` handlers.
- Extend the typed `window.timeTracker.tasks` API with `.rename(...)`,
  `.delete(...)`, and `.getDeletionSummary(...)`.
- Runtime-validate each exact input shape before service execution.
- Map expected failures and sanitize/log unexpected failures.
- Add focused preload, IPC, and composition tests.

### Excluded

- Task actions control, rename dialog, and delete confirmation UI.

### Deliverables

- IPC handlers, preload wiring, lifecycle composition, and boundary tests.

### Verification

- Run focused preload/IPC tests and boundary regressions, then
  `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-007-010, AC-007-012
- Specification sections: 9, 10, 12, 13, 18, 21

---

## TASK-007-005 — Add Task Actions and Rename Workflow

### Status

Pending

### Outcome

Daily History task rows expose an accessible Task actions control, and Rename
opens a prefilled dialog that handles valid, collision, pending, and refresh
flows.

### Dependencies

TASK-007-004.

### Included

- Add a Task actions control to each history task row, distinct from the
  Play/Resume control and the row's expand/collapse toggle.
- Add a Rename dialog prefilled with the Task's current description.
- Implement Cancel, inline validation, pending state, duplicate-submission
  prevention, controlled collision-error/value preservation, and successful
  close behavior.
- Refresh history and timer state authoritatively after success, including
  every loaded day showing the renamed Task.
- Add renderer tests, including a rename of the currently active Task and
  keyboard/focus behavior.

### Excluded

- Delete confirmation command behavior and deletion-summary loading.

### Deliverables

- History Task actions UI, rename dialog/controller flow, styling, and focused
  tests.

### Verification

- Run focused Daily History/rename renderer tests and relevant history/timer
  tests, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-007-001–005, AC-007-009–013
- Specification sections: 4, 7, 10–15, 19, 22, 23

---

## TASK-007-006 — Add Task Deletion Workflow With Informative Confirmation

### Status

Pending

### Outcome

Delete loads a deletion summary and opens an informative confirmation before
mutating, with the active Task's Delete action disabled in the renderer.

### Dependencies

TASK-007-004.

### Included

- Load the deletion summary and render a confirmation showing the Task's
  description, interval count, and lifetime duration.
- Disable Delete, with a programmatically associated reason, when the row's
  Task is the currently active timer task.
- Implement Cancel, pending state, duplicate-submission prevention, controlled
  failure behavior, and successful close behavior.
- Refresh history and timer state authoritatively after success, removing the
  deleted Task from every loaded day.
- Add renderer tests, including the disabled active-task state and keyboard/
  focus behavior.

### Excluded

- Rename dialog and command behavior.

### Deliverables

- Deletion-summary loading, confirmation dialog/controller flow, styling, and
  focused tests.

### Verification

- Run focused Daily History/delete renderer tests and relevant history/timer
  tests, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-007-001, AC-007-006–008, AC-007-010–013
- Specification sections: 4, 7, 10–15, 19, 22, 23

---

## TASK-007-007 — Verify Task Management and Update Documentation

### Status

Pending

### Outcome

SPEC-007 acceptance criteria and the project Definition of Done are verified,
and documentation reflects the completed Task management workflow.

### Dependencies

- TASK-007-005
- TASK-007-006

### Included

- Verify every acceptance criterion and record evidence.
- Run the full required validation suite and packaging.
- Smoke-test packaged rename, rejected rename collision, deletion of a
  non-active Task with cascading interval removal, and a disabled/rejected
  delete attempt on the active Task.
- Update `docs/progress.md` and any behavior documentation made inaccurate by
  the implementation.
- Reconcile specification and task statuses only after all checks pass.

### Excluded

- SPEC-008 System Tray and later roadmap work.

### Deliverables

- Acceptance evidence, full validation results, packaged-app smoke evidence, and
  updated documentation/statuses.

### Verification

- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run package`,
  then complete the specified packaged-app smoke scenarios.

### Traceability

- Acceptance criteria: AC-007-001–013
- Specification sections: 15–25

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-007-001 through AC-007-013 directly;
- run all validation required by SPEC-007 and the project Definition of Done;
- perform the required packaged-application checks;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
