# Domain and Data Model

## Status

Draft

---

# 1. Modeling Principles

The data model follows four rules:

1. intervals are the source of truth;
2. task totals are derived, never manually maintained;
3. only one interval may be open globally;
4. UI grouping must not dictate persistence structure.

---

# 2. Entities

The MVP contains three primary persistence concepts:

    Task
    TimeInterval
    AppState

---

# 3. Task

A Task represents a reusable activity.

Example:

    Implement authentication

A task is independent from calendar days.

## Fields

| Field | Type | Description |
|---|---|---|
| id | text | UUID |
| description | text | User-visible task description |
| normalized_description | text | Normalized value used for matching/search |
| created_at | integer | UTC epoch milliseconds |
| updated_at | integer | UTC epoch milliseconds |

## Rules

`description`:

- must not be empty;
- is trimmed;
- has a maximum length of 500 Unicode code points after trimming;
- is rejected rather than truncated when it exceeds that maximum.

`normalized_description` uses:

    trim(description).toLocaleLowerCase()

It is intended for exact case-insensitive matching, not user-visible display. It is
unique so equivalent normalized descriptions reuse one persistent Task.

---

# 4. TimeInterval

A TimeInterval represents actual tracked work.

## Fields

| Field | Type | Description |
|---|---|---|
| id | text | UUID |
| task_id | text | Foreign key to tasks |
| started_at | integer | UTC epoch milliseconds |
| ended_at | integer nullable | UTC epoch milliseconds |
| created_at | integer | UTC epoch milliseconds |
| updated_at | integer | UTC epoch milliseconds |

A null `ended_at` means the interval is currently running.

---

# 5. AppState

AppState persists the current timer UI state.

There is exactly one row.

## Fields

| Field | Type | Description |
|---|---|---|
| id | integer | Always `1` |
| timer_status | text | `idle`, `running`, or `paused` |
| current_task_id | text nullable | Current task |
| session_started_at | integer nullable | Start of current Start→Stop session |
| updated_at | integer | UTC epoch milliseconds |

`session_started_at` allows the application to calculate the large current-session timer across pause/resume intervals without introducing a separate TrackingSession entity.

---

# 6. Relationships

    Task 1 ──────────────── * TimeInterval

    AppState
        │
        └──── current_task_id ────> Task

A task can have zero or many intervals.

An interval belongs to exactly one task.

---

# 7. SQLite Schema

Conceptual SQL:

```sql
CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT NOT NULL,
    normalized_description TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

CREATE UNIQUE INDEX tasks_normalized_description_unique_idx
ON tasks(normalized_description);

CREATE INDEX tasks_updated_at_idx
ON tasks(updated_at DESC);


CREATE TABLE time_intervals (
    id TEXT PRIMARY KEY NOT NULL,
    task_id TEXT NOT NULL,
    started_at INTEGER NOT NULL,
    ended_at INTEGER,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,

    FOREIGN KEY (task_id)
        REFERENCES tasks(id)
        ON DELETE CASCADE,

    CHECK (
        ended_at IS NULL
        OR ended_at > started_at
    )
);

CREATE INDEX time_intervals_task_id_idx
ON time_intervals(task_id);

CREATE INDEX time_intervals_started_at_idx
ON time_intervals(started_at);

CREATE INDEX time_intervals_ended_at_idx
ON time_intervals(ended_at);

CREATE INDEX time_intervals_task_started_idx
ON time_intervals(task_id, started_at);


CREATE UNIQUE INDEX one_open_interval_only_idx
ON time_intervals((1))
WHERE ended_at IS NULL;


CREATE TABLE app_state (
    id INTEGER PRIMARY KEY NOT NULL CHECK (id = 1),

    timer_status TEXT NOT NULL
        CHECK (timer_status IN ('idle', 'running', 'paused')),

    current_task_id TEXT,

    session_started_at INTEGER,

    updated_at INTEGER NOT NULL,

    FOREIGN KEY (current_task_id)
        REFERENCES tasks(id)
        ON DELETE SET NULL
);
```

---

# 8. Initial AppState

On initial database creation:

```sql
INSERT INTO app_state (
    id,
    timer_status,
    current_task_id,
    session_started_at,
    updated_at
)
VALUES (
    1,
    'idle',
    NULL,
    NULL,
    :now
);
```

---

# 9. State Invariants

## Idle

When:

    timer_status = idle

then:

    current_task_id = NULL
    session_started_at = NULL
    no open interval exists

---

## Running

When:

    timer_status = running

then:

    current_task_id IS NOT NULL
    session_started_at IS NOT NULL
    exactly one open interval exists
    open interval.task_id = current_task_id

---

## Paused

When:

    timer_status = paused

then:

    current_task_id IS NOT NULL
    session_started_at IS NOT NULL
    no open interval exists

