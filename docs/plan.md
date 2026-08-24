# Implementation Plan

## Current Specification

SPEC-014 — Daymark Product Rename

## Active Task

TASK-014-003 — Rename Packaging Presentation and Asset References

## Status

Complete

---

# Immediate Plan

1. Rename source-owned application and tray asset files to Daymark without
   changing their bytes, and update runtime and Forge references atomically.
2. Update macOS, Windows, and Linux package inspectors to require Daymark
   display names and executables while preserving stable install identities.
3. Update focused packaging, artifact-name, release-contract, and asset tests,
   including fixed content hashes for the renamed artwork.
4. Run the focused checks, package macOS arm64, and inspect its structure.

---

# Scope Guard

Only TASK-014-003 packaging presentation, artifact contracts, package inspection,
and source-owned asset references are included. Documentation alignment, internal
symbol renames, database changes, and packaged upgrade acceptance remain deferred.

---

# Completion

Renamed all source-owned application and tray assets to Daymark with their
pre-rename bytes preserved, updated every runtime/Forge/package-inspector
reference, and aligned supported package and artifact presentation contracts.
Focused tests, typecheck, lint, formatting, release validation, macOS arm64
packaging, and structural inspection pass.
