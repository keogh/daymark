# Implementation Plan

## Current Specification

SPEC-014 — Daymark Product Rename

## Active Task

TASK-014-001 — Establish the Daymark Identity and Profile-Compatibility Contract

## Status

Complete

---

# Immediate Plan

1. Centralize the visible Daymark name and preserved technical identifiers.
2. Resolve the packaged and development profile paths to the established Time
   Tracker profile before database initialization.
3. Update canonical package metadata and focused identity, package, release, and
   path tests.
4. Run the focused verification commands and `npm run typecheck`.

---

# Scope Guard

Only TASK-014-001 identity, metadata, and deterministic profile compatibility are
included. Renderer/tray copy, asset filenames, package inspectors, documentation
alignment, database migration, and packaged acceptance remain deferred.

---

# Completion

Implemented the shared Daymark/stable-identifier contract, canonical package
metadata, deterministic established-profile resolution before database startup,
and direct contract use by database and preload boundaries. Seven focused test
files (40 tests), release validation, typecheck, formatting, and diff checks pass.
