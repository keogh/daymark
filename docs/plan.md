# Implementation Plan

Specification: SPEC-020 — Allow Overlapping Interval Edits

Task: TASK-020-003 — Reconcile Edit Boundary and Renderer Behavior

## Status

Complete

---

# Immediate Steps

1. Remove edit-specific overlap guidance while preserving all remaining error
   handling and entered values.
2. Add Edit dialog and Daily History coverage for successful overlapping values,
   authoritative refresh, dialog closure, and focus restoration.
3. Confirm IPC/preload validation and the public update contract remain unchanged.
4. Run focused interval boundary, renderer edit, and manual-entry regression tests
   plus typecheck and lint.
