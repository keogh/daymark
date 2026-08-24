# Project Context

## Product

Daymark

## Stage

MVP development.

## Product Type

Cross-platform desktop application.

## Supported Platforms

- macOS
- Windows
- Linux

---

# Problem

The product is intended for individuals who want a simple answer to:

> What did I work on and how much time did I spend on it?

Many existing time-tracking applications include concepts that are unnecessary for this use case:

- accounts;
- organizations;
- teams;
- clients;
- billing;
- projects;
- cloud synchronization.

Daymark intentionally avoids this complexity.

---

# Core Experience

The primary workflow is:

    Enter or select task
            ↓
          Start
            ↓
           Work
            ↓
      Pause / Resume
            ↓
       Switch or Stop
            ↓
       Review History

Starting or switching work should normally require one action.

---

# Core Domain

A Task is a persistent reusable activity.

Example:

    Implement authentication

A Task can be worked on across many different days.

Actual tracked work is stored as TimeIntervals.

Example:

    Task: Implement authentication

    09:00 → 09:45
    10:00 → 10:20
    14:10 → 15:00

The total duration of the Task is calculated from those intervals.

The application must never use a mutable task duration counter as its source of truth.

---

# Timer Semantics

The timer supports:

    idle
    running
    paused

Pause closes the current interval but keeps the task loaded.

Resume creates another interval for the same task.

Stop closes the tracking session and returns the UI to idle.

If the user starts another task while a task is active, the existing task is stopped and the new task begins immediately.

---

# Daily History

History is grouped by calendar day.

A Task appears on every day where it contains tracked time.

Example:

    Today                              5h 20m

    Implement authentication
    1h 45m today · 8h 30m total

The first value represents the selected day's contribution.

The second value represents the Task's lifetime accumulated duration.

---

# Manual Corrections

Users must be able to:

- add time manually;
- edit intervals;
- delete intervals.

This exists because users may:

- forget to start the timer;
- forget to stop the timer;
- record an incorrect period.

Manual intervals must not overlap other tracked intervals.

---

# Analytics

Analytics is intentionally secondary.

MVP analytics includes:

- last 7 days;
- last 30 days;
- time per day;
- total time;
- daily average;
- current week total;
- current month total;
- top tasks.

No productivity scoring is required.

---

# Desktop Behavior

The application includes a system tray/menu-bar integration.

Closing the main window hides it.

Closing the window does not stop an active timer.

The tray allows:

- open application;
- inspect current task;
- pause/resume;
- stop;
- quit.

Explicit application exit does not modify the timer interval.

If the application is restarted while a timer was running, elapsed time is reconstructed using persisted timestamps.

---

# Local-First Model

The application requires no network connection for normal use.

All data is stored locally in SQLite.

There is no:

- backend;
- authentication;
- account;
- remote API;
- cloud database;
- synchronization.

---

# Technology

The intended stack is:

    Electron
    TypeScript
    React
    Tailwind CSS
    selective source-owned shadcn/ui components
    Vite
    Electron Forge
    SQLite
    better-sqlite3
    Drizzle ORM

Testing:

    Vitest
    React Testing Library

---

# Architecture Summary

    React Renderer
          ↓
    Typed Preload API
          ↓
          IPC
          ↓
    Electron Main
          ↓
    Application Services
          ↓
    Domain Logic
          ↓
    Repositories / Queries
          ↓
        SQLite

SQLite exists only in the Electron main process.

---

# Product Philosophy

The application should remain:

- fast;
- simple;
- calm;
- private;
- reliable;
- understandable.

Avoid feature expansion until the core tracking workflow has been validated.

After the MVP release-readiness gate, the expected post-MVP sequence begins with
trusted release signing and notarization, followed by data export, local backup
and restore, Task archiving, global keyboard shortcuts, and opt-in automatic OS
startup. These are roadmap expectations only until each has an explicit
implementation-ready specification under `docs/specs/`.
