# Implementation Plan

## Current Specification

SPEC-014 — Daymark Product Rename

## Active Task

TASK-014-006 — Establish the clean first-release Daymark identity

## Status

Complete

---

# Immediate Plan

1. Revise the specification and decision record to remove provisional-profile
   compatibility from the first-release contract.
2. Rename platform, package, profile, database, preload, workflow, source, test,
   and current documentation identities consistently to Daymark.
3. Run focused identity tests, the full project validation, macOS arm64 make, and
   structural package inspection.
4. Record verified evidence in the task breakdown and progress log.

---

# Scope Guard

No data import or migration is included. Existing local provisional-profile data
is intentionally left untouched and Daymark starts with its own fresh profile.
Publishing, signing, notarization, and moving the repository directory are
excluded.

---

# Completion

The canonical identity was updated across runtime, persistence, process boundary,
packaging, CI, tests, and documentation. All automated checks and the macOS arm64
make/inspection passed, and the tracked tree contains no earlier product-name
identifier.
