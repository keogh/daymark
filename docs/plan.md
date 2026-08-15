# Implementation Plan

## Current Specification

SPEC-005 — Manual Time Entry

## Active Task

TASK-005-001 — Define Manual-Entry Contracts and Validation

## Status

In Progress

---

# Immediate Plan

1. Add the shared manual-entry contract module and extend shared API/error
   typing for the new validated boundary surface.
2. Implement exact-shape runtime validation for manual-entry task-source
   exclusivity, trimmed string requirements, and local date/time validity.
3. Add focused contract, validation, and preload tests for the new boundary
   definitions.
4. Run `npm test -- manual`, `npm run typecheck`, and `npm run lint`.
5. Update `docs/specs/005-manual-time-entry/tasks.md` and `docs/progress.md`
   with status and verification evidence.

---

# Scope Guard

Do not add persistence behavior, IPC registration, or renderer UI for manual
entry in this task. Keep scope limited to shared contracts, runtime validation,
and supporting tests.

---

# Completion

Completion is reached when the manual-entry contract and validator are in place,
focused tests pass, and the task breakdown/progress docs record the evidence for
`TASK-005-001`.
