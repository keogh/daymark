# SPEC-000 — Project Foundation

## Status

Verified

## Milestone

M0 — Project Foundation

## Priority

P0

---

# 1. Objective

Create the minimum production-quality technical foundation required to implement the Daymark MVP.

At the end of this specification, the repository must contain a working Electron desktop application using:

- TypeScript;
- React;
- Vite;
- Electron Forge;
- SQLite;
- better-sqlite3;
- Drizzle ORM.

The architecture must establish a strict boundary between:

    Renderer
        ↓
    Preload
        ↓
    IPC
        ↓
    Main Process
        ↓
    SQLite

No actual timer feature behavior is implemented in this specification.

---

# 2. User Story

As a developer,

I want a stable application foundation,

so that product features can be implemented incrementally without repeatedly restructuring the project.

---

# 3. Background

Daymark is a local-first desktop application.

It must eventually support:

- macOS;
- Windows;
- Linux.

The product stores all user data locally.

There is no backend.

There are no accounts.

SQLite is the application's persistent storage.

Product behavior is defined in:

    docs/product/prd.md

Architecture is defined in:

    docs/architecture/architecture.md

Repository rules are defined in:

    AGENTS.md

---

# 4. Scope

This specification includes:

- npm project initialization;
- Electron;
- Electron Forge;
- TypeScript;
- React;
- Vite;
- main process;
- preload process;
- renderer;
- secure BrowserWindow configuration;
- typed preload API;
- typed IPC pattern;
- SQLite connection;
- better-sqlite3;
- Drizzle ORM;
- Drizzle schema;
- database migrations;
- initial database tables;
- database constraints;
- initial AppState row;
- database initialization;
- application folder structure;
- Vitest;
- React Testing Library;
- linting;
- type checking;
- formatting configuration;
- development scripts;
- packaging;
- basic architecture verification.

---

# 5. Out of Scope

SPEC-000 does not implement:

- timer Start;
- timer Pause;
- timer Resume;
- timer Stop;
- task creation UI;
- task search;
- daily history;
- manual time;
- task switching;
- tray functionality;
- analytics;
- settings;
- auto-launch;
- cloud features;
- user accounts;
- synchronization.

Do not implement product functionality beyond what is necessary to verify the architecture.

---

# 6. Dependencies

None.

This is the first implementation specification.

---

# 7. Package Manager

Use:

    npm

The repository must contain:

    package.json
    package-lock.json

Do not introduce another package manager.

---

# 8. Required Technology

## Runtime

Electron

## Language

TypeScript

## Renderer

React

## Renderer Build

Vite

## Electron Packaging

Electron Forge

## Persistence

SQLite

## SQLite Driver

better-sqlite3

## ORM

Drizzle ORM

## Unit / Integration Testing

Vitest

## Component Testing

React Testing Library

---

# 9. Version Policy

Use mutually compatible stable dependency versions.

Do not hard-code dependency versions into project documentation.

The installed versions in:

    package.json
    package-lock.json

are authoritative for the repository.

Avoid beta, alpha, canary, or experimental releases unless strictly required.

---

# 10. Project Structure

Create the following conceptual structure:

```text
src/
├── main/
│   ├── app/
│   │   ├── create-window.ts
│   │   └── lifecycle.ts
│   │
│   ├── database/
│   │   ├── database.ts
│   │   ├── schema.ts
│   │   ├── migrate.ts
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── queries/
│   │
│   ├── domain/
│   ├── services/
│   ├── ipc/
│   └── index.ts
│
├── preload/
│   ├── api.ts
│   └── index.ts
│
├── renderer/
│   ├── app/
│   ├── components/
│   ├── features/
│   ├── hooks/
│   ├── lib/
│   └── main.tsx
│
└── shared/
    ├── contracts/
    ├── types/
    └── validation/
```

Minor changes to filenames are acceptable if the architectural boundaries remain obvious.

Do not collapse all application code into a small number of large files.

---

# 11. Electron Main Process

Create a normal Electron main-process entry point.

Responsibilities in SPEC-000:

- initialize Electron lifecycle;
- initialize database;
- run migrations;
- register IPC handlers;
- create main BrowserWindow;
- handle normal development/production renderer loading.

Do not implement product business behavior.

---

# 12. BrowserWindow Security

The BrowserWindow must use:

```
webPreferences: {
  contextIsolation: true,
  nodeIntegration: false
}
```

