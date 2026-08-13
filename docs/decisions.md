# Architectural and Product Decisions

This document records decisions that materially affect implementation.

Do not silently reverse an accepted decision.

When changing a decision:

1. mark the original decision as superseded;
2. record the new decision;
3. explain the reason;
4. update affected documentation.

---

# DEC-001 — Desktop Runtime

## Status

Accepted

## Decision

Use Electron.

## Context

The application must support:

- macOS;
- Windows;
- Linux.

The implementation should remain primarily TypeScript.

## Reasoning

Electron provides:

- mature cross-platform desktop support;
- TypeScript/Node.js integration;
- tray support;
- application lifecycle APIs;
- mature packaging tooling.

Keeping most of the application in TypeScript is preferred over introducing a second systems language for the MVP.

---

# DEC-002 — Renderer Framework

## Status

Accepted

## Decision

Use React with TypeScript.

---

# DEC-003 — Build Tool

## Status

Accepted

## Decision

Use Vite for renderer development/building.

Use Electron Forge for Electron project packaging and distribution.

---

# DEC-004 — Local Database

## Status

Accepted

## Decision

Use SQLite.

## Reasoning

The product is:

- single-user;
- local-first;
- offline;
- desktop-only for the MVP.

A server database is unnecessary.

---

# DEC-005 — SQLite Driver

## Status

Accepted

## Decision

Use better-sqlite3.

SQLite access occurs only from the Electron main process.

---

# DEC-006 — ORM

## Status

Accepted

## Decision

Use Drizzle ORM.

## Reasoning

The application has a small relational model and benefits from:

- typed schema definitions;
- migrations;
- direct SQL-style queries;
- relatively low abstraction overhead.

---

# DEC-007 — Network Architecture

## Status

Accepted

## Decision

The MVP has no application backend.

No network connectivity is required for normal operation.

---

# DEC-008 — Renderer Security Boundary

## Status

Accepted

## Decision

Use:

    contextIsolation = true
    nodeIntegration = false

Privileged functionality is exposed through an explicit preload API.

The renderer must never receive unrestricted ipcRenderer access.

---

# DEC-009 — SQLite Ownership

## Status

Accepted

## Decision

SQLite is owned by the Electron main process.

The renderer must never connect directly to SQLite.

---

# DEC-010 — Timer Source of Truth

## Status

Accepted

## Decision

Persist start and end timestamps.

Do not persist continuously updated duration counters.

## Consequence

The visual timer is derived from timestamps.

The database does not receive writes every second.

---

# DEC-011 — Time Representation

## Status

Accepted

## Decision

Persist timestamps as UTC epoch milliseconds.

Use the user's local timezone when projecting intervals into calendar days.

---

# DEC-012 — Midnight Intervals

## Status

Accepted

## Decision

A TimeInterval may cross midnight.

Do not split the persisted interval.

Daily reports calculate overlap with calendar-day boundaries.

---

# DEC-013 — Task Persistence

## Status

Accepted

## Decision

Tasks are independent of days.

A task may contain intervals across any number of days.

Daily history is a projection over intervals.

---

# DEC-014 — Task Duration

## Status

Accepted

## Decision

Do not store:

    task.totalDuration

as mutable state.

Lifetime duration is calculated from intervals.

---

# DEC-015 — Daily Duration

## Status

Accepted

## Decision

Do not store daily accumulated duration.

Daily totals are calculated from intervals.

---

# DEC-016 — One Active Timer

## Status

Accepted

## Decision

Only one TimeInterval may be open globally.

This invariant should be enforced both:

- in application logic;
- by SQLite.

---

# DEC-017 — Pause Semantics

## Status

Accepted

## Decision

Pause closes the current open interval.

The Task remains the current Task.

Resume creates a new TimeInterval.

---

# DEC-018 — Stop Semantics

## Status

Accepted

## Decision

Stop:

- closes the current open interval if necessary;
- clears the current Task;
- ends the current UI tracking session;
- returns the timer to idle.

The Task itself is preserved.

---

# DEC-019 — Switching Tasks

## Status

Accepted

## Decision

Starting another task while one is running or paused automatically stops the current task and starts the selected task.

No confirmation dialog is shown.

---

# DEC-020 — Tracking Session Persistence

## Status

Accepted

## Decision

Do not create a separate TrackingSession database table for the MVP.

Persist:

    app_state.session_started_at

while the current Start → Stop session exists.

Session active duration is derived from TimeIntervals.

---

# DEC-021 — Closing the Window

## Status

Accepted

## Decision

Closing the main window hides it instead of quitting the application.

The tray remains active.

---

# DEC-022 — Explicit Application Exit

## Status

Accepted

## Decision

Explicitly quitting the application does not stop an open timer.

The open interval remains persisted.

When the application starts again, elapsed duration is reconstructed from timestamps.

---

# DEC-023 — Computer Sleep

## Status

Accepted

## Decision

Elapsed wall-clock time continues to count while the computer sleeps if the timer remains running.

Idle detection and sleep correction are outside the MVP.

---

# DEC-024 — System Tray

## Status

Accepted

## Decision

System tray/menu-bar integration is included in the MVP.

It provides:

- Open;
- Pause/Resume;
- Stop;
- Quit;
- current timer information where practical.

---

# DEC-025 — Automatic OS Startup

## Status

Accepted

## Decision

Do not implement automatic launch at OS startup in the initial MVP.

Design should not intentionally prevent adding it later.

---

# DEC-026 — Manual Time Entry

## Status

Accepted

## Decision

The MVP supports manual time creation and correction.

Manual intervals must not overlap existing tracked intervals.

---

# DEC-027 — Task Fields

## Status

Accepted

## Decision

An MVP Task contains only a description as user-authored content.

Do not add:

- notes;
- project;
- category;
- tags;
- client.

---

# DEC-028 — Analytics Scope

## Status

Accepted

## Decision

MVP analytics is limited to:

- 7-day view;
- 30-day view;
- time per day;
- total;
- daily average;
- weekly total;
- monthly total;
- top tasks.

---

# DEC-029 — Package Manager

## Status

Accepted

## Decision

Use npm.

## Reasoning

The project is small and does not require workspace/package-manager features beyond standard npm functionality.

This can be revisited if the repository later becomes a monorepo.

---

# DEC-030 — Testing

## Status

Accepted

## Decision

Use:

- Vitest for TypeScript unit/integration tests;
- React Testing Library for renderer components.

Store all automated tests in the top-level `test/` directory. Test paths mirror
their production paths beneath `src/`; for example,
`src/main/services/timer-service.ts` is tested by
`test/main/services/timer-service.test.ts`. Do not colocate tests in `src/`.
Test-only setup, fixtures, fakes, and helpers also belong under `test/`.

End-to-end tooling may be introduced when an executable workflow requires it.

Do not make E2E tooling a prerequisite for project foundation unless SPEC-000 requires it.

---

# DEC-031 — State Management

## Status

Accepted

## Decision

Do not introduce Redux or another global state-management framework during project foundation.

Use React state/hooks initially.

Introduce a global state library only if later feature complexity demonstrates a real need.

---

# DEC-032 — Runtime Validation

## Status

Accepted

## Decision

IPC input crossing from renderer to main must be validated at runtime.

The exact validation technique may be selected during implementation.

Avoid introducing a large validation dependency if straightforward validation is sufficient.

---

# DEC-033 — Database Migrations

## Status

Accepted

## Decision

All production schema changes use migrations.

Never rely on deleting/recreating the user's database after release.
