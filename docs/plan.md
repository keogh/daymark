# Implementation Plan

## Current Specification

SPEC-002 — Daily History

## Active Task

TASK-002-006 — Add Older-Page Loading and Resilient Retry

## Status

Complete

---

# Source

- Specification: `docs/specs/002-daily-history/spec.md`
- Task breakdown: `docs/specs/002-daily-history/tasks.md`

The task breakdown contains the full ordered implementation sequence. This file is
only the execution plan for the active task.

---

# Immediate Plan

1. Extend the history controller to load one older cursor at a time, append unique
   days, retain existing data on failure, and retry the failed cursor.
2. Render cursor-aware Load older, pending, compact pagination-error/Retry, and
   exhausted states while preserving focus and expanded rows.
3. Add focused controller-facing renderer tests for merging, duplicate-request
   prevention, expansion/focus preservation, retry, and exhaustion.
4. Run focused renderer tests, typecheck, lint, and formatting verification; record
   task evidence when all checks pass.

---

# Scope Guard

Do not add automatic infinite scrolling, arbitrary range selection, live
open-interval animation/synchronization, history mutation commands, or
Play/task-switching behavior in this task.

---

# Completion

TASK-002-006 is complete. Daily History now appends cursor-selected older pages
without duplicate requests or day sections, preserves loaded content and expanded
rows, keeps or deliberately transfers keyboard focus, retries failed older pages
without clearing data, and removes Load older when pagination is exhausted.
Focused renderer tests (38), the complete suite (175), typecheck, lint, formatting
verification, and the diff whitespace check passed.
