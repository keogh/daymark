# Product Requirements Document

## Product

Daymark

## Version

MVP

## Status

Draft

---

# 1. Overview

Daymark is a lightweight local-first desktop application that allows a user to track how much time they spend on tasks.

The primary interaction is deliberately simple:

1. enter or select a task;
2. start tracking;
3. pause, resume, stop, or switch tasks;
4. review recorded work grouped by day.

Each task accumulates time across multiple work intervals and potentially across multiple days.

The application stores all information locally in SQLite and operates without an account, server, or internet connection.

---

# 2. Problem

Many time-tracking products introduce unnecessary complexity for users who only need to answer:

> What did I work on, and how much time did I spend on it?

Existing tools commonly introduce concepts such as:

- organizations;
- teams;
- clients;
- projects;
- billing;
- subscriptions;
- cloud accounts;
- permissions;
- integrations.

The MVP intentionally removes those concepts.

The application should feel closer to a stopwatch connected to a useful task history than to a project-management system.

---

# 3. Target User

The initial target user is an individual knowledge worker who wants to understand how their working time is distributed.

Typical users may include:

- software developers;
- designers;
- freelancers;
- writers;
- students;
- consultants;
- researchers;
- independent professionals.

No collaboration use case is required for the MVP.

---

# 4. Product Goals

## G1. Fast tracking

A user should be able to start working on a recent task with one click.

## G2. Accurate historical records

Every period of tracked work must be represented by explicit start and end timestamps.

## G3. Persistent tasks

Users should be able to return to previous tasks without creating duplicate records.

## G4. Useful daily history

The application should make it easy to understand what the user worked on during each day.

## G5. Recovery from mistakes

Users must be able to manually create, edit, and delete recorded intervals.

## G6. Local-first operation

The entire product must work offline.

## G7. Cross-platform desktop experience

The MVP must support:

- macOS;
- Windows;
- Linux.

## G8. Lightweight analytics

The user should be able to see basic patterns without turning the product into an analytics platform.

---

# 5. Non-Goals

The MVP will not provide:

- user accounts;
- authentication;
- cloud synchronization;
- team management;
- projects;
- tags;
- clients;
- billing;
- invoicing;
- hourly rates;
- automatic screenshots;
- employee monitoring;
- automatic idle detection;
- browser extensions;
- mobile applications;
- web applications;
- calendar synchronization;
- integrations;
- public APIs;
- shared workspaces;
- automatic startup with the operating system.

Automatic startup may be implemented after the MVP.

---

# 6. Core Concepts

## Task

A persistent activity identified primarily by its description.

Example:

    Implement authentication

A task may accumulate time over many days.

## Time Interval

A period during which the timer was actively running for one task.

Example:

    09:10 → 10:15

A task may have many intervals.

## Current Task

The task currently loaded into the timer area.

The current task may be:

- running;
- paused.

When no task is loaded, the application is idle.

## Tracking Session

A UI concept representing the period between:

    Start → Stop

Pausing and resuming does not end the tracking session.

A tracking session may therefore contain multiple time intervals.

Tracking sessions do not need to be stored as a separate domain entity in the MVP.

---

# 7. Timer State Machine

The timer has three states:

    IDLE
    RUNNING
    PAUSED

Allowed transitions:

    IDLE
      └── Start Task ──────────────> RUNNING

    RUNNING
      ├── Pause ───────────────────> PAUSED
      ├── Stop ────────────────────> IDLE
      └── Start Another Task ──────> RUNNING

    PAUSED
      ├── Resume ──────────────────> RUNNING
      ├── Stop ────────────────────> IDLE
      └── Start Another Task ──────> RUNNING

Starting another task always stops the current task first.

No confirmation dialog should be displayed during normal task switching.

---

# 8. Functional Requirements

## FR-001 — Create and Start Task

The user can enter a task description and press Start.

The description is required after trimming whitespace.

Starting creates a task when no matching task exists.

If an existing task is explicitly selected from suggestions, that task must be reused.

The product may also reuse an exact normalized description match.

Starting a task:

1. makes it the current task;
2. creates a new open time interval;
3. changes timer state to RUNNING.

---

## FR-002 — Task Suggestions

As the user types a description, the application should suggest previously used tasks.

Suggestions should prioritize recent tasks.

Each suggestion may display:

- task description;
- today's recorded duration;
- lifetime recorded duration.

