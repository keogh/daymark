# Implementation Plan

## Current Specification

SPEC-007 — Task Management

## Active Task

TASK-007-005 — Add Task Actions and Rename Workflow

## Status

Complete

---

# Immediate Plan

1. Add an accessible Task actions menu to every Daily History task-row instance.
2. Add a prefilled Rename Task dialog with local validation, cancellation,
   pending-state duplicate prevention, and controlled inline errors.
3. Wire successful rename to authoritative history and timer refreshes so every
   loaded occurrence and the active timer description update together.
4. Add focused renderer tests for menu separation, dialog focus/keyboard use,
   validation, collision and stale-target failures, pending behavior, refresh,
   and active-task rename.
5. Run focused renderer regressions, then `npm run typecheck` and `npm run lint`.

---

# Scope Guard

No deletion-summary loading, delete confirmation, or delete command behavior in
this task; those remain in TASK-007-006.

---

# Completion

Completion is reached when task rows expose the accessible actions menu, the
rename workflow satisfies TASK-007-005 behavior, authoritative refresh is
verified, focused tests and static checks pass, and the task breakdown records
TASK-007-005 as Complete with evidence.
