# Implementation Plan

## Current Specification

SPEC-011 — Cross-Platform Packaging and Distribution

## Active Task

TASK-011-006 — Assemble a Checksummed Draft GitHub Prerelease

## Status

Implementation Complete — Hosted Evidence Pending

---

# Immediate Plan

1. Add deterministic final-file assembly plus SHA-256 generation and verification.
2. Add a tag-only, least-privilege job that creates or updates one unpublished
   draft prerelease after every native build succeeds.
3. Add complete unsigned-testing release notes and focused failure-path tests.
4. Run focused and baseline validation, then record local versus hosted evidence.

---

# Scope Guard

Manual publication, signing, notarization, and fresh-install acceptance remain
excluded. The workflow may create only a draft prerelease for a tag push; a manual
dry run must not receive write permission or create a release.
