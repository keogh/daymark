# Implementation Plan

Specification: SPEC-020 — Allow Overlapping Interval Edits

Task: TASK-020-002 — Allow Overlaps in the Interval Update Service

## Status

Complete

---

# Immediate Steps

1. Remove closed-range and elapsed-open conflict detection from interval updates.
2. Remove the edit-only repository query and replace its coverage with overlapping
   closed-update persistence coverage.
3. Add focused service and SQLite integration coverage for partial, containment,
   identical, cross-Task, multiple, and running-timer overlap cases.
4. Run focused interval, repository, and manual-time regression tests plus affected
   type checking.
