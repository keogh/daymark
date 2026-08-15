# Implementation Plan

## Current Specification

SPEC-006 — Edit and Delete Intervals

## Active Task

TASK-006-004 — Expose Validated Interval Mutation APIs

## Status

Complete

---

# Immediate Plan

1. Add explicit update/delete IPC handlers with exact-shape runtime validation and safe error mapping.
2. Expose the typed interval APIs through preload and register the interval service in application lifecycle composition.
3. Add focused IPC, preload, and composition coverage.
4. Run focused boundary regressions, typecheck, and lint; record task evidence.

---

# Scope Guard

Do not add history actions, edit-dialog behavior, delete confirmation UI, or any broader renderer changes.

---

# Completion

Completion is reached when TASK-006-004 exposes only the narrow validated interval
mutation boundary, its composition is covered, and required validation passes.
