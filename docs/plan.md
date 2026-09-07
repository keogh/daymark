# Implementation Plan

Specification: SPEC-008 — System Tray and Window Lifecycle

Task: TASK-008-007 — Correct Native Application Quit Ordering

## Status

Complete

---

# Immediate Steps

1. Register the existing shutdown coordinator for Electron's `before-quit`
   event while retaining idempotent `will-quit` cleanup.
2. Add a focused regression test that follows native quit ordering and proves
   the main-window close is not converted into Hide.
3. Run focused lifecycle tests, baseline validation, macOS arm64 packaging, and
   the packaged Command-Q workflow.
4. Record verification evidence and reconcile task/progress status.
