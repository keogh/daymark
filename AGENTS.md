# AGENTS.md

# Daymark — Coding Agent Working Instructions

## 1. Purpose

This repository contains a local-first desktop time-tracking application.

The application allows a single user to:

- create reusable tasks;
- start tracking time;
- pause and resume tracking;
- stop tracking;
- switch between tasks;
- view daily history;
- manually add or correct time intervals;
- view lightweight analytics.

The application runs entirely on the user's computer.

There is:

- no backend;
- no account;
- no cloud database;
- no synchronization;
- no network dependency for normal operation.

---

# 2. Development Methodology

This project uses Spec-Driven Development.

Do not implement product features directly from:

- the PRD;
- roadmap;
- informal assumptions;
- TODO comments;
- general product context.

Features must be implemented from an explicit specification located under:

    docs/specs/

The specification currently being implemented is the primary source of truth for feature behavior.

Read:

    docs/sdd/workflow.md

before implementing a specification.

Each implementation-ready specification must have a companion:

    docs/specs/<spec-directory>/tasks.md

Select and complete one unblocked task from that breakdown at a time. The
specification remains the source of truth for behavior.

---

# 3. Source of Truth Priority

When instructions conflict, use the following priority:

1. current feature specification;
2. documented architectural decisions;
3. domain model;
4. architecture documentation;
5. PRD;
6. UX documentation;
7. roadmap;
8. implementation convenience.

Files:

    docs/specs/
    docs/decisions.md
    docs/domain/data-model.md
    docs/architecture/architecture.md
    docs/product/prd.md
    docs/product/ux-design.md
    docs/roadmap/roadmap.md

If a specification conflicts with an established architectural decision, do not silently change the architecture.

Document the conflict and update the decision explicitly before proceeding.

---

# 4. Required Reading Before Implementation

Before implementing any feature, read:

    AGENTS.md
    docs/context.md
    docs/decisions.md
    docs/sdd/workflow.md
    docs/sdd/definition-of-done.md

Then read the relevant feature specification and its companion `tasks.md`.

When necessary, also read:

    docs/product/prd.md
    docs/product/ux-design.md
    docs/domain/data-model.md
    docs/architecture/architecture.md

Do not load unrelated specifications unless they are necessary to understand an established dependency.

---

# 5. Technology Stack

The intended MVP stack is:

- Electron
- TypeScript
- React
- Vite
- Electron Forge
- SQLite
- better-sqlite3
- Drizzle ORM
- Vitest
- React Testing Library

Use npm as the package manager unless a future decision explicitly changes it.

Do not introduce an alternative framework or persistence technology without a documented architectural decision.

---

# 6. Supported Platforms

The product targets:

- macOS;
- Windows;
- Linux.

Do not introduce implementation assumptions that unnecessarily bind application logic to one operating system.

Platform-specific code must be isolated.

---

# 7. Architecture Boundaries

The application uses the following dependency structure:

    Renderer
        ↓
    Preload API
        ↓
    IPC
        ↓
    Main Process
        ↓
    Application Services
        ↓
    Domain
        ↓
    Repositories / Queries
        ↓
    SQLite

These boundaries are mandatory.

---

# 8. Renderer Rules

The React renderer may contain:

- components;
- hooks;
- presentation state;
- forms;
- routing/navigation;
- visual timer updates.

The renderer must not:

- access SQLite;
- access Drizzle database objects;
- import better-sqlite3;
- access Node.js APIs directly;
- access filesystem APIs directly;
- contain authoritative timer logic;
- directly use Electron ipcRenderer.

All privileged functionality must go through the preload API.

For conditional JSX that renders a component only when a condition is true, prefer:

```tsx
{condition && <Component />}
```

over a ternary whose false branch is `null`. The left operand must be an explicit
boolean condition so values such as `0` or an empty string are not rendered
accidentally. Use a ternary when choosing between two rendered alternatives.

---

# 9. Preload Rules

