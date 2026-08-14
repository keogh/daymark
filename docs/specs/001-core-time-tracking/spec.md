# SPEC-001 — Core Time Tracking

## Status

Verified

## Milestone

M1 — Core Timer

## Priority

P0

---

# 1. Objective

Implement the core persistent timer workflow:

```text
Create Task
    ↓
Start
    ↓
Pause
    ↓
Resume
    ↓
Stop
```

The timer must use SQLite timestamps as its source of truth and survive renderer reloads and complete application restarts.

---

# 2. User Story

As an individual user,

I want to start, pause, resume, and stop time tracking for a task,

so that I can accurately record how long I spend working on it.

---

# 3. Scope

This specification includes:

- Task persistence;
- TimeInterval persistence;
- AppState persistence;
- task creation from description;
- Start;
- Pause;
- Resume;
- Stop;
- timer state reconstruction;
- current tracking-session duration;
- current task today's duration;
- current task lifetime duration;
- basic timer UI;
- typed IPC API;
- automated tests.

---

# 4. Out of Scope

This specification does not implement:

- history list;
- task suggestions;
- existing-task search UI;
- task switching from history;
- manual time entry;
- editing intervals;
- deleting intervals;
- renaming tasks;
- deleting tasks;
- analytics;
- tray;
- settings;
- automatic startup;
- global keyboard shortcuts.

These belong to later specs.

---

# 5. Dependencies

SPEC-001 assumes project foundation exists:

- Electron application;
- React renderer;
- preload;
- typed IPC pattern;
- SQLite connection;
- Drizzle configuration;
- migration system;
- testing environment.

If the foundation does not yet exist, complete M0 before beginning this spec.

---

# 6. Domain Model

## Task

```ts
interface Task {
  id: string;
  description: string;
  normalizedDescription: string;
  createdAt: number;
  updatedAt: number;
}
```

---

## TimeInterval

```ts
interface TimeInterval {
  id: string;
  taskId: string;
  startedAt: number;
  endedAt: number | null;
  createdAt: number;
  updatedAt: number;
}
```

---

## Timer Status

```ts
type TimerStatus =
  | 'idle'
  | 'running'
  | 'paused';
```

---

## AppState

```ts
interface AppState {
  id: 1;
  timerStatus: TimerStatus;
  currentTaskId: string | null;
  sessionStartedAt: number | null;
  updatedAt: number;
}
```

---

# 7. Public Timer State

Renderer-facing state:

```ts
interface TimerState {
  status: TimerStatus;

  currentTask: {
    id: string;
    description: string;
  } | null;

  sessionStartedAt: number | null;

  sessionDurationMs: number;

  taskTodayDurationMs: number;

  taskLifetimeDurationMs: number;

  activeIntervalStartedAt: number | null;

  now: number;
}
```

When idle:

```ts
{
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null
}
```

---

# 8. Clock

All domain/application time must use an injected Clock abstraction.

```ts
export interface Clock {
  now(): number;
}
```

Production implementation:

```ts
export class SystemClock implements Clock {
  now(): number {
    return Date.now();
  }
}
```

Tests must use a controllable fake clock.

Do not scatter direct `Date.now()` calls throughout services.

---

# 9. Start Command

Renderer input:

```ts
interface StartTaskInput {
  description: string;
}
```

IPC:

```text
timer:start
```

---

# 10. Start Validation

Before persistence:

```text
trim description
```

Invalid:

```text
""
" "
"\n"
```

Maximum length:

```text
max length = 500 characters
```

Length is measured in Unicode code points after trimming. The application must not
silently truncate descriptions. A trimmed description longer than 500 code points
is invalid.

On validation failure:

```text
INVALID_TASK_DESCRIPTION
```

---

# 11. Start Behavior

Precondition:

```text
timer status = idle
```

Steps:

1. normalize description;
2. find existing exact normalized-description task;
3. if no task exists, create it;
4. create a TimeInterval:
   - `startedAt = now`;
   - `endedAt = null`;
5. update AppState:
   - status = running;
   - currentTaskId = task.id;
   - sessionStartedAt = now;
6. commit transaction;
7. return authoritative TimerState.

---

