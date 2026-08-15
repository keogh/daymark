# Implementation Plan

## Current Specification

SPEC-003 — Task Search and Reuse

## Active Task

TASK-003-001 — Define Suggestion and Explicit-Start Contracts

## Status

Complete

---

# Immediate Plan

1. Add shared suggestion/API contracts and controlled SPEC-003 error codes.
2. Define exact-shape validators for suggestion requests and both Start variants.
3. Mechanically migrate description-based Start callers and focused tests.
4. Run focused validation/boundary tests, typecheck, and lint; record evidence.

---

# Scope Guard

Do not add suggestion queries, service behavior, IPC registration, or suggestion UI.

---

# Completion

TASK-003-001 is complete. Shared suggestion and explicit-Start contracts, controlled
errors, exact-shape validators, and mechanically migrated description callers are
covered by focused tests. Formatting, typecheck, lint, all 200 tests, and diff checks
pass. TASK-003-002 is the next unblocked task.