Enable renderer sandboxing unless a demonstrated technical limitation requires otherwise.

If sandboxing must be disabled:

1. document why;
2. update docs/decisions.md;
3. do not silently disable it.

---

# 13. Renderer Isolation

The renderer must not have direct access to:

```
process
require
fs
path
better-sqlite3
Drizzle database
ipcRenderer
```

The renderer interacts with privileged functionality only through:

```
window.daymark
```

---

# 14. Preload API

Expose an explicit typed API using:

```
contextBridge
```

Initial foundation API:

```
interface DaymarkAPI {
  system: {
    healthCheck(): Promise<SystemHealth>;
  };
}
```

Suggested result:

```
interface SystemHealth {
  status: 'ok';
  database: 'ready';
}
```

The exact type names may vary.

The semantics must remain equivalent.

---

# 15. Global Renderer Type

Provide TypeScript declaration support so React can safely use:

```
window.daymark.system.healthCheck()
```

without:

```
any
```

---

# 16. IPC

Create one explicit IPC endpoint for foundation verification.

Example channel:

```
system:health-check
```

Flow:

```
React
   ↓
Preload API
   ↓
ipcRenderer.invoke
   ↓
Main IPC Handler
   ↓
Database readiness check
   ↓
Response
```

The renderer must not know the actual IPC channel name.

---

# 17. IPC Handler Rules

IPC handlers must:

- validate relevant input;
- call application/database services;
- return renderer-safe data.

SPEC-000 health check has no user input.

Do not expose generic IPC invoke/send methods to the renderer.

---

# 18. Health Check UI

The renderer should display a minimal foundation screen.

Example:

```
Daymark

Application ready.
Local database connected.
```

A loading state is acceptable while performing the initial check.

Failure example:

```
Daymark

Application initialization failed.
```

This is a development foundation screen.

It will be replaced by SPEC-001.

Do not spend significant effort styling it.

---

# 19. Database Location

Resolve the database path from the Electron main process using the application's per-user data directory.

The renderer must not resolve or receive the database filesystem path.

Use a filename such as:

```
daymark.sqlite
```

Avoid environment-specific absolute paths in source code.

---

# 20. Database Initialization

Application startup order must conceptually be:

```
Electron ready
      ↓
resolve database path
      ↓
open SQLite
      ↓
configure SQLite
      ↓
run migrations
      ↓
ensure initial data
      ↓
register application services / IPC
      ↓
create main window
```

Do not create the main application UI before critical database initialization is complete.

---

# 21. SQLite Configuration

Enable:

```
PRAGMA foreign_keys = ON;
```

WAL mode may be enabled if compatible with the selected implementation:

```
PRAGMA journal_mode = WAL;
```

WAL is not an acceptance requirement for SPEC-000.

---

# 22. Database Schema

Create the initial MVP schema even though timer behavior is implemented in SPEC-001.

Required tables:

```
tasks
time_intervals
app_state
```

This ensures SPEC-001 can focus on behavior.

---

# 23. Tasks Table

Required conceptual schema:

```
CREATE TABLE tasks (
    id TEXT PRIMARY KEY NOT NULL,
    description TEXT NOT NULL,
    normalized_description TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);
```

Required indexes:

```
normalized_description
updated_at
```

The exact generated SQL may differ based on Drizzle migration output.

---

# 24. Time Intervals Table

Required conceptual schema:

```
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
```

Required indexes:

```
task_id
started_at
task_id + started_at
```

---

# 25. Single Open Interval Constraint

SQLite must enforce globally:

```
at most one row where ended_at IS NULL
```

Use a partial unique index or equivalent SQLite mechanism.

Conceptual SQL:

```
CREATE UNIQUE INDEX one_open_interval_only_idx
ON time_intervals((1))
WHERE ended_at IS NULL;
```

This invariant must be tested.

---

# 26. App State Table

Create:

```
CREATE TABLE app_state (
    id INTEGER PRIMARY KEY NOT NULL,

    timer_status TEXT NOT NULL,

    current_task_id TEXT,

    session_started_at INTEGER,

    updated_at INTEGER NOT NULL
);
```

Required semantic constraints:

```
id must equal 1
timer_status must be:
    idle
    running
    paused
```

`current_task_id` references:

```
tasks.id
```

with:

```
ON DELETE SET NULL
```

---