# 12. Duplicate Description Behavior

For this specification, exact normalized description matching reuses the existing Task.

Example:

Existing:

```text
Implement authentication
```

Inputs that should resolve to the same task:

```text
Implement authentication
 implement authentication
IMPLEMENT AUTHENTICATION
```

This behavior may be refined by a later task-search specification.

`normalized_description` must be unique in SQLite. Task creation must still perform
an application-level lookup, and a uniqueness conflict must resolve by reading and
reusing the existing task. Add this constraint through a migration; do not recreate
an existing database.

---

# 13. Start While Not Idle

SPEC-001 does not yet implement switching.

If Start is called while status is:

```text
running
paused
```

return:

```text
TIMER_NOT_IDLE
```

Later task-switching specs will replace this behavior for appropriate interactions.

---

# 14. Pause Command

IPC:

```text
timer:pause
```

Precondition:

```text
status = running
```

Behavior:

1. obtain authoritative `now`;
2. find the open interval;
3. set:
   - `endedAt = now`;
4. update AppState:
   - status = paused;
5. preserve:
   - currentTaskId;
   - sessionStartedAt;
6. commit;
7. return TimerState.

---

# 15. Pause Invalid States

If status is:

```text
idle
```

return:

```text
NO_ACTIVE_TIMER
```

If status is:

```text
paused
```

return:

```text
TIMER_ALREADY_PAUSED
```

---

# 16. Resume Command

IPC:

```text
timer:resume
```

Precondition:

```text
status = paused
```

Behavior:

1. obtain `now`;
2. create new TimeInterval:
   - taskId = currentTaskId;
   - startedAt = now;
   - endedAt = null;
3. update AppState:
   - status = running;
4. preserve:
   - currentTaskId;
   - sessionStartedAt;
5. commit;
6. return TimerState.

---

# 17. Resume Invalid States

Idle:

```text
NO_CURRENT_TASK
```

Running:

```text
TIMER_ALREADY_RUNNING
```

---

# 18. Stop Command

IPC:

```text
timer:stop
```

---

# 19. Stop While Running

Behavior:

1. obtain `now`;
2. close open interval at `now`;
3. update AppState:
   - timerStatus = idle;
   - currentTaskId = null;
   - sessionStartedAt = null;
4. commit;
5. return idle TimerState.

---

# 20. Stop While Paused

There is no open interval to close.

Behavior:

1. update AppState:
   - timerStatus = idle;
   - currentTaskId = null;
   - sessionStartedAt = null;
2. commit;
3. return idle TimerState.

---

# 21. Stop While Idle

Stop should be safe and idempotent.

Calling Stop while already idle returns the idle TimerState.

It does not create or modify intervals.

---

# 22. Get State Command

IPC:

```text
timer:get-state
```

Behavior:

1. load AppState;
2. validate state invariants;
3. load current Task if applicable;
4. locate open interval if applicable;
5. calculate derived durations;
6. return TimerState.

No database mutation is expected during normal valid reads.

---

# 23. Session Duration

The large timer represents active work between the current session's:

```text
Start
```

and eventual:

```text
Stop
```

Paused time is excluded.

Example:

```text
09:00 Start
09:45 Pause

10:00 Resume
10:20 Current time
```

Expected display:

```text
01:05:00
```

not:

```text
01:20:00
```

---

# 24. Session Duration Query

Given:

```text
currentTaskId
sessionStartedAt
now
```

sum overlapping intervals for the current task where:

```text
interval.startedAt >= sessionStartedAt
```

and:

```text
interval.startedAt <= now
```

For an open interval:

```text
effectiveEnd = now
```

---

# 25. Today's Task Duration

For the current Task:

```text
sum overlap between all task intervals and today's local calendar boundaries
```

An open interval uses:

```text
effectiveEnd = now
```

---

# 26. Lifetime Task Duration

For the current Task:

```text
sum all task interval durations
```

An open interval uses:

```text
effectiveEnd = now
```

---

# 27. Midnight

The duration calculation must correctly handle an open or closed interval crossing midnight.

Example:

```text
Start:
Aug 13 23:45

Now:
Aug 14 00:15
```

Lifetime contribution:

```text
30 minutes
```

