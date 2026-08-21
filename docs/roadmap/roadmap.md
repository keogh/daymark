# MVP Development Roadmap

## Status

Draft

---

# 1. Strategy

The application should be developed vertically.

Each milestone should leave the application in a working state.

Avoid implementing all persistence, then all backend logic, then all UI.

Prefer:

```text
domain
  +
persistence
  +
IPC
  +
UI
```

for one coherent feature at a time.

---

# 2. Milestones

```text
M0  Project Foundation
M1  Core Timer
M2  Daily History
M3  Task Reuse and Switching
M4  Interval Management
M5  Task Management
M6  System Tray
M7  Analytics
M8  Settings and UX Polish
M9  Cross-Platform Packaging
M10 MVP QA and Release
M11 Trusted Release Signing and Notarization
M12 Data Export
M13 Local Backup and Restore
M14 Task Archiving
M15 Global Keyboard Shortcuts
M16 Automatic OS Startup
```

---

# M0 — Project Foundation

## Objective

Create the desktop application and architectural skeleton.

## Scope

- Electron;
- TypeScript;
- React;
- Vite;
- Electron Forge;
- SQLite;
- Drizzle;
- better-sqlite3;
- application directories;
- preload bridge;
- IPC conventions;
- database initialization;
- migrations;
- test environment.

## Deliverables

Application opens a React window.

SQLite database is created in the correct local application directory.

A basic IPC round trip works.

Automated tests execute.

## Exit Criteria

```text
npm run dev
```

starts the application successfully.

Production packaging works on the primary development platform.

---

# M1 — Core Timer

## Objective

Implement the complete timer state machine.

## Scope

- task creation;
- start;
- pause;
- resume;
- stop;
- AppState;
- TimeInterval persistence;
- timer reconstruction;
- current-session timer;
- current task today's total;
- lifetime task total.

## Important Constraint

This milestone implements business behavior before history UI complexity.

## Exit Criteria

The user can:

```text
create task
start
pause
resume
stop
restart app
```

without losing or corrupting time.

---

# M2 — Daily History

## Objective

Expose tracked work grouped by day.

## Scope

- daily totals;
- daily task totals;
- lifetime totals;
- day grouping;
- cross-midnight projection;
- expandable interval rows.

## Exit Criteria

The main screen accurately represents recorded intervals across multiple calendar days.

---

# M3 — Task Reuse and Switching

## Objective

Make recurring work fast.

## Scope

- task search;
- recent task suggestions;
- start existing task;
- Play from history;
- one-click task switching;
- automatic stop of previous task.

## Exit Criteria

The user can switch from Task A to Task B with one action.

---

# M4 — Interval Management

## Objective

Allow users to repair tracking mistakes.

## Scope

- manual interval entry;
- edit interval;
- delete interval;
- validation;
- overlap detection;
- immediate total recalculation.

## Exit Criteria

The user can accurately reconstruct missed or incorrect work without directly editing SQLite.

---

# M5 — Task Management

## Objective

Support long-term task maintenance.

## Scope

- rename task;
- delete task;
- cascading interval deletion;
- deletion confirmation;
- prevent deletion of active task.

## Exit Criteria

Task records can be maintained safely.

---

# M6 — System Tray

## Objective

Allow the application to stay unobtrusive during work.

## Scope

- tray icon;
- hide window on close;
- restore window;
- display active task;
- pause;
- resume;
- stop;
- quit;
- platform-specific validation.

## Exit Criteria

The user does not need the main window visible while tracking.

---

# M7 — Analytics

## Objective

Provide useful basic reflection without feature bloat.

## Scope

- last 7 days;
- last 30 days;
- duration per day;
- total;
- daily average;
- weekly total;
- monthly total;
- top tasks;
- simple chart.

## Exit Criteria

Analytics values match interval source data.

---

# M8 — Settings and UX Polish

## Objective

Make the MVP feel coherent and production-ready.

## Scope

- week starts Monday/Sunday;
- system/light/dark theme;
- keyboard navigation;
- accessibility;
- empty states;
- loading states;
- error states;
- duration formatting;
- application icons.

## Exit Criteria

Primary workflows are usable without developer knowledge.

---

# M9 — Cross-Platform Packaging

## Objective

Produce installable builds.

## Scope

### macOS

- packaging;
- application icon;
- installer/distributable;
- arm64 validation;
- x64 validation if supported.

### Windows

- x64 build;
- installer;
- tray validation.

### Linux

- x64 build;
- `.deb`;
- tray validation on representative desktop environment.

## Exit Criteria

Fresh-machine installation testing succeeds on all three target operating systems.

---

# M10 — MVP QA and Release

## Objective

Validate the complete product.

## Required Scenarios

### Timer