# 27. Initial App State

After initial migration/database initialization, exactly one AppState row must exist:

```
id = 1
timer_status = idle
current_task_id = null
session_started_at = null
```

Database initialization must be idempotent.

Restarting the application must not create additional AppState rows.

---

# 28. Drizzle Schema

Represent tables in:

```
src/main/database/schema.ts
```

The Drizzle schema must reflect:

- columns;
- foreign keys;
- indexes;
- constraints where supported.

If a required SQLite constraint cannot be represented directly through the normal Drizzle schema API, include it in the migration SQL.

The database invariant takes priority over ORM convenience.

---

# 29. Migrations

Use migration files.

Do not create production schema using only runtime:

```
CREATE TABLE IF NOT EXISTS
```

calls scattered through application initialization.

The initial migration must create the complete foundation schema.

---

# 30. Migration Execution

Application startup must automatically run pending migrations before normal database use.

Migration failure must:

- prevent normal application startup;
- produce a useful local error/log;
- not silently continue with an invalid schema.

---

# 31. Database Module

Provide a central database initialization module.

Conceptual API:

```
interface DatabaseContext {
  db: DrizzleDatabase;
  sqlite: BetterSqliteDatabase;
}
```

The exact types may differ.

There should be one normal database connection per application process.

Do not create a new SQLite connection for every query.

---

# 32. Database Lifecycle

Open database during application initialization.

Close it during normal application shutdown if appropriate for the selected library.

Do not expose database lifecycle to the renderer.

---

# 33. Repository Scaffolding

Create directories for:

```
repositories/
queries/
```

SPEC-000 does not require full TaskRepository or IntervalRepository behavior.

Avoid implementing SPEC-001 early.

Only implement persistence helpers necessary for:

- initialization;
- health checking;
- tests.

---

# 34. Domain Scaffolding

Create domain directories and minimal shared types necessary for foundation code.

Do not pre-implement the Timer state machine.

---

# 35. Shared Contracts

Renderer/main boundary types belong under:

```
src/shared/contracts/
```

At minimum define the foundation health-check contract.

Avoid duplicating the contract separately in preload and renderer.

---

# 36. React Renderer

Configure React with TypeScript.

Create a root application component.

The foundation UI only verifies:

- React renders;
- preload API exists;
- IPC works;
- SQLite is ready.

Do not build the full Daymark interface in SPEC-000.

---

# 37. Styling

Use minimal styling sufficient to confirm the renderer works.

Do not select or introduce a large component library during SPEC-000 unless already required by an accepted decision.

No full design system is required.

---

# 38. State Management

Use local React state/hooks for the health-check screen.

Do not add:

- Redux;
- Zustand;
- MobX;
- XState;

during SPEC-000.

---

# 39. Testing Infrastructure

Configure Vitest.

Tests must support:

- pure TypeScript tests;
- SQLite integration tests;
- renderer component tests.

Use appropriate test environments for each layer.

---

# 40. Temporary Database Tests

Database tests must use disposable temporary SQLite databases.

Never open the user's normal application database during automated tests.

Each test or test suite must start from a known schema state.

---

# 41. Migration Test

Required migration test:

Given:

```
empty temporary SQLite database
```

When:

```
all migrations execute
```

Then:

```
tasks exists
time_intervals exists
app_state exists
initial app_state exists
```

And:

```
app_state.id = 1
app_state.timer_status = idle
```

---

# 42. Foreign Key Test

Given:

```
no Task with id X
```

Attempting to insert:

```
time_interval.task_id = X
```

must fail.

---

# 43. Cascade Test

Given:

```
Task A
Interval belonging to Task A
```

When Task A is deleted,

the interval must also be deleted.

---

# 44. Interval Timestamp Constraint Test

Attempting to create:

```
startedAt = 100
endedAt = 100
```

must fail.

Attempting:

```
startedAt = 200
endedAt = 100
```

must fail.

---

# 45. Single Open Interval Test

Given:

```
open interval A
endedAt = null
```

Attempting to create another:

```
open interval B
endedAt = null
```

must fail at the database level.

This must not rely solely on application validation.

---

# 46. AppState Singleton Test

The database must not allow a valid second AppState row.

The schema should enforce:

```
id = 1
```

---

# 47. Health Check Integration Test

Verify:

```
database initialized
        ↓
health check application operation
        ↓
returns status ok
```

