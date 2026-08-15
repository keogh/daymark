# Implementation Plan

## Current Specification

SPEC-004 — One-Click Task Switching

## Active Task

TASK-004-003 — Expose the validated switch boundary

## Status

Complete

---

# Immediate Plan

1. Extend the shared timer contract and preload API with an explicit
   `switchToTask(...)` method bound to `timer:switch-to-task`.
2. Register the validated switch IPC handler so malformed input is rejected at
   the boundary and valid requests delegate to `TimerService.switchToTask(...)`.
3. Add focused preload and timer IPC tests, then run the task verification
   commands plus `npm run typecheck` and `npm run lint`.

---

# Scope Guard

Do not implement renderer history-row controls or broader timer UI changes in
this task.

---

# Completion

TASK-004-003 is complete. The timer preload/API surface now exposes
`switchToTask(...)`, and the explicit `timer:switch-to-task` IPC handler
validates boundary input before delegating to `TimerService.switchToTask(...)`
with existing renderer-safe error sanitization. Focused preload and timer IPC
tests passed alongside `npm run typecheck` and `npm run lint`.
