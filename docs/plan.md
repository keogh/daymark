# Implementation Plan

## Current Specification

SPEC-006 — Edit and Delete Intervals

## Active Task

TASK-006-002 — Implement Transactional Interval Editing

## Status

Complete

---

# Immediate Plan

1. Add closed-interval update and target-excluding overlap repository operations.
2. Implement the transactional interval update service with controlled failure and invariant preservation.
3. Add focused repository, service, and disposable-SQLite integration coverage.
4. Run focused edit and timer/history regressions, typecheck, and lint; record task evidence.

---

# Scope Guard

Do not add interval deletion, IPC registration, preload wiring, or renderer UI.

---

# Completion

Completion is reached when TASK-006-002 edit behavior and no-mutation guarantees
are covered by focused tests and required validation passes.
