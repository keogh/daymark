# SPEC-014 — Daymark Product Identity

## Status

Ready for Implementation

## Purpose

Establish Daymark as the sole visible and technical product identity before the
first clear installable release.

## Context

Earlier owner-only development builds used provisional identifiers. No external
user installed those builds. The first release therefore requires no upgrade
bridge, profile import, or identifier preservation. DEC-037 supersedes the prior
approach. Daymark starts in its own profile and leaves earlier local data alone.

## In Scope

- renderer, native window, tray, error, and release presentation;
- package, executable, installer, launcher, and artifact names;
- platform identifiers, application profile, and database filename;
- typed preload global and TypeScript API name;
- CI workflow artifacts, inspectors, tests, and current documentation;
- approved icon artwork and offline/local-only behavior.

## Out of Scope

- importing, copying, moving, deleting, or migrating an earlier local profile;
- changing the database schema or migration history;
- signing, publication, networking, or automatic updates;
- moving a developer's repository checkout directory.

## Canonical Identity

```text
display name:                 Daymark
npm package name:             daymark
macOS bundle ID:              com.isaaczepeda.daymark
Windows AppUserModelID:       com.squirrel.daymark.daymark
Linux package identity:       daymark
Squirrel package identity:    daymark
profile directory:            Daymark
development profile:          Daymark Development
database filename:            daymark.sqlite
preload global:               window.daymark
preload API type:             DaymarkAPI
```

IPC and database identifiers that describe domain operations do not need branding.
Generic phrases such as “time tracker” may remain when they describe the product
category rather than a product identity.

## Profile and Persistence Behavior

A packaged launch uses the operating system's `Daymark` application-data profile
and opens `daymark.sqlite` within it. Development uses `Daymark Development`.
Startup must not inspect, import, copy, rename, or delete another profile. The
schema and Drizzle migrations remain unchanged.

Replacement, reinstall, and future forward upgrades preserve the Daymark profile
according to SPEC-011, beginning with the first Daymark release.

## Process Boundary

The preload exposes the existing narrow feature APIs at `window.daymark` using
`DaymarkAPI`. It exposes no raw Electron primitive or generic invoke/send API.
Renderer behavior remains otherwise unchanged.

## Packaging

Primary artifacts use `Daymark-{version}-{platform}-{architecture}` with their
platform-specific extension. Application names, executables, installers,
launchers, desktop entries, workflow uploads, and inspectors use the canonical
identity. Existing application and tray artwork remains approved.

## Documentation

Current documentation and active downstream specifications use the canonical
identity. Earlier product-name strings must not remain in tracked source or
documentation because this is the first clear release identity.

## Acceptance Criteria

### AC-014-001 — Presentation

Every current renderer, native desktop, tray, error, installer, launcher, and
artifact surface identifies the product as Daymark.

### AC-014-002 — Technical identity

Metadata, platform identifiers, paths, preload contracts, workflow uploads, and
inspectors use every exact canonical value.

### AC-014-003 — Clean profile

With no Daymark profile, a packaged launch creates and uses
`Daymark/daymark.sqlite` and operates locally without networking.

### AC-014-004 — No profile bridge

Startup contains no compatibility override, import, copy, rename, or migration
for a differently named application profile.

### AC-014-005 — Behavior and boundaries

Existing workflows and security boundaries remain valid through `window.daymark`.

### AC-014-006 — Packaging

The macOS arm64 package passes structural inspection with canonical metadata, an
arm64 native module, local migrations, and approved assets. Cross-platform
contracts require their corresponding Daymark identities.

### AC-014-007 — Documentation

Tracked source and documentation contain no earlier product-name identifier and
describe the clean first-release contract.

## Required Verification

- focused identity, path, preload, packaging, and workflow tests;
- full formatting, typecheck, lint, and test validation;
- macOS arm64 make and structural inspection;
- source/documentation search for earlier product identifiers;
- progress and task evidence updates.

SPEC-011 remains responsible for the complete native installation matrix.
