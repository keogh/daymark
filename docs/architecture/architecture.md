# Application Architecture

## Status

Draft

---

# 1. Architecture Goals

The architecture should optimize for:

- simplicity;
- local-first operation;
- reliability;
- strict process boundaries;
- testability;
- cross-platform packaging;
- future maintainability.

The application is intentionally not designed as a distributed system.

---

# 2. Technology Stack

## Desktop Runtime

Electron

## Language

TypeScript

## UI

React

## Styling

Tailwind CSS v4

## Component Foundation

Selectively adopted, source-owned shadcn/ui components from the official registry.
Use the Radix-based Nova preset, Lucide icons, and semantic theme tokens. Custom
product-specific components remain appropriate; do not treat shadcn/ui as a reason
to install an exhaustive component set or impose a generic dashboard design.

## Build Tool

Vite

## Packaging

Electron Forge

## Persistence

SQLite

## ORM / Query Layer

Drizzle ORM

## SQLite Driver

better-sqlite3

## Testing

Recommended:

- Vitest for unit tests;
- React Testing Library for renderer component tests;
- Playwright for packaged/application-level flows where practical.

Exact package versions belong in `package.json` and the lockfile rather than architecture documentation.

---

# 3. High-Level Architecture

```text
┌─────────────────────────────────────────────┐
│                 Renderer                    │
│                                             │
│  React                                      │
│  Tailwind CSS / semantic theme tokens       │
│  Source-owned UI and product components     │
│  View Models / Hooks                        │
│  Presentation State                         │
│                                             │
└───────────────────┬─────────────────────────┘
                    │
              window.daymark
                    │
┌───────────────────▼─────────────────────────┐
│                 Preload                     │
│                                             │
│  Narrow typed IPC API                       │
│  contextBridge                              │
│                                             │
└───────────────────┬─────────────────────────┘
                    │ IPC
┌───────────────────▼─────────────────────────┐
│                Main Process                 │
│                                             │
│  IPC Handlers                               │
│       ↓                                     │
│  Application Services                       │
│       ↓                                     │
│  Domain Logic                               │
│       ↓                                     │
│  Repositories / Queries                     │
│       ↓                                     │
│  Drizzle                                    │
│       ↓                                     │
│  SQLite                                     │
│                                             │
│  Tray                                       │
│  App lifecycle                              │
│                                             │
└─────────────────────────────────────────────┘
```

---

# 4. Process Responsibilities

## Renderer

The renderer owns:

- rendering;
- user interaction;
- temporary UI state;
- forms;
- modals;
- visual timer updates;
- local animation of history values derived from authoritative snapshots;
- navigation.

Renderer styling uses Tailwind CSS utilities for layout and composition plus
semantic theme tokens and reviewed source-owned UI primitives. Reusable component
variants own common visual states; feature components should not encode product
meaning with raw palette utilities.

The styling and component toolchain does not alter the renderer security boundary.
UI components must not import Electron, Node.js, database, filesystem, or raw IPC
capabilities.

The renderer does not own:

- authoritative timer state;
- SQLite;
- filesystem access;
- Electron main APIs;
- persistent business rules.

---

## Preload

The preload layer exposes the smallest useful typed API.

Example conceptual API:

```ts
interface DaymarkAPI {
  timer: {
    getState(): Promise<TimerState>;
    start(input: StartTaskInput): Promise<TimerState>;
    pause(): Promise<TimerState>;
    resume(): Promise<TimerState>;
    stop(): Promise<TimerState>;
    switchTask(taskId: string): Promise<TimerState>;
  };

  tasks: {
    search(query: string): Promise<TaskSummary[]>;
    rename(taskId: string, description: string): Promise<Task>;
    delete(taskId: string): Promise<void>;
  };

  history: {
    getPage(input: HistoryPageInput): Promise<AppResult<HistoryPage>>;
  };

  intervals: {
    create(input: ManualIntervalInput): Promise<TimeInterval>;
    update(
      intervalId: string,
      input: UpdateIntervalInput
    ): Promise<TimeInterval>;
    delete(intervalId: string): Promise<void>;
  };

  analytics: {
    getSummary(input: AnalyticsRangeInput): Promise<AnalyticsSummary>;
  };
}
```

Do not expose raw:

```text
ipcRenderer
filesystem
database
shell
```

to React.

---

# 5. Main Process Layers

Recommended dependency direction:

```text
IPC Handlers
     ↓
Application Services
     ↓
Domain
     ↓
Repositories
     ↓
Database
```

Dependencies should never point upward.

---

# 6. Application Services

Suggested services:

```text
TimerService
TaskService
HistoryService
IntervalService
AnalyticsService
AppStateService
TrayService
```

`HistoryService` obtains one authoritative time snapshot from the injected Clock
and builds bounded local-calendar-day projections. Daily history is read-only:
stored intervals remain the source of truth, including intervals crossing midnight.
The renderer may animate the open interval from the returned snapshot, but refreshes
through the explicit history API after timer transitions and reconciliation events.

