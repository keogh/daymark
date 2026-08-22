# Implementation Plan

## Current Specification

SPEC-011 — Cross-Platform Packaging and Distribution

## Active Task

TASK-011-005 — Add Native CI Builds and Artifact Validation

## Status

In Progress — implementation and local contract verification complete; hosted
native workflow run pending

---

# Immediate Plan

1. Resolve the task-breakdown dependency cycle so native CI may supply the pending
   native-host evidence for TASK-011-002 through TASK-011-004.
2. Add a read-only tag/manual-dry-run workflow with one validation gate and four
   isolated stable native build jobs.
3. Add Windows package inspection and cross-job artifact-manifest validation.
4. Add focused workflow/manifest contract tests and document runner selections.
5. Run focused and baseline repository validation; leave hosted-run evidence
   pending until the workflow is pushed and executed.

---

# Scope Guard

Only TASK-011-005 native CI building and workflow-artifact validation are included.
GitHub Release creation, checksums, signing, secrets, manual installation
acceptance, application features, and database changes remain deferred.

---

# Completion

Implemented the read-only native workflow, exact tag/SHA gate, four stable native
jobs, platform package inspection, isolated uploads, and complete-set provenance
validation. Workflow YAML parsing, 32 focused tests, all 713 project tests,
release validation, formatting, typecheck, lint, and diff checks pass locally.
The required GitHub Actions run URL/results and native artifact evidence remain
pending until this workflow is committed, pushed, and run for an existing valid
tag.
