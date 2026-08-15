# SPEC-006 — Task Breakdown

## Source

- Specification: `docs/specs/006-edit-and-delete-intervals/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-15

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this
breakdown to match the specification.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record focused verification evidence before marking a task `Complete`.
- Reuse SPEC-005 validation, transaction, error, dialog, and refresh patterns only
  where their semantics match SPEC-006.
- Do not add Task reassignment, open-interval mutation, task management, assisted
  overlap resolution, undo, bulk correction, or analytics behavior.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-006-001 | Define correction contracts and validation | Complete | None | AC-006-005, AC-006-010, AC-006-011, AC-006-013 |
| TASK-006-002 | Implement transactional interval editing | Complete | TASK-006-001 | AC-006-003–007, AC-006-010–012 |
| TASK-006-003 | Implement transactional interval deletion | Complete | TASK-006-001 | AC-006-008–012 |
| TASK-006-004 | Expose validated interval mutation APIs | Pending | TASK-006-002, TASK-006-003 | AC-006-010, AC-006-011, AC-006-013 |
| TASK-006-005 | Add interval actions and edit workflow | Pending | TASK-006-004 | AC-006-001–007, AC-006-010–014 |
| TASK-006-006 | Add confirmed deletion workflow | Pending | TASK-006-004 | AC-006-001, AC-006-008–014 |
| TASK-006-007 | Verify interval correction and update documentation | Pending | TASK-006-005, TASK-006-006 | AC-006-001–014 |

---

# Tasks

## TASK-006-001 — Define Correction Contracts and Validation

### Status

Complete

### Outcome

Shared contracts and exact-shape runtime validators define interval update and
delete commands, results, and controlled errors without changing persistence.

### Dependencies

None.

### Included

- Define update/delete inputs, mutation results, explicit channel names, and the
  typed preload API surface.
- Validate entity IDs, allowed properties, trimmed strings, local date/time
  syntax, and end-after-start behavior.
- Add or consolidate controlled codes for invalid commands, missing targets, open
  targets, overlap, and unexpected failure.
- Add focused shared-contract and validator tests under mirrored `test/` paths.

### Excluded

- Repository mutations, service transactions, IPC registration, and renderer UI.

### Deliverables

- Shared interval-management contracts, validators, error typing, and focused
  tests.

### Verification

- Run focused shared contract/validation tests, `npm run typecheck`, and
  `npm run lint`.

### Traceability

- Acceptance criteria: AC-006-005, AC-006-010, AC-006-011, AC-006-013
- Specification sections: 9, 10, 12, 13, 16, 21

### Completion Evidence

- `npm test -- --run test/shared/contracts/app-result.test.ts test/shared/contracts/intervals.test.ts test/shared/validation/interval-correction-input.test.ts` — passed, 3 files and 41 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Added explicit update/delete command, mutation-result, channel, and preload API contracts.
- Added exact-plain-object validators that reject malformed IDs, whitespace,
  unknown/missing properties, invalid local dates/times, normalized-invalid local
  date-times, and end timestamps that are not later than their starts.
- Added distinguishable controlled error codes for invalid commands, missing and
  open targets; existing overlap and internal error codes remain shared.

---

## TASK-006-002 — Implement Transactional Interval Editing

### Status

Complete

### Outcome

A transactional service operation updates exactly one closed interval while
preserving its identity, Task association, AppState, and global non-overlap.

### Dependencies

TASK-006-001.

### Included

- Add repository support for conditional closed-interval update and overlap
  detection that excludes the target interval.
- Convert independent local start/end date-time pairs to persisted timestamps.
- Implement missing-target, open-target, invalid-range, closed-overlap, and
  running-overlap outcomes with rollback/no mutation.
- Preserve interval ID, Task ID, AppState, and any current open interval.
- Support unchanged, cross-midnight, multi-day, and boundary-touching edits.
- Add deterministic service, repository, and disposable-SQLite integration tests.

### Excluded

- Delete behavior, IPC wiring, renderer controls, and Task reassignment.

### Deliverables

- Repository/query changes, interval edit service behavior, composition seams,
  and focused tests.

### Verification

- Run focused interval edit service/repository/integration tests and relevant
  timer/history regressions, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-006-003–007, AC-006-010–012
- Specification sections: 7–9, 12–18, 22

### Completion Evidence

- `npm test -- --run test/main/database/repositories/time-interval-repository.test.ts test/main/services/interval-service.test.ts test/main/services/interval-service.integration.test.ts test/main/services/timer-service.test.ts test/main/services/timer-service.integration.test.ts test/main/services/history-service.test.ts test/main/services/history-service.integration.test.ts` — passed, 7 files and 80 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Added a conditional closed-only repository update and half-open global overlap
  query that excludes the correction target.
- Added transactional edit behavior with repeated in-transaction validation,
  missing/open-target and closed/running-overlap outcomes, timer/AppState
  preservation checks, rollback, safe unexpected-failure mapping, and local
  technical logging.
- Covered unchanged, boundary-touching, cross-day/multi-day, current-session,
  authoritative projection refresh, and persistence failure behavior with
  disposable SQLite tests.

---

## TASK-006-003 — Implement Transactional Interval Deletion

### Status

Complete

### Outcome

A transactional service operation deletes exactly one closed interval while
preserving its Task, other intervals, AppState, and any current open interval.

### Dependencies

TASK-006-001.

### Included

- Add repository support for conditional closed-interval deletion.
- Implement valid, missing-target, and open-target behavior atomically.
- Preserve a Task when its last interval is deleted.
- Cover deletion of a closed interval belonging to the current session and
  transaction rollback behavior.
- Add service, repository, and disposable-SQLite integration tests.

### Excluded

- Task deletion, soft deletion, undo, IPC wiring, and confirmation UI.

### Deliverables

- Repository deletion, service behavior, composition seams, and focused tests.

### Verification

- Run focused interval delete service/repository/integration tests and relevant
  timer/history regressions, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-006-008–012
- Specification sections: 7–9, 12–18, 22

### Completion Evidence

- `npm test -- --run test/main/database/repositories/time-interval-repository.test.ts test/main/services/interval-service.test.ts test/main/services/interval-service.integration.test.ts test/main/services/timer-service.test.ts test/main/services/timer-service.integration.test.ts test/main/services/history-service.test.ts test/main/services/history-service.integration.test.ts` — passed, 7 files and 87 tests.
- `npm run typecheck` — passed.
- `npm run lint` — passed.
- Added a conditional closed-only repository deletion returning the single deleted
  interval while leaving open or missing targets unchanged.
- Added transactional service deletion with repeated in-transaction validation,
  controlled missing/open-target outcomes, Task/AppState/open-interval preservation,
  rollback, safe unexpected-failure mapping, and local technical logging.
- Covered exact-one and last-interval deletion, current-session authoritative
  history/timer projection changes, and forced persistence rollback with disposable
  SQLite tests.

---

## TASK-006-004 — Expose Validated Interval Mutation APIs

### Status

Pending

### Outcome

Preload and main-process IPC expose explicit runtime-validated update and delete
operations without widening renderer privileges.

### Dependencies

- TASK-006-002
- TASK-006-003

### Included

- Register explicit `intervals:update` and `intervals:delete` handlers.
- Expose typed `window.timeTracker.intervals.update(...)` and `.delete(...)`
  operations.
- Runtime-validate each exact input shape before service execution.
- Map expected failures and sanitize/log unexpected failures.
- Add focused preload, IPC, and composition tests.

### Excluded

- History actions, edit dialog, and delete confirmation UI.

### Deliverables

- IPC handlers, preload wiring, lifecycle composition, and boundary tests.

### Verification

- Run focused preload/IPC tests and boundary regressions, then
  `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-006-010, AC-006-011, AC-006-013
