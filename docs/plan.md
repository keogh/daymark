# Implementation Plan

## Current Specification

SPEC-006 — Edit and Delete Intervals

## Active Task

TASK-006-003 — Implement Transactional Interval Deletion

## Status

Complete

---

# Immediate Plan

1. Add a conditional closed-interval repository deletion operation.
2. Implement transactional interval deletion with controlled failures and timer-state preservation.
3. Add focused repository, service, and disposable-SQLite integration coverage.
4. Run focused deletion and timer/history regressions, typecheck, and lint; record task evidence.

---

# Scope Guard

Do not add task deletion, soft deletion, undo, IPC registration, preload wiring, or renderer UI.

---

# Completion

Completion is reached when TASK-006-003 deletion behavior and no-mutation guarantees
are covered by focused tests and required validation passes.
