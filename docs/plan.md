# Implementation Plan

## Current Specification

SPEC-007 — Task Management

## Active Task

TASK-007-004 — Expose Validated Task Management APIs

## Status

Complete

---

# Immediate Plan

1. Extend the shared `TasksAPI` and preload bridge with explicit rename,
   delete, and deletion-summary methods and channels.
2. Register main-process handlers that exact-shape validate each input before
   delegating to `TaskService` and sanitize unexpected failures.
3. Wire all task operations through application lifecycle composition.
4. Add focused IPC and preload tests for exposure, routing, validation,
   controlled failures, and unexpected-failure sanitization.
5. Run focused boundary tests, then `npm run typecheck` and `npm run lint`.

---

# Scope Guard

No task actions control, rename dialog, delete confirmation UI, or renderer
refresh behavior in this task (TASK-007-005–006).

---

# Completion

Completion is reached when all three task-management APIs are explicitly
exposed, routed, runtime validated, and safely error-mapped with passing
focused tests, `npm run typecheck`, and `npm run lint`, and the task breakdown
records TASK-007-004 as Complete with evidence.
