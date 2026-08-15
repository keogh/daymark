# SPEC-004 — Task Breakdown

## Source

- Specification: `docs/specs/004-one-click-task-switching/spec.md`
- Specification status: Verified
- Last reviewed against specification: 2026-08-15

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

---

# Execution Rules

- Complete tasks in dependency order and keep only one task `In Progress`.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record focused verification evidence before marking a task `Complete`.
- Reuse SPEC-001 timer-state contracts, SPEC-002 history refresh behavior, and
  SPEC-003 stable task-ID start semantics where their semantics match.
- Do not add task management, manual interval editing, tray switching, analytics,
  settings, or new timer states.
- Task completion does not replace final acceptance and Definition of Done checks.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-004-001 | Define switch command contracts and validation | Complete | None | AC-004-007 |
| TASK-004-002 | Implement atomic timer switch branches | Complete | TASK-004-001 | AC-004-001–006 |
| TASK-004-003 | Expose the validated switch boundary | Complete | TASK-004-002 | AC-004-001–007 |
| TASK-004-004 | Add accessible history-row Play controls | Complete | TASK-004-003 | AC-004-001, AC-004-004–010 |
| TASK-004-005 | Verify One-Click Task Switching and update documentation | Complete | TASK-004-004 | AC-004-001–010 |

---

# Tasks

## TASK-004-001 — Define Switch Command Contracts and Validation

### Status

Complete

### Outcome

Shared types and runtime validators define the history Play input and controlled
feature-specific error handling without changing timer behavior yet.

### Dependencies

None.

### Included

- Define `SwitchToTaskInput` and preload/main shared contracts.
- Add exact-shape runtime validation for non-null object input, `taskId` string
  requirements, and unknown-property rejection.
- Introduce or extend controlled error-code typing for `INVALID_SWITCH_TASK`.
- Add focused unit and boundary tests under mirrored `test/` paths.

### Excluded

- Timer transition logic, IPC registration, and renderer controls.

### Deliverables

- Shared contracts, validation modules, error mappings, and focused tests.

### Verification

- Run focused contract and boundary tests, `npm run typecheck`, and `npm run
  lint`.

### Traceability

- Acceptance criteria: AC-004-007
- Specification sections: 7, 12, 14, 15, 23

### Completion Evidence

- Added `SwitchToTaskInput`, `TIMER_SWITCH_TO_TASK_CHANNEL`,
  `INVALID_SWITCH_TASK`, and shared exact-shape runtime validation without
  changing timer behavior or registering IPC.
- Added focused tests for malformed switch input and renderer-safe error typing.
- Verification completed on 2026-08-15:
  - `npm test -- switch-to-task app-result task-description` — passed
  - `npm run typecheck` — passed
  - `npm run lint` — passed

---

## TASK-004-002 — Implement Atomic Timer Switch Branches

### Status

Complete

### Outcome

Application services and disposable SQLite repositories support atomic idle start,
running switch, paused switch, same-task no-op, and same-task resume behavior by
stable task ID.

### Dependencies

TASK-004-001.

### Included

- Extend TimerService with the switch operation and branch semantics.
- Resolve task IDs inside the transaction.
- Preserve session continuity for running different-task switches.
- Reset `sessionStartedAt` for paused different-task switches.
- Reuse resume semantics for paused same-task activation.
- Return `TASK_NOT_FOUND` without persistence mutation for stale IDs.
- Add deterministic unit, repository, and integration tests with disposable SQLite
  databases.

### Excluded

- IPC wiring and renderer UI changes.
- Any schema change unless the specification and breakdown are updated first.

### Deliverables

- Timer service changes, repository helpers if needed, composition updates, and
  focused tests.

### Verification

