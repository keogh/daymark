# Implementation Plan

## Current Specification

SPEC-011 — Cross-Platform Packaging and Distribution

## Active Task

TASK-011-004 — Build the Linux x64 Debian Package

## Status

In Progress — implementation and structural package verification complete; native
Ubuntu x64 installation acceptance pending

---

# Immediate Plan

1. Add the Linux x64-restricted Debian maker with approved maintainer metadata,
   launcher identity, source-owned icons, and collision-free artifact naming.
2. Add focused Forge configuration and Debian artifact/content inspection checks.
3. Document Ubuntu installation, ordinary-user launch/profile ownership, and
   removal behavior.
4. Build and inspect the package in a disposable native Ubuntu x64 environment,
   then run relevant project validation.

---

# Scope Guard

Only TASK-011-004 Linux x64 Debian packaging is included. CI workflows, release
publication, checksums, signing, repositories, RPM/AppImage/Snap/Flatpak, arm64,
application features, and database changes remain deferred.

---

# Completion

Implementation, focused checks, a disposable emulated linux/amd64 maker run, and
structural Debian inspection are complete. Native Ubuntu x64 making, Ubuntu GNOME
launcher/runtime acceptance as an ordinary disposable user, profile ownership,
removal, and profile-preservation evidence remain pending because the available
Docker daemon is Linux arm64 and the current physical host is macOS arm64.
