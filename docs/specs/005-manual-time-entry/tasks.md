# SPEC-005 — Task Breakdown

## Source

- Specification: `docs/specs/005-manual-time-entry/spec.md`
- Specification status: Draft
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
- Reuse SPEC-001 timer/task contracts, SPEC-002 history refresh behavior,
  SPEC-003 task-reuse semantics, and SPEC-004 state-refresh patterns where their
  semantics match.
- Do not add interval editing/deletion, assisted overlap resolution, duration-only
  input modes, tray entry points, analytics behavior, or new timer states.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-005-001 | Define manual-entry contracts and validation | Complete | None | AC-005-009 |
| TASK-005-002 | Implement transactional manual interval creation | Pending | TASK-005-001 | AC-005-003–008 |
| TASK-005-003 | Expose the validated manual-entry boundary | Pending | TASK-005-002 | AC-005-009 |
| TASK-005-004 | Add accessible manual-entry UI and refresh flows | Pending | TASK-005-003 | AC-005-001, AC-005-002, AC-005-010–012 |
| TASK-005-005 | Verify Manual Time Entry and update documentation | Pending | TASK-005-004 | AC-005-001–012 |

---

# Tasks

## TASK-005-001 — Define Manual-Entry Contracts and Validation

### Status

Complete

### Outcome

Shared types and runtime validators define the manual-entry command, task-source
rules, and controlled error typing without changing persistence behavior yet.

### Dependencies

None.

### Included

- Define `CreateManualIntervalInput` and shared preload/main contracts.
- Add exact-shape runtime validation for task-source exclusivity, trimmed string
  requirements, date/time field presence, and unknown-property rejection.
- Introduce or extend controlled error-code typing for
  `INVALID_MANUAL_INTERVAL`.
- Add focused unit and boundary tests under mirrored `test/` paths.

### Excluded

- Interval creation logic, IPC registration, and renderer UI changes.

### Deliverables

- Shared contracts, validation modules, error mappings, and focused tests.

### Verification

- Run focused contract and boundary tests, `npm run typecheck`, and `npm run
  lint`.

### Traceability

- Acceptance criteria: AC-005-009
- Specification sections: 9, 10, 12, 13, 14, 15, 16, 18

### Completion Evidence

- Implemented shared manual-entry boundary definitions in
  `src/shared/contracts/manual-time.ts`, including the explicit
  `manual-time:create-interval` channel, `CreateManualIntervalInput`, and
  `ManualIntervalCreateResult`.
- Added `validateCreateManualIntervalInput` in
  `src/shared/validation/manual-time-input.ts` with allowed-key enforcement,
  task-source exclusivity, trimmed string handling, local date/time validation,
  and same-day end-after-start checks.
- Extended shared error typing with `INVALID_MANUAL_INTERVAL` and
  `TIME_INTERVAL_OVERLAP`, and added the typed `manualTime` surface to the
  shared preload API contract.
- Added focused tests in `test/shared/contracts/manual-time.test.ts`,
  `test/shared/validation/manual-time-input.test.ts`, `test/preload/index.test.ts`,
  and `test/shared/contracts/app-result.test.ts`.
- Verification commands run on 2026-08-15:
  - `npm test -- manual-time` ✅
  - `npm run typecheck` ✅
  - `npm run lint` ✅

---

## TASK-005-002 — Implement Transactional Manual Interval Creation

### Status

Pending

### Outcome

Application services and disposable SQLite repositories support atomic manual
interval creation with task reuse/creation, local-date conversion, overlap
rejection, and unchanged timer state.

### Dependencies

TASK-005-001.

### Included

- Add the manual-entry service operation and transaction flow.
- Resolve explicit task IDs inside the transaction.
- Reuse normalized typed-description matching and create Tasks atomically when
  needed.
- Convert renderer-provided local date/time input into persisted UTC epoch
  milliseconds.
- Reject end-before-start and same-time ranges.
- Reject overlap against closed intervals and the current open interval.
- Preserve `AppState` on successful manual creation.
- Add deterministic unit, repository, and integration tests with disposable
  SQLite databases.

### Excluded

