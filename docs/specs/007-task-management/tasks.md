# SPEC-007 — Task Breakdown

## Source

- Specification: `docs/specs/007-task-management/spec.md`
- Specification status: Verified
- Last reviewed against specification: 2026-08-21

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
| TASK-007-002 | Implement transactional task rename | Complete | TASK-007-001 | AC-007-003–005, AC-007-009–011 |
| TASK-007-003 | Implement transactional task deletion and deletion summary | Complete | TASK-007-001 | AC-007-006–008, AC-007-010–011 |
| TASK-007-004 | Expose validated task management APIs | Complete | TASK-007-002, TASK-007-003 | AC-007-010, AC-007-012 |
| TASK-007-005 | Add task actions and rename workflow | Complete | TASK-007-004 | AC-007-001–005, AC-007-009–013 |
| TASK-007-006 | Add task deletion workflow with informative confirmation | Complete | TASK-007-004 | AC-007-001, AC-007-006–008, AC-007-010–013 |
| TASK-007-007 | Verify task management and update documentation | Complete | TASK-007-005, TASK-007-006 | AC-007-001–013 |

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

Complete

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

### Completion Evidence

- `npx vitest run --run test/main/database/repositories/task-repository.test.ts test/main/services/task-service.test.ts test/main/services/task-service.integration.test.ts test/main/services/timer-service.integration.test.ts test/main/services/manual-time-service.integration.test.ts test/main/ipc/tasks.test.ts` — passed, 6 files and 46 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` (full suite) — passed, 53 files and 451 tests.
- Added `TaskRepository.findByNormalizedDescriptionExcluding(...)` (collision
  lookup excluding the target Task) and `TaskRepository.updateDescription(...)`
  (conditional update by `id`, returning the updated row or `undefined`) to
  `src/main/database/repositories/task-repository.ts`.
- Added `TaskService.rename(input)` to `src/main/services/task-service.ts`:
  validates input, runs in one `TransactionRunner` transaction, loads the
  target Task (`TASK_NOT_FOUND` if missing), checks the self-excluded
  normalized-description collision (`TASK_DESCRIPTION_CONFLICT`), updates
  description/normalizedDescription/updatedAt via `Clock.now()`, and returns
  `TaskMutationResult`. Reused `IntervalService`'s
  `InvalidPersistedTimerStateError` + `console.error`/`INTERNAL_ERROR` pattern
  for unexpected persistence failures. `TaskService` now takes `tasks:
  TaskRepository` and `transactions: TransactionRunner` dependencies in
  addition to the existing `clock` and `suggestionQueries`.
- Updated `registerApplicationLifecycle` (`src/main/app/lifecycle.ts`) and the
  `TaskService` construction sites in
  `test/main/services/timer-service.integration.test.ts` and
  `test/main/services/manual-time-service.integration.test.ts` to pass the new
  `tasks`/`transactions` dependencies so the app and existing test suites keep
  compiling; no IPC/preload/renderer wiring was touched (deferred to
  TASK-007-004).
- Repository tests cover `updateDescription` (exact-one-row update preserving
  ID, missing-target `undefined`) and
  `findByNormalizedDescriptionExcluding` (collision found, self-match
  excluded, no match).
- Service tests (disposable SQLite, no mocked repositories) cover valid
  rename, self-collision exclusion (AC-007-004), different-Task collision
  without mutation (AC-007-005), missing target (AC-007-010), invalid input,
  and transaction rollback mapped to a logged `INTERNAL_ERROR`.
- New `test/main/services/task-service.integration.test.ts` proves: a Task
  visible across two loaded Daily History days is renamed on both
  (AC-007-011), and renaming the currently active Task — both running and
  paused — leaves `AppState` and every interval unchanged while
  `TimerStateReader.getState()` reflects the new description without altering
  timer status or session timing (AC-007-009).

---

## TASK-007-003 — Implement Transactional Task Deletion and Deletion Summary

### Status

Complete

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

### Completion Evidence

- `npx vitest run --run test/main/database/repositories/task-repository.test.ts test/main/services/task-service.test.ts test/main/services/task-service.integration.test.ts` — passed, 3 files and 36 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 53 files and 466 tests.
- Added `TaskRepository.delete(...)`, relying on the existing SQLite
  `ON DELETE CASCADE`, and `findDeletionSummary(...)`, a bounded aggregate read
  that reports Task identity, complete interval count, and lifetime duration
  with open intervals projected through the supplied Clock snapshot.
- Added transactional `TaskService.delete(...)`: validates before persistence,
  loads the target and `AppState` inside one transaction, rejects missing and
  running/paused active targets without mutation, deletes exactly one inactive
  Task, and safely maps/logs unexpected persistence failures.
- Added read-only `TaskService.getDeletionSummary(...)` with validation,
  missing-target handling, Clock-based lifetime projection, and safe unexpected
  failure mapping.
- Repository, service, and disposable-SQLite integration tests prove cascade
  isolation, other-Task/interval and `AppState` preservation, accurate summary
  values, updated authoritative history projections, missing/invalid target
  safety, running and paused active-task rejection, invalid persisted-state
  handling, and transaction rollback.

---

## TASK-007-004 — Expose Validated Task Management APIs

### Status

Complete

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

### Completion Evidence

- `npx vitest run --run test/main/ipc/tasks.test.ts test/preload/index.test.ts test/renderer/app/App.test.tsx` — passed, 3 files and 41 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 53 files and 471 tests.
- Extended `TasksAPI` and the preload bridge with explicit `rename`, `delete`,
  and `getDeletionSummary` methods routed only through their named channels.
- Registered all three task-management IPC handlers with exact-shape runtime
  validation before service execution, explicit validated-value
  reconstruction, controlled-error sanitization, and operation-only logging
  for unexpected failures without user-created descriptions.
- Updated application lifecycle composition to expose the complete bounded
  `TaskService` API and updated renderer test composition for the extended
  public contract without implementing TASK-007-005 or TASK-007-006 UI.
- IPC and preload tests prove explicit exposure and routing, normalization,
  rejection before service execution for malformed and extra-property input,
  controlled failure passthrough, and sanitized unexpected-failure mapping.

### Traceability

- Acceptance criteria: AC-007-010, AC-007-012
- Specification sections: 9, 10, 12, 13, 18, 21

---

## TASK-007-005 — Add Task Actions and Rename Workflow

### Status

Complete

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

### Completion Evidence

- `npx vitest run --run test/renderer/app/RenameTaskDialog.test.tsx test/renderer/app/DailyHistory.test.tsx test/renderer/app/App.test.tsx` — passed, 3 files and 55 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 54 files and 477 tests.
- `npm run package` — passed for the macOS arm64 Electron package.
- Packaged-app smoke verification with an isolated temporary profile proved
  keyboard menu activation, Rename/Delete task-action discoverability, complete
  description prefill, managed field focus, successful rename/close/refresh,
  and zero captured renderer console warnings or errors.
- Added the source-owned shadcn/ui Dropdown Menu and a labeled per-row Task
  actions trigger that remains independent from expand/collapse and Play/Resume.
- Added `RenameTaskDialog` with shared exact-input validation, Cancel and Escape
  behavior, pending duplicate prevention, controlled collision/missing/internal
  errors, preserved input on failure, and focus return to the invoking trigger.
- Successful rename calls the existing authoritative timer refresh, whose
  revision reconciles every currently loaded history day; renderer coverage
  proves the active timer and two loaded Task occurrences update together.

### Traceability

- Acceptance criteria: AC-007-001–005, AC-007-009–013
- Specification sections: 4, 7, 10–15, 19, 22, 23

---

## TASK-007-006 — Add Task Deletion Workflow With Informative Confirmation

### Status

Complete

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

### Completion Evidence

- `npx vitest run --run test/renderer/app/DeleteTaskDialog.test.tsx test/renderer/app/DailyHistory.test.tsx test/renderer/app/App.test.tsx` — passed, 3 files and 62 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 55 files and 488 tests.
- Added `DeleteTaskDialog` with informative Task description, complete interval
  count and lifetime duration, Cancel behavior, pending-state duplicate
  prevention, safe controlled-error messages, and focus management.
- Daily History now loads the authoritative deletion summary before opening
  confirmation, communicates loading/read failures without mutation, and
  disables running/paused active-Task deletion with an accessible reason.
- Successful deletion reuses the authoritative timer refresh revision to
  reconcile every currently loaded history day and remove all visible Task
  occurrences.

---

## TASK-007-007 — Verify Task Management and Update Documentation

### Status

Complete

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

### Completion Evidence

- `npm run format:check` — passed after applying the repository formatter to
  seven SPEC-007 implementation/test files found by the initial check.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- `npm test` — passed, 55 files and 488 tests.
- `npm run package` — passed for the macOS arm64 Electron package.
- Automated unit, repository, integration, preload/IPC, and renderer coverage
  directly verifies AC-007-001 through AC-007-013, including exact boundary
  validation, transactional no-mutation failures, cross-day refresh, focus,
  labels, and active-Task protection.
- AC-007-001–002 and AC-007-013 are evidenced by Daily History/Rename dialog
  renderer tests plus packaged keyboard menu activation, labels, prefill, and
  focus checks.
- AC-007-003–005 and AC-007-009 are evidenced by repository/service/integration
  and App tests for identity/interval/AppState preservation, self-normalizing
  rename, collision isolation, and active-timer refresh; packaged rename and
  collision scenarios also passed.
- AC-007-006–008 are evidenced by deletion-summary, transactional delete,
  cascade, dialog, and active-state tests plus packaged confirmation, SQLite,
  accessible-disablement, and forged-command checks.
- AC-007-010–011 are evidenced by service/dialog missing-target tests and App
  refresh tests covering every loaded day and timer state after both mutation
  types.
- AC-007-012 is evidenced by exact-shape shared-validation, preload, and IPC
  tests proving malformed and extra-property inputs are rejected before service
  execution.
- Packaged-app smoke verification used an isolated profile at 1040×688 and
  proved complete rename prefill with managed focus, successful authoritative
  rename refresh, normalized collision rejection with the entered value
  preserved, informative confirmation for two complete intervals, confirmed
  deletion, and removal from loaded history.
- Direct inspection of the isolated SQLite database after packaged deletion
  proved that the deleted Task and both associated intervals were absent, the
  other Tasks and intervals remained, and the orphan interval count was zero.
- Packaged verification also proved the active Task's Delete action exposed
  `aria-disabled="true"` with the reason “Stop this task before deleting it.”;
  a forged preload command independently returned
  `ACTIVE_TASK_CANNOT_BE_DELETED`, while the running timer and persisted
  `AppState` remained active.
- Page identity, meaningful rendered content, absence of a framework error
  overlay, screenshot evidence, and target interactions passed. No relevant
  renderer console warnings, errors, or uncaught exceptions were captured.
- Architecture, persistence, security, performance, scope, and documentation
  were reviewed against the project Definition of Done. No migration,
  dependency, architectural decision, or unrelated product change was needed.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-007-001 through AC-007-013 directly;
- run all validation required by SPEC-007 and the project Definition of Done;
- perform the required packaged-application checks;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