Selecting a suggestion and starting must reuse the existing task.

---

## FR-003 — Pause

When the timer is running, the user can pause it.

Pause must:

1. close the current open interval;
2. keep the task as the current task;
3. preserve the current tracking session elapsed duration;
4. change timer state to PAUSED.

---

## FR-004 — Resume

When the current task is paused, the user can resume it.

Resume must:

1. create a new open interval;
2. keep the same task;
3. retain previous elapsed work from the current tracking session;
4. change timer state to RUNNING.

---

## FR-005 — Stop

When a task is running or paused, the user can stop it.

Stop must:

1. close an open interval if one exists;
2. clear the current task;
3. clear the current tracking session;
4. change timer state to IDLE.

The task itself remains available in history and suggestions.

---

## FR-006 — Switch Task

The user can press Play on another task while a task is running or paused.

The application must:

1. stop the current task;
2. close its open interval when necessary;
3. set the selected task as current;
4. create a new interval for the selected task;
5. immediately start tracking.

The interaction should require one click.

No confirmation dialog is required.

---

## FR-007 — Persistent Timer

Tracking is timestamp-based.

The application must not depend on an in-memory second counter as its source of truth.

If a running interval started at:

    10:00

and the application is reopened at:

    10:45

the tracked duration is:

    45 minutes

provided the interval was never stopped.

---

## FR-008 — Window Close

Closing the main application window must not automatically stop an active timer.

The application should remain available through the system tray.

---

## FR-009 — System Tray

The application must expose a tray/menu-bar icon.

The exact operating-system presentation may differ by platform.

The tray should provide at minimum:

    Open Daymark
    -----------------
    Current task information, when applicable
    Pause / Resume
    Stop
    -----------------
    Quit

Closing the main window hides it while keeping the application process alive.

Selecting Open restores the main window.

---

## FR-010 — Application Restart Recovery

The application must reconstruct timer state from SQLite when it launches.

Possible recovered states:

- idle;
- running;
- paused.

No tracked duration may depend on the renderer having remained active.

---

# 9. Task History

## FR-011 — History Grouped by Day

The main screen displays task activity grouped by calendar day.

Example:

    Today                                  5h 20m

    ▶ Implement authentication
      1h 45m today · 8h 30m total

    ▶ Code review
      2h 10m today · 4h 15m total

A task appears in every day on which it contains recorded time.

It is not limited to its most recent day.

---

## FR-012 — Day Total

Each day header displays the total tracked duration for that calendar day.

Example:

    Today                                  5h 20m

---

## FR-013 — Task Daily Total

Each task entry displays the amount of time attributed to that task for the selected day.

Example:

    Implement authentication
    1h 45m today

---

## FR-014 — Task Lifetime Total

Each task entry also displays the task's lifetime accumulated duration.

Example:

    1h 45m today · 8h 30m total

The lifetime value should have lower visual emphasis than the daily value.

---

## FR-015 — Expand Task Intervals

A task entry can be expanded to show the intervals contributing to that day's duration.

Example:

    ▼ Implement authentication
      1h 45m today · 8h 30m total

        09:10 → 10:15       1h 05m
        11:30 → 12:10          40m

---

# 10. Manual Time Management

## FR-016 — Add Manual Interval

The user can manually add recorded time.

Required values:

- task;
- date;
- start time;
- end time.

The user may select an existing task or create a new one.

---

## FR-017 — Edit Interval

The user can edit:

- start timestamp;
- end timestamp.

Changing an interval immediately changes all derived totals.

---

## FR-018 — Delete Interval

The user can delete a recorded interval.

Deleting an interval does not delete its task.

---

## FR-019 — Interval Validation

An interval must satisfy:

    end > start

New manually created intervals must not overlap another recorded interval. An
edit to an existing closed interval may overlap another closed interval or the
elapsed portion of the current running interval.

Overlapping records contribute additively to derived totals rather than being
collapsed into a union of wall-clock time.

The application supports only one simultaneously active tracked task.

---

# 11. Task Management

## FR-020 — Rename Task

The user can change a task description.

Historical intervals remain associated with the same task.

---

## FR-021 — Delete Task

The user can delete a task.

Deleting a task also deletes all associated intervals.

Deletion must require confirmation.

The confirmation should clearly communicate the number of recorded intervals that will be deleted.

An actively running or paused task must be stopped before it can be deleted.

---

# 12. Time Calculation Rules

