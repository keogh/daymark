# Implementation Plan

## Current Specification

SPEC-000 — Project Foundation

## Active Task

TASK-000-004 — Initialize and Manage the Database Lifecycle

## Status

Complete

---

# Source

- Specification: `docs/specs/000-project-foundation/spec.md`
- Task breakdown: `docs/specs/000-project-foundation/tasks.md`

The task breakdown contains the full ordered implementation sequence. This file is
only the execution plan for the active task.

---

# Immediate Plan

1. Add the central SQLite/Drizzle context, migration runner, idempotent AppState seed,
   readiness state, and production database-path resolver.
2. Wire database initialization before window creation and close the connection on
   application shutdown.
3. Add focused disposable-database tests for repeated initialization, preserved
   data, readiness, foreign keys, and clean closure.
4. Run focused and baseline validation, then record task completion evidence in
   `tasks.md`.

---

# Scope Guard

Do not add repositories, health-check IPC, product UI, timer behavior, or the later
startup-failure UI. Those outcomes belong to subsequent TASK-000 items.
