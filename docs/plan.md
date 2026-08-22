# Implementation Plan

## Current Specification

SPEC-011 — Cross-Platform Packaging and Distribution

## Active Task

TASK-011-002 — Build macOS arm64 and x64 DMG Targets

## Status

Complete

---

# Immediate Plan

1. Add the macOS-restricted Electron Forge DMG maker and explicit arm64/x64 make commands with contract-derived artifact names.
2. Add focused Forge configuration and packaged-content inspection coverage for identity, icons, ASAR/native unpacking, migrations, tray assets, renderer resources, and native architecture.
3. Document unsigned macOS installation and the supported per-application Gatekeeper override.
4. Build and inspect both macOS targets where supported, launch the host-compatible package with an isolated profile, and record verification evidence.

---

# Scope Guard

Only TASK-011-002 macOS DMG packaging is included. Windows/Linux makers, CI
workflows, release publication, checksums, signing, notarization, automatic
updates, application features, and database changes remain deferred.

---

# Completion

TASK-011-002 added the macOS-restricted Forge DMG maker, distinct contract-derived
arm64/x64 artifact names, explicit make and package-inspection commands, and
unsigned Gatekeeper guidance. Both architecture builds and structural inspections
passed on an Apple Silicon host; the arm64 app launched with a disposable profile.
Focused tests, all 698 project tests, formatting, typecheck, lint, and diff checks
passed. Native Intel-host confirmation remains assigned to TASK-011-005.