Aug 14 daily contribution:

```text
15 minutes
```

---

# 28. Persistence

Required tables:

```text
tasks
time_intervals
app_state
```

Use the definitions from:

```text
docs/domain/data-model.md
```

---

# 29. Unique Open Interval

The database must enforce:

```text
maximum one time_interval where ended_at IS NULL
```

Do not rely exclusively on application code for this invariant.

---

# 30. Atomicity

The following operations must be transactions:

```text
start
pause
resume
stop
```

A process failure must not intentionally leave half-completed timer transitions.

---

# 31. Restart Recovery

Scenario:

```text
10:00 Start Task A
10:20 terminate app
10:50 launch app
```

Expected:

```text
status = running
current task = Task A
session duration = 50m
lifetime contribution = 50m
```

No background second counter is required while the application process is not running.

---

# 32. Paused Restart Recovery

Scenario:

```text
10:00 Start
10:30 Pause
10:40 terminate app
11:30 launch
```

Expected:

```text
status = paused
session duration = 30m
```

The time while the application was closed is not added because there was no open interval.

---

# 33. Renderer Behavior — Idle

Display:

```text
What are you working on?

[ Task description...                    ] [ Start ]
```

Start via:

```text
button click
Enter key
```

---

# 34. Renderer Behavior — Running

Display:

```text
Task description

HH:MM:SS
Current session

Today Xh Ym · Total Xh Ym

[ Pause ] [ Stop ]
```

---

# 35. Renderer Behavior — Paused

Display:

```text
Task description

HH:MM:SS
Paused

Today Xh Ym · Total Xh Ym

[ Resume ] [ Stop ]
```

---

# 36. Renderer Timer Animation

Renderer receives authoritative state:

```ts
{
  sessionDurationMs,
  now,
  status
}
```

When status is RUNNING:

```text
display =
  sessionDurationMs
  +
  rendererElapsedSinceSnapshot
```

When PAUSED:

```text
display = sessionDurationMs
```

The renderer must periodically resynchronize with authoritative main-process state when needed.

The exact strategy may be selected during implementation as long as persisted timestamps remain authoritative.

---

# 37. Renderer Reload

Reloading the renderer must not stop or reset the timer.

After reload:

```text
timer:get-state
```

reconstructs presentation.

---

# 38. IPC API

Preload must expose:

```ts
window.timeTracker.timer.getState(): Promise<AppResult<TimerState>>

window.timeTracker.timer.start({
  description
}): Promise<AppResult<TimerState>>

window.timeTracker.timer.pause(): Promise<AppResult<TimerState>>

window.timeTracker.timer.resume(): Promise<AppResult<TimerState>>

window.timeTracker.timer.stop(): Promise<AppResult<TimerState>>
```

The renderer must not invoke arbitrary IPC channels.

---

# 39. Error Contract

Expected command failures cross IPC as values rather than rejected promises:

```ts
type AppResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: AppError };

interface AppError {
  code:
    | 'INVALID_TASK_DESCRIPTION'
    | 'TIMER_NOT_IDLE'
    | 'NO_ACTIVE_TIMER'
    | 'TIMER_ALREADY_PAUSED'
    | 'NO_CURRENT_TASK'
    | 'TIMER_ALREADY_RUNNING'
    | 'INTERNAL_ERROR';
  message: string;
}
```

Unexpected failures must be logged in the main process and mapped to
`INTERNAL_ERROR`. Internal stack traces and arbitrary exception properties must not
cross IPC.

---

# 40. Acceptance Criteria

## AC-001 — Start New Task

Given:

```text
timer is idle
```

When:

```text
user starts "Implement authentication"
```

Then:

```text
Task exists
one open TimeInterval exists
status = running
currentTask = Implement authentication
```

---

## AC-002 — Exact Task Reuse

Given an existing task:

```text
Implement authentication
```

When the user starts:

```text
implement authentication
```

Then:

```text
no duplicate Task is created
new interval belongs to existing Task
```

---

## AC-003 — Running Timer

Given:

```text
10:00 Start
```

At:

```text
10:30
```

Then session duration is:

```text
30m
```

---

## AC-004 — Pause

Given:

```text
10:00 Start
10:30 Pause
```

Then:

```text
status = paused
interval = 10:00 → 10:30
session duration = 30m
open intervals = 0
```

---

## AC-005 — Paused Time Excluded

Given:

```text
10:00 Start
10:30 Pause
11:00 current time
```

Then:

```text
session duration = 30m
```

---

## AC-006 — Resume

Given:

```text
10:00 Start
10:30 Pause
11:00 Resume
11:15 current time
```

Then:

```text
status = running
interval count = 2
open intervals = 1
session duration = 45m
```

---

## AC-007 — Stop

Given:

```text
10:00 Start
10:30 Stop
```

Then:

```text
status = idle
current task = null
open intervals = 0
Task lifetime duration = 30m
```

---

## AC-008 — Stop Paused

Given:

```text
10:00 Start
10:30 Pause
10:45 Stop
```

Then:

```text
Task total = 30m
status = idle
```

---

## AC-009 — Application Restart While Running

Given:

```text
10:00 Start
application exits
11:00 application starts
```

Then:

```text
status = running
session duration = 1h
```

---

## AC-010 — Application Restart While Paused

Given:

```text
10:00 Start
10:30 Pause
application exits
11:00 application starts
```

Then:

```text
status = paused
session duration = 30m
```

---

## AC-011 — Renderer Reload

Given a running timer,

when the renderer reloads,

the timer remains running and restores the correct elapsed time.

---

## AC-012 — One Open Interval

No valid sequence of commands may create more than one open TimeInterval.

The database constraint must independently prevent this invalid state.

---

## AC-013 — Midnight

Given an interval:

```text
Aug 13 23:45
to
Aug 14 00:15
```

Then:

```text
Aug 13 contribution = 15m
Aug 14 contribution = 15m
lifetime contribution = 30m
```

---

# 41. Required Unit Tests

Minimum TimerService tests:

```text
start creates task
start reuses normalized task
start creates open interval

pause closes interval
pause preserves session start

resume creates second interval
resume preserves session start

stop running closes interval
stop paused does not create interval
stop idle is idempotent

paused time excluded from session
lifetime total calculated correctly
today total calculated correctly
cross-midnight calculation

restart running reconstruction
restart paused reconstruction

invalid transitions
```

---

# 42. Required Repository Tests

```text
task insert/read

interval insert/read

task cascade delete

only one open interval allowed

AppState singleton

AppState foreign key

timestamp constraint:
endedAt > startedAt
```

---

# 43. Required Integration Test

Use:

```text
FakeClock
Temporary SQLite Database
Real TimerService
Real repositories
```

Scenario:

```text
09:00 Start Task A

advance 45m

09:45 Pause

advance 15m

10:00 Resume

advance 20m

10:20 Stop
```

Expected:

```text
Task A intervals = 2

Interval 1:
09:00 → 09:45
45m

Interval 2:
10:00 → 10:20
20m

Task lifetime total:
1h 05m

Final state:
idle
```

---

# 44. UI Tests

Minimum:

```text
idle shows task input

Enter starts task

running shows Pause and Stop

paused shows Resume and Stop

running timer visually advances

paused timer does not visually advance

state restores from getState
```

---

# 45. Definition of Done

SPEC-001 is complete when:

- all acceptance criteria pass;
- migrations exist;
- TimerService transitions are transactional;
- one-open-interval constraint exists;
- core domain tests pass;
- repository tests pass;
- integration tests pass;
- timer state survives application restart;
- renderer never accesses SQLite;
- renderer never accesses raw ipcRenderer;
- TypeScript compiles without errors;
- linting passes;
- no feature from later specs is implemented unless necessary for this feature.

---

# 46. Implementation Notes for Codex

Prefer the simplest implementation satisfying this specification.

Do not:

- add Redux unless justified by existing project architecture;
- add projects;
- add tags;
- add users;
- add networking;
- add cloud persistence;
- add background services;
- persist mutable duration counters;
- create a separate TrackingSession table unless implementation evidence demonstrates it is necessary.

When specification behavior conflicts with an implementation convenience, the specification wins.

If an implementation decision changes a documented architectural invariant, stop and document the decision before changing the architecture.