- Specification sections: 9, 10, 12, 13, 18, 21

### Completion Evidence

Record commands run, results, and relevant implementation notes when complete.

---

## TASK-006-005 — Add Interval Actions and Edit Workflow

### Status

Pending

### Outcome

Expanded history rows expose accessible correction actions and a complete-value
edit dialog that handles valid, cross-day, pending, failure, and refresh flows.

### Dependencies

TASK-006-004.

### Included

- Preserve row-body expansion and separate Play/Resume behavior.
- Add accessible Edit and Delete action affordances for closed intervals while
  keeping open intervals non-editable.
- Ensure the edit surface receives authoritative complete bounds rather than
  clipped selected-day values.
- Add read-only Task context and independent start/end date/time fields.
- Implement Cancel, inline validation, pending state, duplicate prevention,
  controlled error/value preservation, and successful close behavior.
- Refresh history and timer authoritatively after success.
- Add renderer and shared formatting tests, including cross-day projections and
  keyboard/focus behavior.

### Excluded

- Delete confirmation command behavior, Task selection, and Task management.

### Deliverables

- History interval action UI, complete-bound contract/query adjustment if needed,
  edit dialog/controller flow, styling, and focused tests.

### Verification

- Run focused Daily History/edit renderer tests and relevant history/timer tests,
  then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-006-001–007, AC-006-010–014
