# SPEC-004 — One-Click Task Switching

## Status

Verified

## Milestone

M3 — Task Reuse and Switching

## Priority

P0

---

# 1. Objective

Let the user start or switch to an already tracked task directly from Daily
History with one action, while preserving the product's timestamp-based source of
truth and atomic timer transitions.

---

# 2. User Story

As an individual user,

I want to click Play on a task in history and immediately begin tracking it,

so that restarting or switching work requires one action instead of retyping or
returning to the idle input.

---

# 3. Background

SPEC-001 established persistent Tasks, authoritative timer state, and atomic
Start, Pause, Resume, and Stop behavior. SPEC-002 established Daily History as an
authoritative local-calendar projection and deliberately excluded history-row Play
actions. SPEC-003 added idle-only task reuse and explicitly deferred active-task
switching to this specification.

The product context and UX require normal switching to be one action with no
confirmation dialog. This specification defines that behavior only for history
task rows on the main Timer view.

---

# 4. Scope

This specification includes:

- a Play action on history task rows;
- starting a history task by stable task ID while idle;
- switching from a running task to a different history task;
- switching from a paused task to a different history task;
- state-aware handling when the selected history task is already the active task;
- atomic persistence and authoritative timer-state refresh;
- authoritative history refresh after success and after controlled missing-task
  failures;
- typed contracts across renderer, preload, IPC, and main process;
- runtime validation of the history Play input;
- repository, service, integration, boundary, and renderer tests.

---

# 5. Out of Scope

This specification does not implement:

- task switching from the idle suggestion list while active;
- Play actions on individual interval rows;
- task renaming or deletion;
- manual time entry;
- editing or deleting intervals;
- tray-based switching behavior;
- global shortcuts;
- confirmation dialogs for normal switching;
- persisted Play-button state outside the current renderer session;
- new timer states beyond `idle`, `running`, and `paused`.

These behaviors belong to later specifications unless explicitly added by a future
decision.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-003 — Task Search and Reuse, status Verified.

The existing Task and TimeInterval schema, timer transaction model, Clock
abstraction, typed preload boundary, AppResult contract, history projection
behavior, and explicit existing-task Start input are reused.

---

# 7. Switch Command Model

This specification reuses stable task IDs. Conceptual renderer-facing input:

```ts
interface SwitchToTaskInput {
  readonly taskId: string;
}
```

The public timer state returned after success remains the existing authoritative
`TimerState` contract from SPEC-001.

The history task Play action always targets a Task, never an interval. The Task is
resolved again inside the main-process transaction at execution time.

---

# 8. Timer Transition Semantics

The history Play action behaves as follows.

## Idle

Selecting Play while idle starts the chosen task by stable ID. This is equivalent
to the SPEC-003 explicit existing-task Start flow, reached from a different UI
entry point.

## Running, Different Task

Selecting Play for a different task while running performs one atomic transition:

1. obtain one authoritative `now` from the injected Clock;
2. close the current open interval at `now`;
3. set the selected task as current;
4. create one new open interval for the selected task with `startedAt = now`;
5. preserve the current tracking session as continuous across the switch by
   keeping `sessionStartedAt` unchanged;
6. keep timer status `running`;
7. commit once;
8. return the authoritative `TimerState`.

This must not expose a persisted intermediate idle state.

## Paused, Different Task

Selecting Play for a different task while paused performs one atomic transition:

1. obtain one authoritative `now`;
2. clear the paused task as current;
3. set the selected task as current;
4. create one new open interval for the selected task with `startedAt = now`;
5. set `sessionStartedAt = now` because the prior paused session ends when
   switching tasks;
6. set timer status `running`;
7. commit once;
8. return the authoritative `TimerState`.

There is no interval to close for the previously paused task.

## Running, Same Task

Selecting Play for the task already running is a successful no-op:

- no interval is closed or created;
- no AppState field changes;
- the existing authoritative running `TimerState` is returned.

## Paused, Same Task

Selecting Play for the task already paused resumes that task:

- behavior is equivalent to the existing Resume transition;
- a new open interval is created at authoritative `now`;
- `currentTaskId` and `sessionStartedAt` are preserved;
- timer status becomes `running`.

The operation may share implementation with Resume as long as the public behavior
matches this specification.

---

# 9. Session Semantics

A tracking session is the UI span between Start and Stop for one current task. This
specification refines session continuity for switching:

- switching from `running` to a different task keeps one continuous session and
  preserves `sessionStartedAt`;
- switching from `paused` to a different task ends the prior paused session and
  starts a new running session at the switch time;
- starting from `idle` starts a new session at the switch time;
- resuming the same paused task preserves the original session;
- playing the same running task preserves the original session without mutation.

This preserves the existing meaning of `sessionDurationMs` as the elapsed time
since `sessionStartedAt` for the currently loaded task session.

---

# 10. Data Model Changes

No database schema changes are required.

Do not add:

- a separate switch-events table;
- mutable task-duration counters;
- mutable session entities;
- cached history projections.

Existing invariants remain mandatory:

- only one interval may be open globally;
- interval end must be later than start;
- task references must be valid;
- timer state transitions must be atomic.

---

# 11. Application Service Behavior

Extend the timer application service with an operation conceptually equivalent to:

```ts
TimerService.switchToTask(input: SwitchToTaskInput): AppResult<TimerState>
```

The operation must:

1. validate the full input before persistence work;
2. read the current authoritative timer state inside the transaction;
3. resolve the selected task ID inside the transaction;
4. branch by current timer status and same-task versus different-task semantics;
5. obtain only the authoritative Clock snapshots required by the chosen branch;
6. commit exactly one atomic transition or return a controlled error without
   mutation;
7. return the same authoritative `TimerState` shape used elsewhere.

Missing tasks must produce `TASK_NOT_FOUND` with no interval or AppState mutation.

If the current persisted state is invalid for the requested transition, return a
controlled generic failure and log the invariant violation locally.

This specification may internally reuse the existing explicit existing-task Start
and Resume operations where semantics fully match, but the public boundary remains
an explicit history Play/switch capability.

---

# 12. IPC Contract

Expose one narrow timer-switch API through preload:

```ts
interface TimerAPI {
  switchToTask(
    input: SwitchToTaskInput,
  ): Promise<AppResult<TimerState>>;
}
```

Conceptual IPC channel:

```text
timer:switch-to-task
```

Do not expose raw `ipcRenderer`, generic invoke/send helpers, database objects, or
history query primitives.

The main-process boundary must runtime-validate `SwitchToTaskInput` before
application or persistence logic executes.

---

# 13. Renderer Behavior

Daily History task rows gain a keyboard-reachable Play action.

The control must be available:

- on collapsed task rows;
- on expanded task rows for the same visible task entry;
- while the timer is idle, running, or paused.

The action is not hover-only. It must remain visible or otherwise clearly
discoverable on keyboard focus.

Interaction behavior:

- activating Play while idle starts that task by ID;
- activating Play on a different task while running switches immediately without a
  confirmation dialog;
- activating Play on a different task while paused switches immediately and starts
  the new task running;
- activating Play on the same paused task resumes it;
- the same running task exposes a disabled, state-aware control instead of an
  active Play button.

State-aware labeling must be understandable without relying only on iconography.
Acceptable examples:

```text
Play
Resume
Already running
```

The exact visible copy may be refined during implementation if the semantics stay
clear and accessible.

Pending behavior:

- only one switch/start action from a given rendered history row may be pending at
  a time;
- duplicate submissions from repeated clicks or key presses are prevented;
- while a switch is pending, the activated row exposes a pending state and the
  action cannot be triggered again;
- pending state must not disable unrelated timer controls unless the existing
  renderer timer flow already requires it.

On success:

- the authoritative running timer view replaces any idle or paused presentation as
  appropriate;
- history refreshes through an authoritative snapshot so the new running interval
  appears with correct day and lifetime totals;
- the UI does not require the user to re-focus the history section manually.

On `TASK_NOT_FOUND`:

- keep the current timer state unchanged;
- show a compact non-blocking message associated with the affected history area;
- refresh history so the stale task row can disappear or update on the next
  authoritative render;
- do not show a destructive modal.

The specification does not require optimistic history mutation in the renderer.

---

# 14. Validation

`SwitchToTaskInput` must be a non-null object with exactly one property:

```text
taskId = non-empty string
```

Validation rules:

- `taskId` must be a string;
- after trimming, `taskId` must not be empty;
- unknown properties are rejected;
- malformed input must not read or mutate persistence state.

Invalid switch input returns:

```text
INVALID_SWITCH_TASK
```

The existing Start validation and explicit existing-task Start validation remain
unchanged for their respective boundaries.

---

# 15. Error Behavior

Expected controlled error codes for this feature:

- `INVALID_SWITCH_TASK` — malformed history Play input;
- `TASK_NOT_FOUND` — the selected task no longer exists;
- `INTERNAL_ERROR` — unexpected failure or invalid persisted state safely mapped at
  the boundary.

This specification does not use `TIMER_NOT_IDLE` for the history Play action,
because switching while active is now valid for this entry point.

Unexpected persistence, transaction, or invariant failures must be logged locally
without exposing stack traces or user-created task descriptions through IPC.

---

# 16. Edge Cases

- A task may appear in multiple history days. Playing any rendered row for that
  task targets the same stable task ID and must produce the same timer outcome.
- Cross-midnight and daylight-saving behavior continues to follow SPEC-002 history
  projection rules after a successful switch.
- If the renderer issues multiple switch requests concurrently, authoritative
  transactional rules determine the committed result. The renderer must still
  prevent duplicate activation from the same control.
- Restart recovery remains based on persisted timestamps and AppState after the
  switch commits.
- A missing task must not stop, pause, or otherwise disturb the current active
  task.
- Same-task running no-op behavior must not create zero-length or duplicate
  intervals.
- Same-task paused resume behavior must not reset `sessionStartedAt`.

---

# 17. Acceptance Criteria

