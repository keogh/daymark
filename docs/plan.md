# Implementation Plan

Specification: SPEC-020 — Allow Overlapping Interval Edits

Task: TASK-020-004 — Verify Persistence, Projections, and Restart

## Status

Complete

---

# Immediate Steps

1. Add a disposable-SQLite scenario that creates overlapping closed intervals
   through editing while a timer remains running.
2. Verify additive history and analytics totals, all persisted interval records,
   and unchanged reconstructed timer state after a full database restart.
3. Verify manual creation still rejects both edit-created closed overlap and
   elapsed-open overlap without mutation.
4. Run focused projection, interval, timer reconstruction, manual-entry, and
   repository integration tests, then typecheck and lint.