Do not require a real Electron BrowserWindow for this test if the architecture can test the service independently.

---

# 48. Renderer Test

Render the foundation application with a mocked preload API.

Verify:

```
loading state
      ↓
successful health response
      ↓
ready state
```

Also test the health-check failure state.

---

# 49. Linting

Configure ESLint for:

- TypeScript;
- React.

The exact rule set should remain pragmatic.

Avoid turning stylistic rules into a major source of complexity.

---

# 50. Formatting

Configure a consistent formatter.

Prettier is acceptable.

Formatting rules should remain standard and minimal.

---

# 51. Type Checking

Provide:

```
npm run typecheck
```

It must validate all relevant TypeScript code without emitting production files.

---

# 52. Test Command

Provide:

```
npm test
```

It must run the automated test suite non-interactively.

An optional watch command may also exist.

---

# 53. Development Command

Provide:

```
npm run dev
```

It must launch the development Electron application.

Equivalent naming generated by Electron Forge may be adapted, but `npm run dev` should remain the primary developer command.

---

# 54. Lint Command

Provide:

```
npm run lint
```

---

# 55. Package Command

Provide:

```
npm run package
```

It must produce an unpacked/packageable Electron application for the current development platform.

Full distributable installers are not required by SPEC-000.

---

# 56. Native Module Packaging

better-sqlite3 is a native dependency.

The Electron packaging setup must ensure the native module works with the Electron runtime.

Do not consider SPEC-000 complete merely because development mode works.

The packaged application must successfully initialize SQLite.

---

# 57. Development and Packaged Database Paths

Development and packaged builds must both resolve a valid writable user application data directory.

Development runs must use a distinct per-user application data directory from
packaged builds. Starting the development application must not open, migrate, or
otherwise modify the packaged application's database. Existing packaged data is
not copied into the development profile automatically.

Never attempt to write the production database inside:

- application source directory;
- asar archive;
- packaged application resources.

---

# 58. Application Startup Failure

If database initialization fails:

- do not expose a normal ready UI;
- log the technical error locally;
- display a minimal initialization failure state if possible.

Do not silently ignore migration or database failures.

---

# 59. Logging

A minimal main-process logging approach is sufficient.

SPEC-000 does not require a third-party logging framework.

Important initialization failures should be visible during development.

Avoid logging future user-created Task content.

---

# 60. Environment Configuration

Avoid requiring `.env` variables for normal application startup.

The application has no remote services.

No secrets are required.

If build tooling introduces environment variables, document them.

---

# 61. No Network Requirement

The packaged application must not require network access to:

- start;
- open SQLite;
- render the foundation UI;
- perform health checks.

Dependency installation during development is not considered application network behavior.

---

# 62. Cross-Platform Code

Foundation code must avoid unnecessary platform-specific path assumptions.

Use Electron/Node path APIs where necessary in the main process.

Do not hard-code:

```
/Users/...
C:\Users\...
/home/...
```

---

# 63. Platform Packaging Scope

SPEC-000 requires packaging to work on the developer's current platform.

It does not require producing all three OS artifacts from one machine.

Full cross-platform packaging and release automation belongs to a later specification.

---

# 64. Security Verification

At minimum verify:

```
contextIsolation = true
nodeIntegration = false
```

The React renderer must only use the exposed:

```
window.daymark
```

bridge.

---

# 65. Required NPM Scripts

The final project should expose at minimum:

```
{
  "scripts": {
    "dev": "...",
    "typecheck": "...",
    "lint": "...",
    "test": "...",
    "package": "..."
  }
}
```

Additional scripts are allowed.

---

# 66. Acceptance Criteria

## AC-000-001 — Development Startup

Given a fresh repository setup with dependencies installed,

when:

```
npm run dev
```

is executed,

then:

- Electron launches;
- a BrowserWindow opens;
- the React application renders.

---

## AC-000-002 — Secure Renderer

The BrowserWindow runs with:

```
contextIsolation enabled
nodeIntegration disabled
```

The renderer does not directly access Node.js APIs.

---

## AC-000-003 — Typed Preload API

The renderer can call:

```
window.daymark.system.healthCheck()
```

with complete TypeScript typing.

The renderer does not receive raw ipcRenderer access.

---

## AC-000-004 — IPC Round Trip

Calling:

```
system.healthCheck()
```

from the renderer crosses preload and IPC boundaries and returns a successful response from the main process.