The preload layer exposes a narrow typed API through:

    contextBridge

Do not expose:

    ipcRenderer
    require
    fs
    path
    database objects
    generic invoke(channel)
    generic send(channel)

Expose explicit feature APIs instead.

Example:

    window.daymark.timer.start(...)
    window.daymark.timer.pause()
    window.daymark.history.getRange(...)

The preload layer must not contain domain business logic.

---

# 10. Main Process Rules

The Electron main process owns:

- SQLite;
- Drizzle;
- repositories;
- application services;
- IPC handlers;
- tray;
- application lifecycle;
- window creation;
- filesystem paths.

IPC handlers should remain thin.

Business logic belongs in services/domain code.

SQL belongs in repositories or dedicated query modules.

---

# 11. Timer Architecture

Time intervals are the source of truth.

Never persist mutable accumulated-time counters.

Do not update SQLite every second.

Persist timestamps such as:

    startedAt
    endedAt

Calculate elapsed time from timestamps.

The renderer may animate time locally between authoritative snapshots.

---

# 12. Clock Rule

Domain and application services must use an injected Clock abstraction.

Avoid direct Date.now() calls throughout domain code.

Production:

    SystemClock

Tests:

    FakeClock

Timer tests must be deterministic.

---

# 13. Database Rules

SQLite runs only in the Electron main process.

Use Drizzle migrations for schema changes.

Do not recreate the database to perform schema upgrades.

Persist user data in the operating-system appropriate application data directory.

All schema changes after initial release must preserve existing user data unless an explicit migration decision states otherwise.

---

# 14. Database Invariants

The following invariants must be enforced:

- only one interval can be open globally;
- an interval end must occur after its start;
- interval task references must be valid;
- deleting a task deletes its intervals;
- timer state transitions must be atomic.

Where possible, enforce important invariants both:

- in application/domain logic;
- at the database level.

---

# 15. Domain Rules

A Task is persistent and independent of calendar days.

A Task may have many TimeIntervals.

History grouped by day is a projection.

Task totals are projections.

Daily totals are projections.

Analytics values are projections.

Do not introduce mutable total-duration fields.

---

# 16. Date and Time Rules

Store timestamps as UTC epoch milliseconds.

Calendar-day grouping uses the user's local timezone.

An interval may cross midnight.

Do not split a database interval only because it crosses midnight.

Instead calculate overlap with local day boundaries.

---

# 17. Timer State

The timer supports:

    idle
    running
    paused

Only valid transitions defined by the current specification may be implemented.

Do not invent additional timer states without a specification.

---

# 18. Testing Expectations

Business logic requires tests.

All automated test files must live under the top-level:

    test/

The `test/` directory must mirror the structure of `src/`. For example:

    src/main/services/timer-service.ts
    test/main/services/timer-service.test.ts

    src/renderer/components/timer.tsx
    test/renderer/components/timer.test.tsx

Do not colocate test files in `src/`. Shared test setup, fixtures, fakes, and
helpers must also live under `test/` in the relevant mirrored layer or a clearly
named shared test-support directory.

Important timer behavior should generally have:

- unit tests;
- repository tests when persistence is involved;
- integration tests across services and SQLite.

Renderer behavior should use component tests when useful.

Critical complete workflows may use end-to-end tests.

Do not duplicate the same business logic assertions unnecessarily across every testing layer.

---

# 19. Test Database

Persistence tests must use disposable SQLite databases.

Tests must never modify the user's real application database.

---

# 20. Code Quality

Prefer:

- explicit code;
- small modules;
- typed contracts;
- predictable control flow;
- clear names;
- testable services.

Avoid unnecessary:

- abstractions;
- inheritance hierarchies;
- dependency injection frameworks;
- global state managers;
- event buses;
- generic repositories;
- premature optimization.

Introduce complexity only when a specification or demonstrated implementation need requires it.

---

# 21. TypeScript Rules

