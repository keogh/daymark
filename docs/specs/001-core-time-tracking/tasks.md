# SPEC-001 — Task Breakdown

## Source

- Specification: `docs/specs/001-core-time-tracking/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-13

`spec.md` is the source of truth for behavior. This breakdown assumes SPEC-000 is
verified and must be revised if the specification or foundation contracts change.

---

# Execution Rules

- Do not begin until SPEC-000 is verified.
- Complete tasks in dependency order and keep only one task `In Progress`.
- Put only the active task's immediate steps in `docs/plan.md`.
- Use an injected `Clock` in domain/application code and disposable SQLite databases
  in persistence tests.
- Record focused verification before marking a task `Complete`.
- Do not implement switching, history, search UI, manual time, tray, or analytics.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-001-001 | Define timer contracts and deterministic primitives | Complete | SPEC-000 | Supporting work for AC-001–013 |
| TASK-001-002 | Implement task persistence and normalization | Complete | TASK-001-001 | AC-001–002 |
| TASK-001-003 | Implement interval and AppState persistence | Pending | TASK-001-001 | AC-004, AC-006–008, AC-012 |
| TASK-001-004 | Implement duration projections | Pending | TASK-001-003 | AC-003, AC-005, AC-013 |
| TASK-001-005 | Reconstruct authoritative timer state | Pending | TASK-001-002–004 | AC-003, AC-005, AC-009–010, AC-013 |
| TASK-001-006 | Implement transactional Start | Pending | TASK-001-002, TASK-001-003, TASK-001-005 | AC-001–003, AC-012 |
| TASK-001-007 | Implement transactional Pause | Pending | TASK-001-005, TASK-001-006 | AC-004–005, AC-012 |
| TASK-001-008 | Implement transactional Resume | Pending | TASK-001-005, TASK-001-007 | AC-006, AC-012 |
| TASK-001-009 | Implement transactional Stop | Pending | TASK-001-005–008 | AC-007–008, AC-012 |
| TASK-001-010 | Verify the complete service workflow and recovery | Pending | TASK-001-006–009 | AC-001–010, AC-012–013 |
| TASK-001-011 | Expose the typed timer IPC API | Pending | TASK-001-005–009 | Supporting boundary for AC-001–012 |
| TASK-001-012 | Build idle loading and start UI | Pending | TASK-001-011 | AC-001–003, AC-011 |
| TASK-001-013 | Build running and paused timer UI | Pending | TASK-001-011, TASK-001-012 | AC-004–006, AC-011 |
| TASK-001-014 | Verify renderer behavior and resynchronization | Pending | TASK-001-012–0013 | AC-001, AC-004–006, AC-011 |
| TASK-001-015 | Run final acceptance and update documentation | Pending | TASK-001-010, TASK-001-011, TASK-001-014 | AC-001–013 |

---

# Tasks

## TASK-001-001 — Define Timer Contracts and Deterministic Primitives

### Status

Complete

### Outcome

Shared timer state, command result/error, runtime validation, Clock, and deterministic
test primitives exist without implementing a state transition.

### Dependencies

SPEC-000 must be verified.

### Included

- Define `TimerStatus`, `TimerState`, `StartTaskInput`, and renderer-safe result/error
  contracts without `any`.
- Add runtime validation for Start input and explicit error codes from the spec.
- Add `Clock`, `SystemClock`, and a controllable FakeClock for tests.
- Add pure normalization behavior for trimmed, case-insensitive exact matching and the
  required 500-Unicode-code-point description length policy.

### Excluded

- Persistence, TimerService commands, IPC handlers, and UI.

### Deliverables

- Shared contracts/validation, clock implementations, and focused unit tests.

### Verification

- Run focused tests for validation, normalization, FakeClock control, and safe error
  serialization.

### Traceability

- Acceptance criteria: supporting work for AC-001 through AC-013
- Specification sections: 6–10, 12–13, 15, 17, 21, 38–39, 41

### Completion Evidence

- 2026-08-13: Added the shared `TimerStatus`, `TimerState`, `StartTaskInput`,
  `TimerAPI`, `AppResult`, and closed renderer-safe error contracts.
- 2026-08-13: Added runtime Start input validation that trims descriptions,
  normalizes exact matching, counts Unicode code points, and enforces the required
  1–500 character range without truncation.
- 2026-08-13: Added `Clock`, `SystemClock`, and a deterministic `FakeClock`, with
  focused tests for time control, validation, normalization, and safe error mapping.
- 2026-08-13: Focused tests passed (3 files, 11 tests). Full `npm test` passed (12
  files, 34 tests), along with typecheck, lint, formatting, and `git diff --check`.

---

## TASK-001-002 — Implement Task Persistence and Normalization

### Status

Complete

### Outcome

Application code can insert/read tasks and find an existing task by exact normalized
description so Start can reuse it for the specified equivalent inputs.

### Dependencies

TASK-001-001.

### Included

- Implement focused Task repository insert/read/normalized-find operations required
  by Start.
- Preserve the first stored display description while matching trimmed/case-folded
  normalized descriptions.
- Use injected IDs/timestamps or other deterministic seams in tests.
- Add disposable-database repository tests.

### Excluded

- Task search UI, rename/delete operations, suggestions, and timer transitions.

### Deliverables

- Task repository/query implementation and tests.
- A migration adding a unique constraint for `normalized_description`, with
  uniqueness conflicts resolved by reading and reusing the existing task.

### Verification

- Run focused repository tests for insert/read, exact normalized lookup, and foreign
  key/cascade behavior inherited from the foundation.

### Traceability

- Acceptance criteria: AC-001, AC-002
- Specification sections: 6, 10–12, 28, 42

### Completion Evidence

- 2026-08-13: Added a typed Task domain record and focused repository operations to
  insert tasks, read by ID, and find exact normalized descriptions.
- 2026-08-13: Repository insertion preserves the first stored display description,
  performs the application-level normalized lookup, and re-reads the existing task
  after a uniqueness conflict so equivalent inputs reuse one row.
- 2026-08-13: Added a migration that safely consolidates pre-existing normalized
  duplicates while preserving interval and AppState references, then replaces the
  non-unique normalized-description index with a unique index.
- 2026-08-13: Disposable-database repository tests passed (1 file, 7 tests),
  covering deterministic insert/read, exact normalized lookup, equivalent input
  reuse, database uniqueness, and inherited task-interval cascade behavior.
- 2026-08-13: Full validation passed: typecheck, lint, formatting, all 41 tests,
  and `git diff --check`.

---

## TASK-001-003 — Implement Interval and AppState Persistence

### Status

Pending

### Outcome

Repositories expose only the interval and singleton AppState operations needed by the
timer state machine while preserving all foundation database invariants.

### Dependencies

TASK-001-001.

### Included

- Add interval create/read/open/close operations and task/session range queries.
- Add singleton AppState read/update operations.
- Provide a transaction boundary that TimerService commands can use atomically.
- Add repository tests for timestamps, references, cascade, singleton state, and one
  global open interval.

### Excluded

- Timer transition decisions, duration formatting, manual interval editing, and
  history queries.

### Deliverables

- Interval and AppState repositories/query modules plus required repository tests.

### Verification

- Run the focused repository suite against fresh disposable SQLite databases.

### Traceability

- Acceptance criteria: AC-004, AC-006, AC-007, AC-008, AC-012
- Specification sections: 6, 24–30, 42

### Completion Evidence

Pending.

---

## TASK-001-004 — Implement Duration Projections

### Status

Pending

### Outcome

Pure/query-backed projections calculate session, current-task local-today, and
lifetime active durations from closed and open intervals at an authoritative `now`.

### Dependencies

TASK-001-003.

### Included

- Sum only active interval time for a session and exclude pauses.
- Calculate local-day overlap without splitting persisted intervals.
- Calculate lifetime duration and treat an open interval's effective end as `now`.
- Cover zero data, multiple intervals, exact boundaries, paused gaps, and midnight.

### Excluded

- Mutable counters, per-second database writes, history grouping, and UI formatting.

### Deliverables

- Duration projection implementation and deterministic unit/query tests.

### Verification

- Run focused duration tests including the Aug 13/14 midnight example.

### Traceability

- Acceptance criteria: AC-003, AC-005, AC-013
- Specification sections: 23–27, 41

### Completion Evidence

Pending.

---

## TASK-001-005 — Reconstruct Authoritative Timer State

### Status

Pending

### Outcome

`getState()` validates persisted invariants and reconstructs the exact public
`TimerState` for idle, running, and paused databases without normal-read mutation.

### Dependencies

TASK-001-002, TASK-001-003, and TASK-001-004.

### Included

- Load AppState, current task, and open interval as required by status.
- Populate snapshot `now`, active interval start, and all duration projections.
- Return the specified zeroed idle state.
- Detect invalid persisted combinations explicitly and safely.
- Test running and paused reconstruction after simulated application restart.

### Excluded

- Repairing corrupt state, lifecycle mutation, renderer animation, and IPC.

### Deliverables

- Timer state query/service operation and deterministic tests.

### Verification

- Run focused idle/running/paused, invalid-state, running-restart, and paused-restart
  reconstruction tests.

### Traceability

- Acceptance criteria: AC-003, AC-005, AC-009, AC-010, AC-013
- Specification sections: 7, 22–27, 31–32, 41

### Completion Evidence

Pending.

---

## TASK-001-006 — Implement Transactional Start

### Status

Pending

### Outcome

Starting from idle validates the description, reuses or creates a task, opens one
interval, updates AppState, and returns authoritative running state in one transaction.

### Dependencies

TASK-001-002, TASK-001-003, and TASK-001-005.

### Included

- Implement Start with one Clock snapshot and atomic persistence.
- Return `INVALID_TASK_DESCRIPTION` for invalid input and `TIMER_NOT_IDLE` when
  running or paused.
- Test task creation/reuse, open interval data, AppState, duration, rollback, and no
  duplicate normalized task.

### Excluded

- Task switching and existing-task search UI.

### Deliverables

- Start service operation and focused TimerService tests.

### Verification

- Run focused Start tests for new/reused/invalid/not-idle/rollback cases.

### Traceability

- Acceptance criteria: AC-001, AC-002, AC-003, AC-012
- Specification sections: 9–13, 29–30, 41

### Completion Evidence

Pending.

---

## TASK-001-007 — Implement Transactional Pause

### Status

Pending

### Outcome

Pausing a running timer closes its open interval and preserves task/session identity
atomically; idle and already-paused calls return the specified errors.

### Dependencies

TASK-001-005 and TASK-001-006.

### Included

- Implement Pause with one Clock snapshot and a transaction.
- Preserve `currentTaskId` and `sessionStartedAt`.
- Return `NO_ACTIVE_TIMER` and `TIMER_ALREADY_PAUSED` in invalid states.
- Test closed interval, zero open intervals, excluded paused time, and rollback.

### Excluded

- Stop-paused behavior and renderer controls.

### Deliverables

- Pause service operation and focused tests.

### Verification

- Run focused Pause tests for success, both invalid states, duration, and rollback.

### Traceability

- Acceptance criteria: AC-004, AC-005, AC-012
- Specification sections: 14–15, 23–24, 30, 41

### Completion Evidence

Pending.

---

## TASK-001-008 — Implement Transactional Resume

### Status

Pending

### Outcome

Resuming a paused timer creates exactly one new open interval for the current task,
preserves the session start, and returns authoritative running state atomically.

### Dependencies

TASK-001-005 and TASK-001-007.

### Included

- Implement Resume with one Clock snapshot and a transaction.
- Return `NO_CURRENT_TASK` when idle and `TIMER_ALREADY_RUNNING` when running.
- Test two-interval duration, one open interval, preserved session, and rollback.

### Excluded

- Starting a different task and renderer controls.

### Deliverables

- Resume service operation and focused tests.

### Verification

- Run focused Resume tests for success, both invalid states, duration, and rollback.

### Traceability

- Acceptance criteria: AC-006, AC-012
- Specification sections: 16–17, 23–24, 29–30, 41

### Completion Evidence

Pending.

---

## TASK-001-009 — Implement Transactional Stop

### Status

Pending

### Outcome

Stop closes a running interval or clears a paused session, returns the zeroed idle
state, and is mutation-free/idempotent when already idle.

### Dependencies

TASK-001-005, TASK-001-006, TASK-001-007, and TASK-001-008.

### Included

- Implement running, paused, and idle Stop paths.
- Clear current task and session start atomically where required.
- Test final lifetime persistence, no interval creation while paused, idle idempotency,
  and rollback.

### Excluded

- Deleting tasks/intervals and displaying prior-task totals after idle.

### Deliverables

- Stop service operation and focused tests.

### Verification

- Run focused Stop tests for running, paused, idle, totals, and rollback.

### Traceability

- Acceptance criteria: AC-007, AC-008, AC-012
- Specification sections: 18–21, 26, 30, 41

### Completion Evidence

Pending.

---

## TASK-001-010 — Verify the Complete Service Workflow and Recovery

### Status

Pending

### Outcome

Real TimerService and repositories over disposable SQLite pass the required complete
workflow, invariant, restart, and midnight integration scenarios with FakeClock.

### Dependencies

TASK-001-006, TASK-001-007, TASK-001-008, and TASK-001-009.

### Included

- Implement the required 09:00–10:20 Start/Pause/Resume/Stop integration scenario.
- Verify transaction outcomes, two exact intervals, 65-minute total, and final idle.
- Cover running and paused application reconstruction, database open-interval defense,
  invalid transitions, and cross-midnight projections at integration level where
  unit/repository coverage is insufficient.

### Excluded

- IPC and renderer testing.

### Deliverables

- Service/SQLite integration suite with deterministic fixtures.

### Verification

- Run the focused integration suite repeatedly from clean temporary databases.

### Traceability

- Acceptance criteria: AC-001 through AC-010, AC-012, AC-013
- Specification sections: 29–32, 40–43

### Completion Evidence

Pending.

---

## TASK-001-011 — Expose the Typed Timer IPC API

### Status

Pending

### Outcome

The renderer receives a narrow, fully typed `window.timeTracker.timer` API for
getState/start/pause/resume/stop, with runtime input validation and safe errors.

### Dependencies

TASK-001-005, TASK-001-006, TASK-001-007, TASK-001-008, and TASK-001-009.

### Included

- Register explicit thin IPC handlers for all five operations.
- Validate Start input at the process boundary and map expected/internal failures to
  renderer-safe results.
- Extend preload and global renderer types without exposing generic invoke/send or raw
  `ipcRenderer`.
- Add focused handler/contract tests.

### Excluded

- UI behavior and non-timer APIs.

### Deliverables

- Shared channels/contracts, IPC handlers, preload methods, and boundary tests.

### Verification

- Run focused IPC/preload tests for successful operations, invalid input, expected
  errors, and sanitized unexpected errors.

### Traceability

- Acceptance criteria: supporting boundary for AC-001 through AC-012
- Specification sections: 9, 14, 16, 18, 22, 38–39

### Completion Evidence

Pending.

---

## TASK-001-012 — Build Idle Loading and Start UI

### Status

Pending

### Outcome

On mount/reload the renderer requests authoritative state; idle users can enter a
description and start by button or Enter, with accessible loading and error feedback.

### Dependencies

TASK-001-011.

### Included

- Replace the foundation health screen with the timer application shell.
- Load state through `timer.getState()` and render the idle form.
- Wire button and Enter submission, pending state, validation/application errors, and
  keyboard/focus behavior.
- Restore running/paused snapshots into the appropriate presentation branch without
  resetting persistence.

### Excluded

- Suggestions/search, task switching, and the live running/paused presentation details.

### Deliverables

- Timer application state hook/controller and accessible idle/start UI.

### Verification

- Run focused component tests for loading, idle input, button/Enter Start, error state,
  and initial state restoration.

### Traceability

- Acceptance criteria: AC-001, AC-002, AC-003, AC-011
- Specification sections: 33, 37–39, 44

### Completion Evidence

Pending.

---

## TASK-001-013 — Build Running and Paused Timer UI

### Status

Pending

### Outcome

Running and paused views show task, session/today/lifetime durations, correct controls,
and a local display clock that advances only while running from authoritative snapshots.

### Dependencies

TASK-001-011 and TASK-001-012.

### Included

- Render running and paused states with semantic Pause/Resume/Stop controls.
- Format required durations and status text accessibly.
- Animate from `sessionDurationMs` plus elapsed time since snapshot only while running.
- Periodically resynchronize without per-second database writes or excessive IPC.
- Replace local snapshots with each command's authoritative result.

### Excluded

- History, task switching, tray, and background timer persistence.

### Deliverables

- Running/paused components, display-time hook, control wiring, and resynchronization.

### Verification

- Use fake timers in focused component/hook tests to prove running advances, paused
  remains fixed, and controls apply authoritative responses.

### Traceability

- Acceptance criteria: AC-004, AC-005, AC-006, AC-011
- Specification sections: 34–36, 38, 44

### Completion Evidence

Pending.

---

## TASK-001-014 — Verify Renderer Behavior and Resynchronization

### Status

Pending

### Outcome

The complete renderer component suite proves every required idle/running/paused
interaction, visual timing rule, and reload restoration path through the typed API.

### Dependencies

TASK-001-012 and TASK-001-013.

### Included

- Cover all UI tests listed in specification section 44.
- Verify command errors retain a usable state and controls/labels remain accessible.
- Verify reload/getState restoration and authoritative resynchronization correct local
  display drift.
- Confirm renderer source has no Node, SQLite, or raw IPC access.

### Excluded

- Full cross-platform end-to-end automation and later feature UI.

### Deliverables

- Complete SPEC-001 renderer test suite and boundary verification.

### Verification

- Run the focused renderer suite with fake timers and mocked typed preload API.

### Traceability

- Acceptance criteria: AC-001, AC-004, AC-005, AC-006, AC-011
- Specification sections: 33–39, 44–45

### Completion Evidence

Pending.

---

## TASK-001-015 — Run Final Acceptance and Update Documentation

### Status

Pending

### Outcome

Every SPEC-001 acceptance criterion and Definition of Done item has recorded evidence,
the complete validation suite passes, and documentation/status accurately describe the
implemented core timer.

### Dependencies

TASK-001-010, TASK-001-011, and TASK-001-014.

### Included

- Run the full unit, repository, integration, and renderer suites plus typecheck/lint.
- Manually exercise Start/Pause/Resume/Stop, renderer reload, and complete application
  restart while running and paused.
- Review all architecture, persistence, transaction, clock, and no-later-scope rules.
- Update decisions/architecture/domain docs only if implementation changed them.
- Update `docs/progress.md` and specification/task statuses when conditions hold.

### Excluded

- Features assigned to SPEC-002 and later.

### Deliverables

- Final automated/manual evidence and accurate documentation/status updates.

### Verification

- Run `npm run typecheck`, `npm run lint`, and `npm test`, followed by the required
  manual restart/reload workflow checks.

### Traceability

- Acceptance criteria: AC-001 through AC-013
- Specification sections: 40–46 and `docs/sdd/definition-of-done.md`

### Completion Evidence

Pending.

---

# Final Specification Verification

TASK-001-015 owns final cross-task verification. SPEC-001 may move to `Verified` only
after SPEC-000 is verified, every task above is complete, and all acceptance criteria,
required tests, architecture checks, and Definition of Done items pass.
