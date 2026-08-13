# Implementation Plan

## Current Specification

SPEC-000 — Project Foundation

## Status

Not Started

---

# Objective

Create the technical foundation required to implement product features safely using the documented architecture.

---

# Planned Work

## 1. Initialize Project

- create Electron application;
- configure TypeScript;
- configure React;
- configure Vite;
- configure Electron Forge;
- configure npm scripts.

---

## 2. Establish Process Structure

Create:

    src/main/
    src/preload/
    src/renderer/
    src/shared/

Implement:

- Electron main entry;
- main application window;
- preload entry;
- React renderer entry.

---

## 3. Establish Security Boundary

Configure:

    contextIsolation = true
    nodeIntegration = false

Expose a minimal test API through contextBridge.

Verify renderer cannot directly access Node.js.

---

## 4. Add SQLite

Install and configure:

- better-sqlite3;
- Drizzle ORM.

Create database initialization.

Resolve database location through Electron main process.

---

## 5. Add Migration Infrastructure

Create:

    src/main/database/schema.ts
    src/main/database/migrations/

Create initial migration.

Create database bootstrap procedure.

---

## 6. Create Initial Schema

Add:

    tasks
    time_intervals
    app_state

Create required:

- foreign keys;
- constraints;
- indexes;
- singleton app state;
- one-open-interval unique constraint.

---

## 7. Establish Layer Structure

Create initial directories for:

- domain;
- services;
- repositories;
- queries;
- IPC handlers;
- shared contracts.

Do not implement later feature behavior.

---

## 8. Establish Typed Preload API

Implement a minimal:

    system.healthCheck()

round trip.

Renderer:

    window.timeTracker.system.healthCheck()

Main:

    IPC handler

Response:

    application/database readiness information.

This API exists only to verify architecture wiring.

---

## 9. Testing Infrastructure

Configure Vitest.

Add:

- basic domain test;
- database test;
- migration test;
- IPC/preload contract test where practical.

---

## 10. Tooling

Configure:

- linting;
- formatting;
- type checking.

Add npm commands:

    npm run dev
    npm run typecheck
    npm run lint
    npm test
    npm run package

---

## 11. Package Application

Verify Electron Forge packaging on the development platform.

Do not attempt full release/distribution configuration yet.

---

## 12. Documentation and Verification

Verify SPEC-000 acceptance criteria.

Update:

    docs/progress.md

Mark SPEC-000 status appropriately.

---

# Completion Checklist

- [ ] Application starts
- [ ] React renderer loads
- [ ] preload API works
- [ ] Node APIs unavailable to renderer
- [ ] SQLite opens successfully
- [ ] migrations run successfully
- [ ] initial schema exists
- [ ] app_state singleton exists
- [ ] tests pass
- [ ] typecheck passes
- [ ] lint passes
- [ ] package succeeds
- [ ] progress.md updated