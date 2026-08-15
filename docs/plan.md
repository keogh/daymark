# Implementation Plan

## Current Specification

SPEC-006 — Edit and Delete Intervals

## Active Task

TASK-006-005 — Add Interval Actions and Edit Workflow

## Status

Complete

---

# Immediate Plan

1. Extend expanded history rows with accessible closed-interval Edit/Delete actions while preserving row expansion and Play/Resume behavior.
2. Add a focused edit dialog initialized from complete persisted interval bounds, with local validation, pending/error handling, and focus management.
3. Wire successful edits through the narrow preload API and refresh authoritative history and timer projections.
4. Add focused renderer and formatting coverage for cross-day values, cancellation, failures, duplicate prevention, refresh, and keyboard behavior.
5. Run focused renderer/history/timer tests, typecheck, and lint; record task evidence.

---

# Scope Guard

Do not add delete confirmation/mutation behavior, Task reassignment or management,
open-interval correction, or unrelated renderer changes.

---

# Completion

Completion is reached when TASK-006-005 provides accessible interval actions and a
complete-value edit workflow, its focused behavior is covered, and required
validation passes.

All immediate steps and checks completed on 2026-08-15.
