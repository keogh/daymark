# Implementation Plan

## Current Specification

SPEC-006 — Edit and Delete Intervals

## Active Task

TASK-006-001 — Define Correction Contracts and Validation

## Status

Complete

---

# Immediate Plan

1. Define explicit shared interval update/delete contracts, channels, and preload API types.
2. Add exact-shape runtime validators for update and delete commands, including local date-time conversion and range validation.
3. Extend controlled application error codes and add focused shared contract and validator tests.
4. Run focused tests, typecheck, and lint; record task evidence when all pass.

---

# Scope Guard

Do not add repository mutations, service transactions, IPC registration, or renderer UI.

---

# Completion

Completion is reached when shared correction contracts and validators cover the
TASK-006-001 rules and its focused verification passes.