---

# 7. TimerService

TimerService owns timer transitions.

Public operations:

```text
getState
startTask
pause
resume
stop
switchTask
```

TimerService must be the only normal application path that creates open intervals.

It enforces:

```text
maximum one open interval
```

---

# 8. Clock Abstraction

Do not call:

```ts
Date.now()
```

throughout domain code.

Use:

```ts
interface Clock {
  now(): number;
}
```

Production:

```text
SystemClock
```

Tests:

```text
FakeClock
```

This makes timer tests deterministic.

---

# 9. Transaction Boundary

State-changing TimerService methods execute inside database transactions.

Example:

```text
TimerService.switchTask()
    ↓
Database.transaction()
    ↓
close old interval
resolve destination task
create new interval
update app state
    ↓
commit
```

This protects timer invariants.

---

# 10. Database

SQLite runs only in the Electron main process.

Development and packaged launches use separate OS-appropriate Electron `userData`
directories. This keeps development migrations and data changes isolated from the
packaged application profile while retaining writable per-user storage in both
modes.

Recommended database initialization:

```text
App ready
    ↓
resolve user-data directory
    ↓
open SQLite database
    ↓
enable foreign keys
    ↓
run migrations
    ↓
validate app state
    ↓
initialize services
    ↓
initialize tray
    ↓
create window
```

---

# 11. SQLite Configuration

Recommended initialization:

```sql
PRAGMA foreign_keys = ON;
```

Evaluate WAL mode during implementation:

```sql
PRAGMA journal_mode = WAL;
```

Do not introduce configuration only because it is conventional; benchmark or validate behavior where needed.

---

# 12. Repository Layer

Suggested repositories:

```text
TaskRepository
IntervalRepository
AppStateRepository
```

Repositories provide persistence primitives.

They should not contain renderer concepts.

---

# 13. Query Layer

Read-heavy projections may use dedicated queries rather than forcing all reads through entity repositories.

Examples:

```text
HistoryQueries
AnalyticsQueries
TaskSummaryQueries
```

This is useful because daily history is a projection rather than a simple entity list.
The implemented history query path retrieves bounded activity-day pages and task
lifetime totals with set-based queries rather than one query per rendered row.

---

# 14. Suggested Project Structure

```text
src/
├── main/
│   ├── app/
│   │   ├── create-window.ts
│   │   ├── lifecycle.ts
│   │   └── tray.ts
│   │
│   ├── database/
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── queries/
│   │
│   ├── domain/
│   │   ├── task.ts
│   │   ├── time-interval.ts
│   │   ├── timer-state.ts
│   │   └── errors.ts
│   │
│   ├── services/
│   │   ├── timer.service.ts
│   │   ├── task.service.ts
│   │   ├── interval.service.ts
│   │   ├── history.service.ts
│   │   └── analytics.service.ts
│   │
│   ├── ipc/
│   │   ├── timer.handlers.ts
│   │   ├── task.handlers.ts
│   │   ├── interval.handlers.ts
│   │   ├── history.handlers.ts
│   │   └── analytics.handlers.ts
│   │
│   └── index.ts
│
├── preload/
│   ├── index.ts
│   └── api.ts
│
├── renderer/
│   ├── app/
│   ├── components/
│   ├── features/
│   │   ├── timer/
│   │   ├── history/
│   │   ├── manual-entry/
│   │   ├── analytics/
│   │   └── settings/
│   ├── hooks/
│   ├── lib/
│   └── main.tsx
│
└── shared/
    ├── contracts/
    ├── types/
    └── validation/
```

---

# 15. IPC Contracts

IPC should use feature-specific channels.

Example:

```text
timer:get-state
timer:start
timer:pause
timer:resume
timer:stop
timer:switch

tasks:search
tasks:rename
tasks:delete

history:get-page

intervals:create
intervals:update
intervals:delete

analytics:get-summary
```

Renderer input must be validated in the main process.

Never trust IPC input merely because the renderer is part of the same application.

---

# 16. Shared Contracts

Types shared across process boundaries belong under:

```text
src/shared/contracts/
```

Example:

```ts
export interface TimerState {
  status: 'idle' | 'running' | 'paused';

  currentTask: {
    id: string;
    description: string;
  } | null;

  sessionStartedAt: number | null;

  sessionDurationMs: number;

  taskTodayDurationMs: number;

  taskLifetimeDurationMs: number;

  activeIntervalStartedAt: number | null;

  serverNow: number;
}
```

`serverNow` means authoritative main-process time at response generation.

The renderer can animate from that snapshot.

---

# 17. Timer Rendering Strategy

Do not write to SQLite every second.

Instead:

1. main process returns authoritative timer state;
2. renderer stores the snapshot;
3. renderer visually updates elapsed duration on an interval;
4. persisted timestamps remain authoritative.

Example:

```text
Main:
sessionDurationMs = 1,200,000
serverNow = T

Renderer:
display = snapshotDuration + (currentNow - serverNow)
```