---

## AC-000-005 — SQLite Initialization

On application startup:

- the SQLite database opens;
- foreign keys are enabled;
- migrations execute;
- database becomes ready before normal UI initialization.

---

## AC-000-006 — Application Data Location

The database is stored in an OS-appropriate per-user application data directory.

The path is resolved in the main process.

The development and packaged applications use distinct per-user application data
directories. A development launch does not open or modify the packaged
application's database.

---

## AC-000-007 — Initial Schema

The database contains:

```
tasks
time_intervals
app_state
```

after migration.

---

## AC-000-008 — Initial App State

The database contains exactly one initial AppState:

```
id = 1
timerStatus = idle
currentTaskId = null
sessionStartedAt = null
```

---

## AC-000-009 — Migration Idempotency

Restarting the application does not:

- recreate tables destructively;
- create duplicate AppState rows;
- lose existing data.

---

## AC-000-010 — Foreign Keys

SQLite foreign key enforcement is active.

Invalid interval task references fail.

---

## AC-000-011 — Cascade Delete

Deleting a Task deletes its associated TimeIntervals.

---

## AC-000-012 — Interval Constraint

An interval with:

```
endedAt <= startedAt
```

cannot be persisted.

---

## AC-000-013 — One Open Interval Constraint

The database rejects a second TimeInterval with:

```
endedAt = null
```

while another open interval exists.

---

## AC-000-014 — Tests

```
npm test
```

passes.

---

## AC-000-015 — Type Checking

```
npm run typecheck
```

passes.

---

## AC-000-016 — Lint

```
npm run lint
```

passes.

---

## AC-000-017 — Packaging

```
npm run package
```

successfully packages the application on the development platform.

---

## AC-000-018 — Packaged SQLite

The packaged application:

- launches;
- initializes SQLite;
- executes health check successfully.

better-sqlite3 works under the packaged Electron runtime.

---

## AC-000-019 — Offline Startup

After installation/package creation, normal application startup and database initialization require no internet connection.

---

# 67. Required Tests

At minimum implement tests covering:

```
migration from empty database

initial app_state creation

migration initialization is idempotent

foreign key enforcement

task cascade deletion

interval timestamp check constraint

one-open-interval constraint

app_state singleton constraint

database health check

renderer ready state

renderer health-check error state
```

---

# 68. Manual Verification

Manually verify:

```
npm run dev
```

Then confirm:

- Electron opens;
- foundation screen renders;
- database reports ready.

Also verify:

```
npm run package
```

Launch the packaged application and confirm the same behavior.

---

# 69. Documentation Deliverables

During implementation, update if necessary:

```
docs/decisions.md
docs/architecture/architecture.md
docs/progress.md
```

Do not rewrite product requirements from implementation details.

---

# 70. Progress Update

After successful completion update:

```
docs/progress.md
```

to:

```
SPEC-000 — Verified
```

and make:

```
SPEC-001 — Core Time Tracking
```

the next active specification.

---

# 71. Definition of Done

SPEC-000 is complete when:

- all acceptance criteria pass;
- all required tests pass;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes;
- packaged application can open SQLite;
- architecture boundaries are established;
- database migrations work;
- no timer business behavior has been prematurely implemented;
- documentation reflects the resulting architecture;
- docs/progress.md is updated.

---

# 72. Implementation Instructions for Codex

Before modifying the repository:

1. read `AGENTS.md`;
2. read `docs/context.md`;
3. read `docs/decisions.md`;
4. read `docs/architecture/architecture.md`;
5. read `docs/domain/data-model.md`;
6. read `docs/sdd/workflow.md`;
7. read `docs/sdd/definition-of-done.md`;
8. read this specification;
9. update `docs/plan.md`.

Then implement SPEC-000 incrementally.

Prefer the smallest architecture that satisfies documented requirements.

Do not implement SPEC-001 behavior.

Do not introduce:

- Redux;
- backend APIs;
- authentication;
- cloud services;
- projects;
- tags;
- analytics;
- tray behavior;
- automatic startup;
- timer state machine.

Scaffolding directories for future functionality is acceptable.

Before declaring completion:

1. run type checking;
2. run linting;
3. run tests;
4. package the application;
5. verify the packaged application launches;
6. update `docs/progress.md`.

If implementation requires changing an accepted architecture decision, update `docs/decisions.md` before making that change.
