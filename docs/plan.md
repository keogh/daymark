# Implementation Plan

## Current Specification

SPEC-003 — Task Search and Reuse

## Active Task

TASK-003-005 — Build the Accessible Idle-Task Combobox

## Status

Complete

---

# Immediate Plan

1. Add generation-safe suggestion loading and explicit-ID Start support to the
   renderer controller layer.
2. Compose the idle input as an accessible asynchronous combobox with keyboard,
   pointer, focus, Escape, blur, loading, empty, and error behavior.
3. Preserve typed-description Start and authoritative history refresh behavior.
4. Add focused interaction, stale-response, recoverable-error, and accessibility
   tests, then run renderer regressions and project validation.

---

# Scope Guard

Do not add history-row Play, active-task switching, task management, interval
management, schema changes, or a new general-purpose design-system dependency.

---

# Completion

TASK-003-005 is complete. The idle input now provides generation-safe asynchronous
suggestions with accessible combobox/listbox/option semantics, bounded rows,
duration summaries, wrapping keyboard navigation, pointer reuse, typed Start
independence, predictable close/reopen behavior, and recoverable failures. Exact-ID
Start uses the existing pending and authoritative history-refresh path. Focused
renderer tests, desktop/mobile Electron CDP QA, formatting, typecheck, lint, all 232
tests, and diff checks pass.