Only when status is RUNNING.

---

# 18. Renderer Refresh

The timer display may update approximately once per second.

The exact visual refresh interval is not part of persistence correctness.

---

# 19. Restart Recovery

On application launch:

```text
load AppState

if RUNNING:
    find open interval
    reconstruct timer

if PAUSED:
    ensure no open interval
    reconstruct session duration

if IDLE:
    ensure no open interval
```

If persisted state is inconsistent, the application must fail safely and log enough information for diagnosis.

A future recovery policy may automatically repair known states.

---

# 20. Tray Architecture

Tray management belongs in the main process.

TrayService receives timer state changes and rebuilds tray presentation when needed.

Conceptually:

```text
TimerService
   ↓
TimerStateChanged
   ↓
TrayService
```

The MVP does not require a full event bus.

A direct application-level notification mechanism is sufficient.

---

# 21. Closing the Window

Main window close:

```text
window.hide()
```

Application process remains alive.

Explicit application Quit terminates the process.

Timer persistence does not depend on the process remaining alive.

---

# 22. OS Sleep

Because tracking is timestamp-based:

```text
startedAt = T1
now       = T2
```

elapsed wall-clock duration is:

```text
T2 - T1
```

The application may listen to power state events later if idle/sleep correction becomes a feature.

It should not automatically change user data in the MVP.

---

# 23. Security

Renderer configuration must follow a least-privilege model.

Required principles:

```text
contextIsolation = true
nodeIntegration  = false
sandbox renderer
restricted preload bridge
validate IPC inputs
```

Do not expose generic IPC methods such as:

```ts
send(channel, ...args)
invoke(channel, ...args)
```

to the renderer.

Expose explicit feature functions instead.

---

# 24. Native SQLite Packaging

`better-sqlite3` is a native Node module.

The build pipeline must account for Electron-native module packaging.

Use the Electron Forge native-module tooling rather than custom ad-hoc scripts unless a platform issue requires otherwise.

Packaging must be verified separately on:

- macOS arm64;
- macOS x64 if supported;
- Windows x64;
- Linux x64.

Additional architectures can be added based on release requirements.

---

# 25. Distribution Targets

Initial useful artifacts:

## macOS

A normal packaged macOS application.

DMG may be used for distribution.

## Windows

A standard installer.

## Linux

At minimum:

- `.deb`

Additional formats may be added later.

Distribution format is not a domain concern and may evolve independently.

---

# 26. CI

Cross-platform application artifacts should eventually be built using CI runners for each operating system.

Suggested matrix:

```text
macOS
Windows
Linux
```

The MVP development can begin locally before release automation exists.

---

# 27. Testing Strategy

## Domain Unit Tests

Highest priority.

All automated tests live beneath the top-level `test/` directory and mirror the
production module structure beneath `src/`. Test-only support code also remains
under `test/`; production source directories do not contain colocated tests.

Test:

- start;
- pause;
- resume;
- stop;
- switch;
- interval validation;
- cross-midnight calculations;
- restart reconstruction;
- session timer calculations.

Use FakeClock.

---

## Repository Tests

Use temporary SQLite databases.

Test:

- migrations;
- constraints;
- cascade deletion;
- unique open interval invariant;
- history queries;
- analytics queries.

---

## Service Integration Tests

Test complete TimerService flows against SQLite.

Example:

```text
Start A
advance 20m
Pause
advance 15m
Resume
advance 10m
Stop
```

Expected:

```text
Task A total = 30m
Session total = 30m
Intervals = 2
Open intervals = 0
```

---

## Renderer Tests

Test user-visible state and interactions.

Do not duplicate domain logic tests in React.

---

## End-to-End Tests

Critical flows:

```text
start → pause → resume → stop
start A → switch B
close window → restore from tray
quit while running → relaunch
manual time entry
edit interval
delete interval
```

---

# 28. Logging

Logs should be local.

Important events:

- database initialization failures;
- migration failures;
- timer invariant failures;
- uncaught main-process errors.

Do not log task descriptions unnecessarily if logs could later be exported for support.

---

# 29. Error Handling

Domain errors should be typed.

Examples:

```text
TaskNotFound
NoActiveTimer
TimerAlreadyRunning
InvalidInterval
IntervalOverlap
ActiveTaskCannotBeDeleted
DatabaseInvariantViolation
```

IPC converts internal errors to safe structured application errors.

---

# 30. Performance Philosophy

Do not prematurely introduce:

- worker processes;
- caches;
- background services;
- state synchronization frameworks.

SQLite and simple in-process services are sufficient for the MVP architecture.

Measure before adding complexity.

---

# 31. Architectural Boundaries

The following boundaries are mandatory:

```text
React must not import better-sqlite3.

React must not import Drizzle database objects.

Preload must not contain business logic.

IPC handlers must not contain SQL.

Repositories must not know about React.

Timer totals must not be persisted as counters.
```

These rules should later be included in `AGENTS.md` for Codex.