## 12.1 Source of Truth

Elapsed time is calculated from interval timestamps.

For a closed interval:

    duration = endedAt - startedAt

For an open interval:

    duration = currentTime - startedAt

---

## 12.2 Daily Totals

Daily totals are calculated according to local calendar-day boundaries.

---

## 12.3 Midnight

An interval may cross midnight.

Example:

    23:30 → 00:30

The interval remains one database record.

For daily calculations it contributes:

    Day 1 = 30 minutes
    Day 2 = 30 minutes

The record must not be physically split only because it crosses midnight.

---

## 12.4 Time Zones

The MVP stores timestamps as UTC epoch milliseconds.

Daily grouping is performed using the user's current local timezone.

---

## 12.5 Operating System Sleep

Elapsed time is based on wall-clock timestamps.

Therefore, if a timer remains running while the computer sleeps, that elapsed wall-clock time is included.

Automatic idle/sleep correction is outside the MVP scope.

---

# 13. Main Timer Display

When RUNNING:

    Implement authentication

                  00:32:14
                Current session

        Today 1h 47m · Total 8h 30m

              [ Pause ] [ Stop ]

The large timer represents elapsed active time within the current tracking session.

Paused intervals do not increase that value.

When PAUSED:

    Implement authentication

                  00:45:00
                    Paused

        Today 2h 00m · Total 8h 43m

              [ Resume ] [ Stop ]

---

# 14. Analytics

Analytics is a secondary product area.

## FR-022 — Seven-Day View

Display tracked duration for each of the last seven days.

---

## FR-023 — Thirty-Day View

Display tracked duration for each of the last thirty days.

---

## FR-024 — Weekly Total

Display total tracked duration for the current calendar week.

---

## FR-025 — Monthly Total

Display total tracked duration for the current calendar month.

---

## FR-026 — Daily Average

Display average tracked duration across days in the selected analytics range.

The UI must make the denominator clear.

For the MVP:

    average = total duration / number of calendar days in range

---

## FR-027 — Top Tasks

Display tasks ranked by tracked duration for the selected analytics range.

---

# 15. Settings

The MVP settings should remain minimal.

Possible MVP settings:

- start of week:
  - Monday;
  - Sunday.
- time display:
  - `1h 45m`;
  - optional later support for decimal hours.
- theme:
  - system;
  - light;
  - dark.

Automatic launch at operating-system startup is explicitly deferred.

---

# 16. Data Ownership

All user-created data is stored locally.

The application does not require:

- authentication;
- network requests;
- telemetry;
- remote database access.

Product analytics or crash reporting must not be introduced without an explicit future product decision.

---

# 17. Performance Requirements

The application should:

- launch quickly;
- update timer presentation smoothly;
- start or switch tasks without noticeable delay;
- handle thousands of intervals without degrading normal history usage;
- calculate analytics using indexed database queries.

---

# 18. Reliability Requirements

The application must protect against:

- two open intervals existing simultaneously;
- invalid interval timestamps;
- accidental task deletion;
- timer loss after renderer reload;
- timer loss after application restart;
- totals drifting from source intervals.

---

# 19. Accessibility

The MVP should support:

- keyboard navigation;
- visible focus states;
- semantic buttons;
- sufficient text contrast;
- controls that do not rely exclusively on color;
- descriptive labels for timer controls.

---

# 20. MVP Success Criteria

The MVP is successful when a user can reliably use the application for normal daily tracking without needing an external spreadsheet or manual stopwatch.

The primary workflow must support:

    Start
      ↓
    Work
      ↓
    Pause / Resume
      ↓
    Switch Task
      ↓
    Stop
      ↓
    Review Day

The user must also be able to repair mistakes manually.

---

# 21. Post-MVP Direction

After the unsigned personal-testing MVP is verified, the expected specification
sequence is:

1. trusted release signing and notarization;
2. CSV and JSON data export;
3. local backup and restore;
4. task archiving;
5. global keyboard shortcuts;
6. opt-in automatic operating-system startup.

This ordering prioritizes a trusted public-distribution path and local data
ownership before convenience enhancements. These items are expected roadmap work,
not current requirements; each requires an implementation-ready specification and
companion task breakdown.

Potential later features include:

- idle detection;
- projects;
- tags;
- optional encrypted backup;
- Pomodoro mode;
- calendar integration;
- mobile companion app;
- optional synchronization.

None of these are requirements for the MVP.