## AC-004-001 — Idle History Play Starts Existing Task

Given the timer is idle and a history task row is visible,

when the user activates Play for that row,

then the existing task starts by stable ID, no duplicate Task is created, and the
timer enters the normal running state.

## AC-004-002 — Running Switch Is Atomic

Given Task A is running and Task B exists in history,

when the user activates Play for Task B,

then Task A's open interval closes at the authoritative switch time, a new open
interval for Task B starts at that same time, timer status remains running, and no
persisted intermediate idle state is committed.

## AC-004-003 — Paused Switch Starts a New Running Session

Given Task A is paused and Task B exists in history,

when the user activates Play for Task B,

then Task A remains closed, Task B starts running with a new open interval, and
`sessionStartedAt` is reset to the authoritative switch time.

## AC-004-004 — Running Same-Task Play Is a No-Op

Given a task is already running,

when the user activates the history-row control for that same task,

then no interval or AppState mutation occurs and the UI exposes that state as
already running.

## AC-004-005 — Paused Same-Task Play Resumes

Given a task is paused,

when the user activates Play for that same task from history,

then the task resumes using the existing paused-session semantics and continues
running without resetting `sessionStartedAt`.

## AC-004-006 — Missing Target Task Leaves Current State Unchanged

Given a history row becomes stale because its task was deleted or is otherwise
missing,

when the user activates Play for that row,

then the operation returns `TASK_NOT_FOUND`, the current timer state remains
unchanged, and history refreshes through an authoritative reload.

## AC-004-007 — Switch Input Is Runtime Validated

Given malformed switch input across the process boundary,

when the switch API is invoked,

then the request is rejected as `INVALID_SWITCH_TASK` before service or repository
mutation occurs.

## AC-004-008 — Play Control Is Accessible and Keyboard Reachable

Given the history list is rendered,

when the user navigates with keyboard or assistive technology,

then each applicable task row exposes a meaningful, focusable action with
understandable label/state and visible focus treatment.

## AC-004-009 — History Refreshes After Successful Switch

Given a successful idle start, same-task resume, or task switch from history,

when the timer state updates,

then Daily History refreshes authoritatively so the running interval and affected
totals appear correctly without manual reload.

## AC-004-010 — Pending State Prevents Duplicate Row Activation

Given a history-row Play action is already pending,

when the user clicks or presses Enter/Space repeatedly on that same control,

then duplicate switch submissions are prevented until the pending request settles.

---

# 18. Required Unit Tests

- switch-input runtime validation for exact object shape, empty IDs, unknown
  properties, and malformed values;
- timer service branch behavior for idle start, running different-task switch,
  paused different-task switch, running same-task no-op, paused same-task resume,
  and missing-task failure;
- controlled error mapping for invalid persisted state and missing tasks where unit
  seams are available.

---

# 19. Required Repository Tests

- disposable SQLite tests proving running-task switch closes the previous open
  interval and opens exactly one new interval for the selected task;
- disposable SQLite tests proving paused-task switch creates only the new target
  interval and resets `sessionStartedAt` appropriately;
- disposable SQLite tests proving same-task running activation performs no
  persistence mutation;
- disposable SQLite tests proving missing-task failure leaves persisted intervals
  and AppState unchanged.

---

# 20. Required Integration Tests

- end-to-end timer service integration for idle history Play, running switch,
  paused switch, same-task paused resume, and same-task running no-op;
- integration proving restart reconstruction remains correct after a committed
  switch;
- integration proving switch failure does not disturb an already running or paused
  task.

---

# 21. Required UI Tests

- history task rows render the correct state-aware control labels/actions for idle,
  running-same-task, paused-same-task, and different-task cases;
- keyboard activation triggers the same switch behavior as pointer activation;
- pending row state prevents duplicate activation;
- success triggers authoritative timer/history refresh wiring;
- `TASK_NOT_FOUND` renders a compact non-blocking failure state while preserving
  usable timer controls.

---

# 22. Migration Tests

Not applicable.

---

# 23. Security Considerations

Switching remains a privileged main-process operation exposed only through a narrow
typed preload API. The renderer must not receive raw Electron capabilities, direct
database access, or generic IPC invocation. Task IDs received from the renderer are
untrusted and require runtime validation and transactional re-resolution.

---

# 24. Performance Considerations

Switching must use one bounded transactional operation and must not perform
renderer-side recomputation of authoritative timer state. Successful switch
handling may trigger a history reload, but it should continue using the bounded
history query model from SPEC-002 rather than fetching complete task or interval
collections.

No additional database writes beyond the required interval/AppState transition are
acceptable for a no-op same-task running activation.

---

# 25. Accessibility Requirements

- The history-row action uses a semantic button or equivalent accessible control.
- The control remains keyboard reachable in collapsed and expanded task rows.
- Disabled same-task running state is communicated programmatically and visually.
- Same-task paused resume state is distinguishable from generic Play.
- Pending and error states are announced in a non-disruptive way.
- Visible focus remains clear against the established history styling.
- Action meaning is not communicated only by icon, color, or motion.
