# Implementation Plan

## Current Specification

SPEC-005 — Manual Time Entry

## Active Task

TASK-005-004 — Add accessible manual-entry UI and refresh flows

## Status

Complete

---

# Immediate Plan

1. Add a shared, accessible manual-entry surface with task selection, typed task
   entry, date/time fields, pending protection, and controlled errors.
2. Wire global Timer and day-scoped Daily History entry points with the required
   local-day defaults.
3. Refresh timer and history projections authoritatively after a successful save.
4. Add focused renderer coverage for entry points, keyboard behavior, pending,
   success refresh, and controlled errors.
5. Run focused renderer tests, affected app tests, typecheck, and lint, then
   record completion evidence in the task breakdown.

---

# Scope Guard

Do not add interval editing/deletion, a separate interval page, analytics entry
flows, or changes to the established manual-time process boundary.

---

# Completion

Completion is reached when both entry points open the accessible manual-entry
surface with correct date defaults, save behavior refreshes authoritative timer
and history data, controlled failures preserve values, and focused checks pass.