---

# 10. Transactions

Timer state transitions must be atomic SQLite transactions.

---

## Start From Idle

Transaction:

1. resolve or create Task;
2. create open TimeInterval;
3. update AppState to RUNNING.

Pseudo-operation:

```text
BEGIN

task = resolveTask()

INSERT interval(
  task,
  startedAt = now,
  endedAt = null
)

UPDATE app_state
SET
  timer_status = 'running',
  current_task_id = task.id,
  session_started_at = now

COMMIT
```

---

## Pause

Transaction:

```text
BEGIN

UPDATE open interval
SET ended_at = now

UPDATE app_state
SET timer_status = 'paused'

COMMIT
```

---

## Resume

Transaction:

```text
BEGIN

INSERT interval(
  task_id = app_state.current_task_id,
  started_at = now,
  ended_at = null
)

UPDATE app_state
SET timer_status = 'running'

COMMIT
```

`session_started_at` does not change.

---

## Stop Running Task

Transaction:

```text
BEGIN

UPDATE open interval
SET ended_at = now

UPDATE app_state
SET
  timer_status = 'idle',
  current_task_id = NULL,
  session_started_at = NULL

COMMIT
```

---

## Stop Paused Task

Transaction:

```text
BEGIN

UPDATE app_state
SET
  timer_status = 'idle',
  current_task_id = NULL,
  session_started_at = NULL

COMMIT
```

---

## Switch Task

Switching must occur in one transaction.

```text
BEGIN

if current timer is running:
    close current interval

resolve destination task

create destination open interval

update app_state:
    timer_status = running
    current_task_id = destination
    session_started_at = now

COMMIT
```

There must never be an observable database state with two open intervals.

---

# 11. Duration

For a closed interval:

```text
durationMs = endedAt - startedAt
```

For an open interval:

```text
durationMs = now - startedAt
```

---

# 12. Current Tracking Session Duration

The UI's large timer represents active work recorded since:

    app_state.session_started_at

Only interval duration counts.

Paused wall-clock duration is excluded.

Conceptually:

```text
sessionDuration =
    SUM(
        overlap duration of current task intervals
        between session_started_at and now
    )
```

Example:

```text
Start       09:00
Pause       09:45

Resume      10:00
Now         10:20

Session timer = 1h 05m
```

The 15-minute pause is not counted.

---

# 13. Lifetime Task Duration

```text
SUM(all interval durations for task)
```

Open interval duration is calculated against current time.

---

# 14. Daily Task Duration

The daily calculation uses overlap between each interval and the local day boundaries.

For a day:

```text
dayStart
dayEnd
```

For an interval:

```text
intervalStart
intervalEnd
```

Contribution:

```text
overlapStart = max(intervalStart, dayStart)
overlapEnd   = min(intervalEnd, dayEnd)

duration = max(0, overlapEnd - overlapStart)
```

---

# 15. Midnight Example

Stored interval:

```text
2026-08-13 23:30
        ↓
2026-08-14 00:30
```

Database:

```text
one interval
```

Daily projection:

```text
Aug 13 = 30m
Aug 14 = 30m
```

---

# 16. Manual Interval Overlap

The MVP does not permit overlapping intervals.

Given proposed interval:

```text
newStart
newEnd
```

an existing interval conflicts when:

```text
existing.started_at < newEnd
AND
existingEnd > newStart
```

For currently open intervals:

```text
existingEnd = now/infinity
```

The application should validate overlaps in the domain/service layer.

---

# 17. Deleting a Task

Deleting:

    tasks.id = X

cascades to:

    time_intervals.task_id = X

The application must prevent deletion if the task is currently loaded in AppState.

The user must stop it first.

---

# 18. Derived Data

The following must not be persisted as mutable source-of-truth fields:

- task total duration;
- daily task duration;
- daily total duration;
- weekly duration;
- monthly duration;
- analytics averages.

They are projections derived from intervals.

Caching may be introduced later if measurements demonstrate a performance problem.

---

# 19. Suggested Drizzle Model

Conceptual file structure:

```text
src/main/database/
├── database.ts
├── schema.ts
├── migrations/
├── repositories/
│   ├── task.repository.ts
│   ├── interval.repository.ts
│   └── app-state.repository.ts
└── queries/
    ├── history.queries.ts
    └── analytics.queries.ts
```

---

# 20. Migration Policy

Database schema changes must use migrations.

The application must not depend on destructive database recreation after release.

Migrations should:

- be deterministic;
- execute during application initialization;
- run before repositories become available;
- preserve existing user data;
- be covered by migration tests.

---

# 21. Database Location

The SQLite database must be stored in an operating-system appropriate per-user application data location.

The exact path must be resolved by the Electron main process.

The renderer must never receive the filesystem database path unless a future feature explicitly requires it.