```text
start
pause
resume
stop
```

### Switching

```text
start A
switch B
stop B
```

### Recovery

```text
start
close window
restore

start
quit
relaunch
```

### Midnight

```text
interval crosses local midnight
```

### Manual Data

```text
add
edit
delete
overlap validation
```

### Task Management

```text
rename
delete
cascade
```

### Analytics

```text
7-day totals
30-day totals
weekly
monthly
top tasks
```

### Platform

```text
macOS
Windows
Linux
```

---

# 3. Recommended Specification Sequence

Each milestone should be decomposed into specs.

Suggested sequence:

```text
001 Core Time Tracking
002 Daily History
003 Task Search and Reuse
004 One-Click Task Switching
005 Manual Time Entry
006 Edit and Delete Intervals
007 Task Management
008 System Tray
009 Analytics
010 Settings and UX Polish
011 Cross-Platform Packaging and Distribution
012 MVP QA and Release Readiness
```

Some specs may be split further if implementation size becomes too large.

---

# 4. Expected Post-MVP Specification Sequence

The following specifications are expected after SPEC-012 is Verified. They are
roadmap commitments, not implementation-ready specifications: each still requires
a complete `spec.md`, companion `tasks.md`, product decisions, and acceptance
criteria before implementation may begin.

```text
013 Trusted Release Signing and Notarization
014 Data Export
015 Local Backup and Restore
016 Task Archiving
017 Global Keyboard Shortcuts
018 Automatic OS Startup
```

Unless a later validated requirement changes priority, define and implement them
in that order. SPEC-013 is the gate between the unsigned personal-testing MVP and
any claim of trusted general-public production distribution. Product enhancements
remain behind that release-hardening work.

## SPEC-013 — Trusted Release Signing and Notarization

Expected scope:

- macOS Developer ID signing, hardened runtime, notarization, and stapling;
- Windows code signing using an explicitly selected and documented provider;
- protected CI credential handling and trusted release-trigger boundaries;
- post-package and post-download signature verification;
- clean-machine Gatekeeper and Windows trust acceptance;
- publisher, homepage, and support metadata required for public distribution;
- an explicit decision on whether standalone Linux `.deb` signing is useful
  without operating a signed package repository.

Automatic updates, store publication, certificate procurement automation, and
Linux package-repository operation are not implied by this roadmap entry.

## SPEC-014 — Data Export

Expected scope:

- CSV and JSON export from authoritative Task and TimeInterval data;
- documented, versioned export schemas;
- UTC timestamp representation and deterministic ordering;
- local save-file selection through a narrow privileged boundary;
- export verification without mutating application data.

Import is not implied by export and requires a separate future specification.

## SPEC-015 — Local Backup and Restore

Expected scope:

- user-initiated local backup of the complete durable profile;
- backup format/version identification and integrity validation;
- safe restore confirmation, compatibility checks, and atomic replacement;
- rollback or non-mutation behavior when restore validation fails;
- preservation of timer and database invariants across backup and restore.

Encrypted, scheduled, and remote backup remain separate future work.

## SPEC-016 — Task Archiving

Expected scope:

- archive and unarchive without deleting a Task or its intervals;
- defined visibility in search, suggestions, history, and analytics;
- protection for the active running or paused Task;
- migrations and data-preservation behavior for existing Tasks.

## SPEC-017 — Global Keyboard Shortcuts

Expected scope:

- a minimal set of cross-platform timer commands while the window is hidden;
- platform-appropriate defaults and conflict/registration failure behavior;
- authoritative timer transitions through existing application services;
- discoverability, accessibility, and lifecycle cleanup.

Custom shortcut configuration is not implied unless the specification validates
that requirement.

## SPEC-018 — Automatic OS Startup

Expected scope:

- an opt-in, default-off setting;
- isolated platform-specific launch-at-login integration;
- startup registration failure and stale-registration handling;
- interaction with hidden-window launch, tray availability, and timer recovery;
- packaged acceptance on macOS, Windows, and the supported Linux environment.

## Later Candidates

Do not implement these during the MVP or the expected sequence above unless a
validated requirement changes scope:

- idle detection;
- optional reminders;
- projects;
- tags;
- calendar integrations;
- cloud synchronization;
- mobile companion;
- encrypted backup or synchronization.

---

# 5. Definition of Done for Every Spec

A specification is complete only when:

- acceptance criteria pass;
- domain behavior is tested;
- persistence migrations are included when needed;
- IPC contracts are typed;
- renderer errors are handled;
- no architecture boundary is violated;
- no unrelated feature is added;
- documentation is updated when behavior changes.

---

# 6. Development Rule

Do not use future roadmap requirements to over-engineer current features.

Design extension points where inexpensive.

Do not implement speculative abstractions.