- Run focused timer service and SQLite integration tests, relevant core timer
  regressions, `npm run typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-004-001–006
- Specification sections: 8–11, 16, 17, 19, 20, 24

### Completion Evidence

- Added `TimerService.switchToTask(...)` with validated stable-task-ID handling
  for idle start, running different-task switch, paused different-task switch,
  running same-task no-op, paused same-task resume, and controlled
  `TASK_NOT_FOUND` outcomes.
- Added focused service tests for branch behavior, rollback on transactional
  failures, malformed input rejection, and invalid persisted-state mapping to
  `INTERNAL_ERROR`.
- Added disposable SQLite integration coverage proving persisted interval and
  `sessionStartedAt` behavior for running switch, paused switch, same-task no-op,
  same-task resume, and stale-task failures.
- Verification completed on 2026-08-15:
  - `npm test -- timer-service` — passed
  - `npm run typecheck` — passed
  - `npm run lint` — passed

---

## TASK-004-003 — Expose the Validated Switch Boundary

### Status

Complete

### Outcome

The preload and IPC layers expose one narrow validated history Play operation
without widening renderer privileges.

### Dependencies

TASK-004-002.

### Included

- Register the explicit `timer:switch-to-task` IPC handler.
- Expose `window.timeTracker.timer.switchToTask(...)` through preload.
- Validate switch input in the main-process boundary before service execution.
- Map expected failures to controlled `AppResult` values and log unexpected
  failures safely.
- Add focused preload and IPC tests.

### Excluded

- Renderer interaction design and history-row visual changes.

### Deliverables

- IPC handler, preload API additions, composition wiring, and focused tests.

### Verification

- Run focused preload and IPC tests, timer boundary regressions, `npm run
  typecheck`, and `npm run lint`.

### Traceability

- Acceptance criteria: AC-004-001–007
- Specification sections: 11–15, 23

### Completion Evidence

- Added `window.timeTracker.timer.switchToTask(...)` to the shared timer/preload
  boundary and routed it over the explicit `timer:switch-to-task` channel.
- Registered validated timer-switch IPC handling that rejects malformed input
  before service execution and preserves existing renderer-safe expected and
  unexpected error mapping.
- Added focused preload and timer IPC tests covering the exposed method,
  explicit channel registration, successful delegation, and malformed-input
  rejection without calling the service.
- Verification completed on 2026-08-15:
  - `npm test -- preload/index.test.ts main/ipc/timer.test.ts renderer/app/App.test.tsx` — passed
  - `npm run typecheck` — passed
  - `npm run lint` — passed

---

## TASK-004-004 — Add Accessible History-Row Play Controls

### Status

Complete

### Outcome

Daily History exposes accessible, state-aware row actions that start, resume, or
switch tasks with correct pending, success, and controlled failure behavior.

### Dependencies

TASK-004-003.

### Included

- Render task-row Play/Resume/Already-running controls in collapsed and expanded
  history presentations.
- Wire pointer and keyboard activation to the new timer switch API.
- Prevent duplicate row activation while pending.
- Preserve usable timer controls and show compact non-blocking `TASK_NOT_FOUND`
  feedback.
- Trigger authoritative history refresh after successful switch and stale-task
  failure.
- Add focused renderer tests for labeling, focus, keyboard activation, pending,
  success, and error behavior.

### Excluded

- Suggestion-list switching while active.
- Interval-row actions, tray behavior, analytics, or settings UI.

### Deliverables

- Renderer components/hooks, state wiring, and focused UI tests.

### Verification

- Run focused history/timer renderer tests, `npm run typecheck`, and `npm run
  lint`.

### Traceability

- Acceptance criteria: AC-004-001, AC-004-004–010
- Specification sections: 13, 16, 17, 21, 25

### Completion Evidence

- Added state-aware Daily History row actions that expose `Play`, `Resume`,
  pending, and disabled `Already running` labels from the authoritative timer
  snapshot without disabling unrelated Pause/Resume/Stop controls.
- Wired row activation through the existing `switchToTask(...)` timer boundary,
  with row-scoped duplicate-submission prevention and compact non-blocking
  `TASK_NOT_FOUND` history feedback while still triggering authoritative history
  refresh after success and stale-task failures.
- Added focused renderer coverage for history-row labels, pending state,
  stale-task messaging, and App-level refresh wiring for history-triggered task
  switching.
- Verification completed on 2026-08-15:
  - `npm test -- renderer/app/App.test.tsx renderer/app/DailyHistory.test.tsx` — passed
  - `npm run typecheck` — passed
  - `npm run lint` — passed

---

## TASK-004-005 — Verify One-Click Task Switching and Update Documentation

### Status

Complete

### Outcome

SPEC-004 is verified end to end, supporting documentation reflects the completed
behavior, and project-level validation demonstrates no regression against earlier
specifications.

### Dependencies

TASK-004-004.

### Included

- Verify every SPEC-004 acceptance criterion directly.
- Run full required project validation and packaging if required by the
  implementation surface.
- Perform required manual acceptance for idle start, running switch, paused
  switch, same-task paused resume, same-task running state, and stale-task
  handling.
- Update `docs/progress.md` and any affected product or architecture docs if
  implementation refined documented behavior.
- Record completion evidence and set final statuses when Definition of Done is
  satisfied.

### Excluded

- New product behavior beyond SPEC-004.

### Deliverables

- Verified specification/task statuses, updated progress documentation, and final
  validation evidence.

### Verification

- Run `npm run typecheck`, `npm run lint`, `npm test`, and `npm run package` if
  the completed implementation touches packaging-relevant behavior or the spec's
  final verification requires it.

### Traceability

- Acceptance criteria: AC-004-001–010
- Specification sections: 17–25

### Completion Evidence

- Final acceptance matrix:

  | Acceptance criteria | Evidence | Result |
  | --- | --- | --- |
  | AC-004-001, AC-004-002, AC-004-003, AC-004-005, AC-004-009 | Timer service unit/integration coverage and renderer/App tests verify idle history start, running different-task switch, paused different-task switch, paused same-task resume, and authoritative timer/history refresh wiring. The isolated packaged macOS arm64 acceptance run repeated idle Play, running switch, paused switch, paused same-task resume, and confirmed the timer returned to the correct running or idle view after each flow. | Passed |
  | AC-004-004, AC-004-008, AC-004-010 | Renderer tests cover state-aware `Play`/`Resume`/`Already running` labels, keyboard-reachable controls, disabled same-task running state, and duplicate row-activation prevention. The isolated packaged acceptance run confirmed the same-task running row exposed a disabled `Already running` control while the timer stayed in the running presentation. | Passed |
  | AC-004-006 | Timer service unit/integration coverage proves `TASK_NOT_FOUND` leaves AppState and intervals unchanged. Renderer tests verify the compact non-blocking history-area message and preserved controls. The isolated packaged acceptance run deleted a stale task from the disposable SQLite profile, triggered history-row Play, observed `The selected task no longer exists.`, and confirmed the final timer state remained idle on August 15, 2026. | Passed |
  | AC-004-007 | Shared validation, IPC, preload, and service tests reject malformed exact-shape switch input as `INVALID_SWITCH_TASK` before service mutation. | Passed |

- `npm run typecheck` — passed on 2026-08-15.
- `npm run lint` — passed on 2026-08-15.
- `npm test` — passed on 2026-08-15, 267 tests in 38 files.
- `npm run package` — passed on 2026-08-15 for macOS arm64. Electron Forge emitted only its existing Vite `inlineDynamicImports` deprecation warning.
- 2026-08-15: Launched the packaged macOS arm64 app with isolated user data via `--user-data-dir=/tmp/timetracker-spec004-user-data` and exercised SPEC-004 history-row flows over Electron CDP. Idle Play, running different-task switch, paused different-task switch, paused same-task resume, running same-task disabled state, and stale-task inline feedback all passed.
- 2026-08-15: The isolated packaged acceptance mutated only `/tmp/timetracker-spec004-user-data/time-tracker.sqlite` to create the stale-task condition, leaving the real application profile untouched.
- No schema, migration, architectural decision, or additional product-documentation changes were required beyond verification status and progress updates.
- Deviations: none.
