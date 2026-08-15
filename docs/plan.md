# Implementation Plan

## Current Specification

SPEC-003 — Task Search and Reuse

## Active Task

TASK-003-004 — Expose the Validated Task Suggestion Boundary

## Status

Complete

---

# Immediate Plan

1. Add a thin, runtime-validated task-suggestion IPC handler with safe errors.
2. Compose TaskService and its query repository in the main process.
3. Expose the narrow tasks API through preload and the public Window contract,
   preserving both timer Start variants end to end.
4. Add IPC, preload, composition, and boundary tests; run focused and full project
   validation and record evidence.

---

# Scope Guard

Do not add renderer combobox behavior, generic IPC access, active-task switching,
schema changes, or new query behavior.

---

# Completion

TASK-003-004 is complete. The main process registers one validated suggestion
channel backed by the composed TaskService and bounded SQLite query repository.
Preload exposes only `tasks.getSuggestions`, the public Window contract includes
that API, and both discriminated timer Start variants traverse the existing typed
channel. Controlled failures remain safe and unexpected failures are logged without
request content and returned as generic errors. Focused tests, formatting,
typecheck, lint, all 222 tests, and diff checks pass.