- Specification sections: 4, 7, 10–15, 19, 22, 23

### Completion Evidence

Record commands run, results, and relevant implementation notes when complete.

---

## TASK-006-006 — Add Confirmed Deletion Workflow

### Status

Pending

### Outcome

Delete actions require an accessible, informative confirmation and remove one
closed interval only after explicit confirmation.

### Dependencies

TASK-006-004.

### Included

- Show complete Task, interval range, and duration-to-remove context.
- Format cross-day ranges unambiguously.
- Implement Cancel, confirmation, pending state, duplicate prevention, controlled
  failure, focus management, and success behavior.
- Refresh history and timer authoritatively after success.
- Add renderer tests for confirmation content, no-mutation cancel, success,
  failure, stale targets, and keyboard accessibility.

### Excluded

- Task deletion, undo, and bulk deletion.

### Deliverables

- Delete confirmation/controller flow, styling, formatting support, and focused
  tests.

### Verification

- Run focused Daily History/delete renderer tests and relevant history/timer
  regressions, then `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-006-001, AC-006-008–014
- Specification sections: 4, 7, 10–15, 19, 22, 23

### Completion Evidence

Record commands run, results, and relevant implementation notes when complete.

---

## TASK-006-007 — Verify Interval Correction and Update Documentation

### Status

Pending

### Outcome

SPEC-006 is acceptance-verified in automated and packaged-app workflows, with
project documentation aligned to the completed M4 behavior.

### Dependencies

- TASK-006-005
- TASK-006-006

### Included

- Verify every acceptance criterion and record evidence.
- Run the full required validation suite and packaging.
- Smoke-test packaged editing, cross-day display, overlap rejection, delete
  cancellation, confirmed deletion, and timer-state preservation.
- Update `docs/progress.md` and any behavior documentation made inaccurate by the
  implementation.
- Reconcile specification and task statuses only after all checks pass.

### Excluded

- SPEC-007 Task Management and later roadmap work.

### Deliverables

- Acceptance evidence, full validation results, packaged-app smoke evidence, and
  updated documentation/statuses.

### Verification

- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run package`, then
  complete the specified packaged-app smoke scenarios.

### Traceability

- Acceptance criteria: AC-006-001–014
- Specification sections: 15–25

### Completion Evidence

Record commands run, results, and relevant implementation notes when complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-006-001 through AC-006-014 directly;
- run all validation required by SPEC-006 and the project Definition of Done;
- perform the required packaged-application checks;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