Prefer strict TypeScript.

Use `@/*` for imports rooted at `src/*` when an import would otherwise traverse a
parent directory. Keep `./` imports for modules in the same directory. Do not add
more aliases without a demonstrated need.

Avoid:

    any

unless there is a documented reason.

Use event-specific React event types. Do not use the deprecated `FormEvent` type;
for form submission handlers, use `SubmitEvent<HTMLFormElement>` (or let the
`onSubmit` prop infer that type).

Public process-boundary contracts must be explicitly typed.

Validate untrusted IPC inputs at runtime.

TypeScript types alone are not runtime validation.

---

# 22. Error Handling

Expected application errors should be represented explicitly.

Examples:

    InvalidTaskDescription
    InvalidInterval
    IntervalOverlap
    NoActiveTimer
    TimerAlreadyRunning
    TimerAlreadyPaused
    ActiveTaskCannotBeDeleted

Do not use exceptions as ordinary control flow where a typed result is clearer.

Do not expose internal stack traces through IPC.

---

# 23. Logging

Logging must be local.

Log technical information necessary for diagnosing:

- startup failures;
- migrations;
- database errors;
- invariant violations;
- unexpected main-process failures.

Avoid unnecessarily logging task descriptions or user-created content.

---

# 24. UX Rules

Primary actions should be low friction.

Normal task switching should not require confirmation.

Destructive actions should require confirmation when specified.

Do not introduce additional dialogs or steps without a UX requirement.

The timer is the primary visual focus.

---

# 25. Accessibility

New UI must consider:

- keyboard access;
- visible focus;
- semantic controls;
- sufficient contrast;
- labels;
- status information not communicated only through color.

---

# 26. Dependency Policy

Before adding a dependency:

1. verify the standard library or existing dependencies cannot reasonably solve the problem;
2. verify the dependency is actively maintained;
3. prefer small focused dependencies;
4. avoid duplicate solutions for the same concern.

Do not add large architectural dependencies for convenience.

---

# 27. Scope Control

Implement only what the active specification requires.

Do not opportunistically implement future roadmap items.

In particular, do not add:

- authentication;
- networking;
- cloud storage;
- accounts;
- teams;
- projects;
- tags;
- billing;
- idle detection;
- synchronization;
- telemetry;
- automatic startup;

unless a future specification explicitly requires them.

---

# 28. Refactoring

Refactoring is allowed when necessary to implement the specification safely.

Large unrelated refactors should not be included in feature work.

If a larger architectural refactor becomes necessary:

1. document why;
2. update docs/decisions.md if architecture changes;
3. update the implementation plan;
4. keep behavior covered by tests.

---

# 29. Documentation Updates

When implementation changes documented behavior, update the relevant documentation in the same change.

Do not leave documentation knowingly inconsistent with the implementation.

---

# 30. Progress Tracking

Update:

    docs/progress.md

after completing meaningful milestones or specifications.

The progress document should describe:

- completed work;
- active work;
- blockers;
- important deviations;
- next specification.

Do not use progress.md as a replacement for Git history.

---

# 31. Definition of Done

Every feature must satisfy:

    docs/sdd/definition-of-done.md

and the specific acceptance criteria defined in its specification.

---

# 32. Before Declaring Work Complete

Run the relevant project checks.

Expected checks will eventually include:

    npm run typecheck
    npm run lint
    npm test
    npm run package

During feature development, run the smallest relevant test subset first.

Before completing a specification, run the full required validation defined by that specification.

---

# 33. Do Not Guess Product Behavior

If required behavior is genuinely unspecified and materially affects the product:

- identify the ambiguity;
- avoid silently inventing complex behavior;
- document the decision if a safe straightforward default is necessary.

For minor implementation details that do not affect product behavior, choose the simplest reasonable solution.

---

# 34. Guiding Principle

Build the smallest reliable implementation that completely satisfies the active specification.

Correctness and clarity are more important than cleverness.
