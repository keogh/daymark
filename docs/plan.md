# Implementation Plan

## Current Specification

SPEC-005 — Manual Time Entry

## Active Task

TASK-005-003 — Expose the validated manual-entry boundary

## Status

In Progress

---

# Immediate Plan

1. Register the explicit manual-time IPC handler with runtime input validation
   and sanitized error mapping.
2. Wire the handler into application lifecycle composition and keep the preload
   surface narrow.
3. Add focused manual-time IPC coverage plus preload/boundary regression checks.
4. Run the focused test subset plus `npm run typecheck` and `npm run lint`.
5. Update `docs/specs/005-manual-time-entry/tasks.md` and `docs/progress.md`
   with status and verification evidence.

---

# Scope Guard

Do not add renderer UI or refresh flows in this task. Keep scope limited to the
validated preload/IPC boundary, composition wiring, and supporting tests.

---

# Completion

Completion is reached when manual interval creation is exposed through one
validated preload/IPC boundary, expected failures remain controlled, focused
tests pass, and the task breakdown/progress docs record the evidence for
`TASK-005-003`.
