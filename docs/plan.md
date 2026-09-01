# Implementation Plan

Specification: SPEC-011 — Cross-Platform Packaging and Distribution

Task: TASK-011-008 — Verify Cross-Platform Distribution and Reconcile Documentation

## Status

In Progress — macOS/Linux Candidate Verification; Windows Deferred

---

# Immediate Steps

1. Reconcile SPEC-011 and release contracts around the approved Windows deferral.
2. Run the corrected immutable tag through all three native build jobs and draft
   prerelease assembly.
3. Verify the final release assets, tag/commit agreement, checksums, permissions,
   and draft/prerelease flags.
4. Complete the host-compatible acceptance record and collect the remaining
   required clean-system macOS Intel and Ubuntu evidence.
5. Audit AC-011-001 through AC-011-018 and reconcile task, specification,
   progress, architecture, decision, release, and acceptance documentation.
6. Rerun the complete Definition of Done validation and inspect the final diff.

---

# Current Evidence

- The first `v0.1.0` run, GitHub Actions run `33220448584`, failed safely in
  baseline lint before any native build or release assembly job ran.
- No GitHub Release was created or modified by the failed run.
- Clean `npm ci` validation passes after expressing the checksum separator as an
  explicit two-character regex quantifier.
- Candidate run `33222598544` at commit
  `9d16bd893aceae7620b7d8984ed5a6bf0bf000c9` passed baseline validation,
  macOS arm64, and Linux x64. It failed safely before artifact-set validation or
  release assembly because Windows `npm ci` and the Intel macOS make failed.
- Windows no longer fetches Electron's exact `@electron/node-gyp`
  `10.2.0-electron.1` fork through Git. A root override and regenerated lockfile
  resolve that same published version from the npm registry.
- After clean `npm ci`, all 727 tests and the local macOS x64 make/inspection
  pass. The next immutable candidate must determine whether the prior native
  Intel DMG failure was transient; it remains unresolved until hosted evidence
  passes.
- Candidate run `33236105473` at commit
  `29ddbbe4551fccb655c32950140b8de5ea0657b0` passed baseline validation and all
  three non-Windows native builds, including Intel macOS DMG creation. Windows
  still failed within `npm ci`, while the public API exposed no underlying npm
  diagnostic. The Windows install step now emits its sanitized final 80 lines as
  a failed-check annotation so a subsequent failure is actionable through the
  least-privilege public API.
- Candidate run `33237012131` exposed the remaining failure: Electron node-gyp's
  Visual Studio discovery exceeded its PowerShell child-process output buffer
  before rebuilding `better-sqlite3`. The Windows step now uses the runner's
  `vswhere.exe` to select the installed Visual Studio 2022 C++ toolchain and sets
  its explicit node-gyp inputs before clean installation.
- Candidate run `33237480382` confirmed the explicit installation path and v143
  toolset but showed that direct variables did not initialize a Windows SDK. The
  step now executes `npm ci` inside the installation's `vcvars64.bat` environment,
  which supplies compiler, SDK, and library paths while retaining the compatible
  VS 2022 identity required by Electron node-gyp.
- On 2026-08-28 the owner deferred Windows packaging and distribution to planned
  SPEC-019. The SPEC-011 workflow, artifact contract, draft notes, and acceptance
  gate now cover only macOS arm64, macOS x64, and Linux x64; retained Windows code
  is preparatory and unverified.

---

# Scope Boundary

The release remains an unsigned personal-testing draft. Publication, signing,
notarization, automatic updates, Windows distribution, exhaustive SPEC-012 QA,
and unrelated product changes remain excluded.
