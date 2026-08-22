# Implementation Plan

## Current Specification

SPEC-010 — Settings and UX Polish

## Active Task

TASK-010-007 — Add and Package the Application Icon

## Status

TASK-010-007 Complete

---

# Immediate Plan

1. Create one source-owned, reusable application-icon master that remains recognizable at ordinary launcher sizes and is visually compatible with, but distinct from, the tray stopwatch.
2. Derive the primary-platform macOS icon asset locally and configure the existing Electron Forge packaging path to use it.
3. Run focused configuration and quality checks, package the application, and inspect the packaged icon resources plus ordinary small and large launcher renderings.
4. Confirm the packaged icon has no runtime network dependency, preserve the native tray assets unchanged, and record completion evidence.

---

# Scope Guard

Only TASK-010-007 source icon creation, primary-platform conversion, packaging
configuration, and focused verification are included. Brand-system work,
renderer redesign, tray replacement, Windows/Linux installer formats, signing,
notarization, publishing, and final packaged SPEC-010 acceptance remain deferred.

---

# Completion

TASK-010-007 added a project-authored SVG icon master, reusable 1024x1024 PNG,
and derived macOS ICNS; configured Electron Forge to package the icon; and
verified the packaged `Info.plist`, byte-identical embedded ICNS, small and large
representations, isolated application launch, local-only assets, and unchanged
tray files. Focused tests, static checks, packaging, and diff validation passed on
2026-08-22. TASK-010-008 is the next unblocked task.