- IPC wiring and renderer controls.
- Editing or deleting intervals.
- Assisted overlap resolution or cross-midnight inference.

### Deliverables

- Service changes, repository/query helpers if needed, composition updates, and
  focused tests.

### Verification

- Run focused service and SQLite integration tests, relevant core timer/history
  regressions, `npm run typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-005-003–008
- Specification sections: 7–9, 13–18

### Completion Evidence

Record commands run, results, and any relevant implementation notes when
complete.

---

## TASK-005-003 — Expose the Validated Manual-Entry Boundary

### Status

Pending

### Outcome

The preload and IPC layers expose one narrow validated manual-entry operation
without widening renderer privileges.

### Dependencies

TASK-005-002.

### Included

- Register the explicit `manual-time:create-interval` IPC handler.
- Expose `window.timeTracker.manualTime.createInterval(...)` through preload.
- Validate manual-entry input in the main-process boundary before service
  execution.
- Map expected failures to controlled `AppResult` values and log unexpected
  failures safely.
- Add focused preload and IPC tests.

### Excluded

- Renderer interaction design and manual-entry surface implementation.

### Deliverables

- IPC handler, preload API additions, composition wiring, and focused tests.

### Verification

- Run focused preload and IPC tests, boundary regressions, `npm run typecheck`,
  and `npm run lint`.

### Traceability

- Acceptance criteria: AC-005-009
- Specification sections: 10, 12, 13, 16, 18

### Completion Evidence

Record commands run, results, and any relevant implementation notes when
complete.

---

## TASK-005-004 — Add Accessible Manual-Entry UI and Refresh Flows

### Status

Pending

### Outcome

The Timer view and Daily History expose accessible manual-entry flows with both
entry points, prefilled day behavior, pending handling, success refresh, and
controlled failure presentation.

### Dependencies

TASK-005-003.

### Included

- Add the global `Add time` action near the timer area.
- Add day-level `Add time` actions in Daily History.
- Build the focused manual-entry surface with task, date, start-time, and
  end-time fields plus save/cancel controls.
- Support existing-task selection and typed task-description entry.
- Prefill the selected history day and default the global action to the local
  current day.
- Prevent duplicate submissions while pending.
- Keep entered values on controlled errors.
- Trigger authoritative history and timer refresh after successful save.
- Add focused renderer tests for both entry points, labeling, keyboard use,
  pending, success, and error behavior.

### Excluded

- Editing/deleting existing intervals.
- Separate interval detail pages or analytics-specific entry flows.

### Deliverables

- Renderer components/hooks/state wiring and focused UI tests.

### Verification

- Run focused renderer tests, affected app interaction tests, `npm run
  typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-005-001, AC-005-002, AC-005-010–012
- Specification sections: 11, 13–18

### Completion Evidence

Record commands run, results, and any relevant implementation notes when
complete.

---

## TASK-005-005 — Verify Manual Time Entry and Update Documentation

### Status

Pending

### Outcome

Manual Time Entry is validated against all acceptance criteria, required checks,
and documentation updates, and the specification is ready to move beyond Draft
once implemented and verified.

### Dependencies

TASK-005-004.

### Included

- Verify each acceptance criterion directly.
- Run the required project validation and any focused packaged/manual checks
  needed by the implemented UI flow.
- Update `docs/progress.md`, `docs/plan.md`, and spec/task statuses as required
  by the workflow.
- Document any accepted deviations or decision updates if implementation changes
  behavior.

### Excluded

- New product scope beyond the approved manual-entry specification.

### Deliverables

- Completed verification evidence, updated documentation, and final status
  changes when appropriate.

### Verification

- Run `npm run typecheck`, `npm run lint`, `npm test`, and any additional
  validation required by the implementation and Definition of Done.

### Traceability

- Acceptance criteria: AC-005-001–012
- Specification sections: 15–18

### Completion Evidence

Record commands run, results, and any relevant implementation notes when
complete.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify every acceptance criterion directly;
- run all validation required by the specification and Definition of Done;
- perform required manual and packaged-application checks;
- update documentation and `docs/progress.md`;
- change specification and task statuses only when their stated conditions hold.
