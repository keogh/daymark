# Implementation Plan

## Current Specification

SPEC-011 — Cross-Platform Packaging and Distribution

## Active Task

TASK-011-003 — Build the Windows x64 Squirrel Installer

## Status

In Progress — implementation and local verification complete; native Windows
maker and installation acceptance pending

---

# Immediate Plan

1. Add the Windows x64-restricted Squirrel maker, source-owned ICO generation,
   stable Squirrel identity, and collision-free Setup executable name.
2. Short-circuit all Squirrel lifecycle arguments before normal initialization,
   and preserve one reachable normal installed instance.
3. Add focused configuration/startup tests and document unsigned SmartScreen
   expectations and ordinary per-user installation.
4. Run local project validation; retain native Windows maker/install verification
   for a Windows x64 host.

---

# Scope Guard

Only TASK-011-003 Windows x64 Squirrel packaging is included. Linux makers, CI
workflows, release publication, checksums, signing, automatic updates, MSI/MSIX,
machine-wide installation, application features, and database changes remain
deferred.

---

# Completion

Implementation and local verification are complete. Native Windows x64 making,
artifact inspection, ordinary-user installation, SmartScreen observation, and
installed-profile launch remain pending because the current host is macOS.
