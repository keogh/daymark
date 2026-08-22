# Implementation Plan

## Current Specification

SPEC-010 — Settings and UX Polish

## Active Task

TASK-010-005 — Implement Complete Light, Dark, and System Appearance

## Status

TASK-010-005 Complete

---

# Immediate Plan

1. Extract and test theme resolution/application with one bounded system media-query listener.
2. Gate primary renderer content until settings resolves and complete semantic Light/Dark tokens across existing surfaces.
3. Run focused renderer tests, rendered Light/Dark/System inspection, and project quality checks.
4. Record completion evidence in the task breakdown and this plan.

---

# Scope Guard

Only TASK-010-005 appearance resolution, bootstrap gating, semantic theme coverage,
and focused verification are included. The broader keyboard, responsive, and UX
audit remains deferred to TASK-010-006; icon work remains TASK-010-007.

---

# Completion

TASK-010-005 added explicit root preference/effective appearance state, a pure
theme resolver, one cleaned-up live System listener, system-aware bootstrap
tokens, and semantic repairs for Timer statuses, muted content, elevated surfaces,
and dialog overlays. Focused and full tests, typecheck, lint, formatting, package,
diff checks, and isolated packaged Light/Dark visual inspection passed on
2026-08-22. TASK-010-006 is the next unblocked task.
