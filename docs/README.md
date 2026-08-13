# Time Tracker — Product Documentation

## Status

Draft — MVP Definition

## Product

Time Tracker is a simple, local-first desktop application for tracking time spent on personal tasks.

The product prioritizes:

- extremely low friction;
- fast task switching;
- accurate local time tracking;
- useful daily history;
- simple analytics;
- privacy;
- cross-platform desktop support.

The application does not require an account, backend, cloud service, or internet connection.

## Target Platforms

The MVP targets:

- macOS;
- Windows;
- Linux.

## Technology Direction

The proposed application stack is:

- Electron
- TypeScript
- React
- Vite
- Electron Forge
- SQLite
- Drizzle ORM
- better-sqlite3

The renderer must never access SQLite or Node.js APIs directly.

All privileged operations are executed by the Electron main process and exposed to the renderer through a restricted preload API.

## Documentation Structure

### Product

`product/prd.md`

Defines:

- problem;
- product goals;
- MVP scope;
- functional requirements;
- non-functional requirements;
- product behavior.

`product/ux-design.md`

Defines:

- application structure;
- screens;
- states;
- interaction patterns;
- timer behavior;
- task history behavior.

### Domain

`domain/data-model.md`

Defines:

- domain entities;
- SQLite schema;
- relationships;
- invariants;
- time calculation rules.

### Architecture

`architecture/architecture.md`

Defines:

- application architecture;
- Electron process boundaries;
- persistence strategy;
- IPC;
- security;
- packaging;
- testing strategy.

### Roadmap

`roadmap/roadmap.md`

Defines the recommended order in which the MVP should be developed.

### Specs

Each feature is implemented from an individual specification under:

    docs/specs/

The first feature is:

    docs/specs/001-core-time-tracking/spec.md

## Product Principles

### 1. Tracking should require minimal interaction

Starting or switching work should normally require one click.

### 2. Time intervals are the source of truth

Task totals are derived from recorded intervals.

Accumulated duration should not be stored as a mutable counter.

### 3. Tasks are persistent

A task may be worked on across many days.

Starting an existing task creates another interval instead of duplicating the task.

### 4. The interface is daily, the model is not

History is grouped by day for usability.

Tasks themselves are independent of calendar days.

### 5. Local data belongs to the user

All task and tracking data is stored locally in SQLite.

No account or network connection is required.

### 6. Correctness is more important than timer animation

The application must calculate elapsed time from timestamps.

The UI timer is only a representation of persisted timestamps.

### 7. The MVP stays intentionally small

The MVP does not include:

- accounts;
- synchronization;
- teams;
- clients;
- billing;
- invoices;
- projects;
- tags;
- productivity scoring;
- cloud backup;
- automatic idle detection.

These features may be evaluated after the core workflow has been validated.
