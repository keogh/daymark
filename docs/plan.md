# Implementation Plan

## Current Specification

SPEC-004 — One-Click Task Switching

## Active Task

TASK-004-001 — Define switch command contracts and validation

## Status

Complete

---

# Immediate Plan

1. Add the shared switch command contract and controlled `INVALID_SWITCH_TASK`
   error typing without changing timer behavior.
2. Add exact-shape runtime validation for `SwitchToTaskInput` with focused shared
   tests.
3. Run focused validation/contract tests plus `npm run typecheck` and
   `npm run lint`.

---

# Scope Guard

Do not implement timer switch branches, IPC registration, preload exposure, or
renderer history-row controls in this task.

---

# Completion

TASK-004-001 is complete. The shared timer contract now includes
`SwitchToTaskInput` and the `timer:switch-to-task` channel constant,
`INVALID_SWITCH_TASK` is a controlled application error, and exact-shape runtime
validation for switch input is covered by focused shared tests. Validation ran
with `npm test -- switch-to-task app-result task-description`,
`npm run typecheck`, and `npm run lint`.
