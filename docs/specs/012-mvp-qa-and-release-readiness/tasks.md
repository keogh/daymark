# SPEC-012 — Task Breakdown

## Source

- Specification: `docs/specs/012-mvp-qa-and-release-readiness/spec.md`
- Specification status: Ready for Implementation
- Last reviewed against specification: 2026-08-21

The specification is the source of truth for behavior. This file only decomposes
that behavior into implementation work. If the two conflict, update this breakdown
to match the specification.

SPEC-011 and every preceding specification must be `Verified` before implementation
of any task below begins. That external prerequisite does not change the internal
dependency order in this file.

SPEC-014 renamed the current product and release candidate to Daymark while
preserving the established `Time Tracker` profile directory and other stable
identifiers. All SPEC-012 candidate, packaged, installation, screenshot, path,
artifact, and acceptance evidence must be newly collected against Daymark; no
pre-rename visible-name evidence may be treated as current.

---

# Execution Rules

- Complete tasks in dependency order.
- Keep only one task `In Progress` unless parallel work is explicitly coordinated.
- Before implementation, copy the active task's immediate steps into
  `docs/plan.md`.
- Record verification evidence before marking a task `Complete`.
- Do not use task completion as a substitute for specification acceptance or the
  project Definition of Done.
- Never run acceptance against the owner's normal Daymark data in the
  compatibility-preserved `Time Tracker` profile directory.
- Preserve failed evidence and link passing reruns instead of rewriting history.
- Do not publish the GitHub Release from any SPEC-012 task.
- Only the owner may complete final macOS sign-off and record the final `GO`.

---

# Task Index

| ID | Task | Status | Depends on | Acceptance criteria |
| --- | --- | --- | --- | --- |
| TASK-012-001 | Establish Candidate, Evidence, and Defect Contracts | Pending | None | AC-012-001, AC-012-002, AC-012-003, AC-012-016, AC-012-019 |
| TASK-012-002 | Close Automated Regression and Traceability Gaps | Pending | TASK-012-001 | AC-012-003, AC-012-004, AC-012-007–013 |
| TASK-012-003 | Verify Integrated Persistence and Recovery Invariants | Pending | TASK-012-002 | AC-012-005–010, AC-012-013 |
| TASK-012-004 | Run the Isolated Packaged MVP Regression | Pending | TASK-012-003 | AC-012-005–013, AC-012-019 |
| TASK-012-005 | Audit Cross-Platform Candidate Evidence | Pending | TASK-012-004 | AC-012-002, AC-012-014, AC-012-019 |
| TASK-012-006 | Complete Owner macOS Apple Silicon Acceptance | Pending | TASK-012-005 | AC-012-011, AC-012-012, AC-012-015, AC-012-019 |
| TASK-012-007 | Resolve or Record Release-Blocking Defects | Pending | TASK-012-006 | AC-012-016, AC-012-017 |
| TASK-012-008 | Record Final Release Decision and Reconcile Documentation | Pending | TASK-012-007 | AC-012-001–019 |

---

# Tasks

## TASK-012-001 — Establish Candidate, Evidence, and Defect Contracts

### Status

Pending

### Outcome

The repository has one reviewable structure for exact candidate identity,
criterion-level evidence, defect classification, owner acceptance, and the final
release decision before QA execution begins.

### Dependencies

None internally.

External prerequisite: SPEC-011 and every preceding specification are `Verified`.

### Included

- Verify and record that SPEC-000 through SPEC-011 are `Verified`.
- Create the versioned SPEC-012 evidence location and templates.
- Define candidate and evidence commit fields, artifact identity, and checksum
  references.
- Inventory every acceptance criterion from SPEC-000 through SPEC-011.
- Create the criterion-level ledger with evidence type, source, applicability,
  result, reviewer/date, and defect linkage.
- Create the release-blocker/non-blocking defect register.
- Create the owner macOS Apple Silicon checklist and `GO`/`NO-GO` decision template.
- Add deterministic validation for evidence structure where a small repository
  script is justified.
- Document candidate invalidation and retained-failure behavior.

### Excluded

- executing the full regression;
- adding product behavior;
- fixing defects;
- creating native artifacts already owned by SPEC-011;
- owner sign-off;
- release publication.

### Deliverables

- Candidate identity record/template.
- Complete acceptance-criterion inventory and evidence ledger.
- Defect/deviation register.
- Owner acceptance checklist.
- Final decision template.
- Focused validator and tests if needed.

### Verification

- Confirm every earlier acceptance-criterion ID appears exactly once in the
  inventory and maps to a permitted evidence state.
- Exercise evidence validation with complete, missing, duplicate, malformed, and
  contradictory fixtures if a validator is added.
- Inspect templates for candidate/evidence commit separation and explicit actual
  tester identity.
- Confirm no personal data, secret, publication command, or real profile path is
  embedded.
- Run focused tests plus `npm run typecheck` and `npm run lint` for touched code.

### Traceability

- Acceptance criteria: AC-012-001, AC-012-002, AC-012-003, AC-012-016,
  AC-012-019
- Specification sections: 6–9, 17–21, 26, 28

### Completion Evidence

Record prerequisite statuses, inventory counts by specification, created evidence
paths, validator fixture results, and scope/privacy review when complete.

---

## TASK-012-002 — Close Automated Regression and Traceability Gaps

### Status

Pending

### Outcome

Every MVP criterion that can be proven deterministically has current, explicit
automated evidence, and the clean validation baseline passes without unresolved
flakiness.

### Dependencies

- TASK-012-001 — Establish Candidate, Evidence, and Defect Contracts.

### Included

- Audit existing unit, repository, integration, IPC/preload, renderer, packaging,
  and release-contract tests against the evidence ledger.
- Add only missing high-value regression coverage required by SPEC-012.
- Prefer connected service/disposable-SQLite coverage for cross-feature
  consistency.
- Verify calendar midnight, DST, week-start, month, average, and top-Task boundary
  cases.
- Verify manual interval and Task-management atomic failures and projections.
- Verify Settings isolation and renderer architecture/security boundaries.
- Run the complete clean automated baseline and all SPEC-011 validation commands.
- Investigate and record any flaky or order-dependent result.
- Update ledger entries with exact current evidence.

### Excluded

- duplicating already sufficient assertions at every layer;
- packaged manual acceptance;
- changing expected product behavior;
- native platform installation testing;
- suppressing or quarantining a failing required test to obtain a pass.

### Deliverables

- Focused missing regression tests and test support.
- Complete automated criterion mappings.
- Clean baseline validation record.
- Recorded blockers for any unresolved failure.

### Verification

- Run newly added focused tests first.
- Run `npm ci` from a clean checkout/dependency state.
- Run `npm run format:check`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package`.
- Run all release-contract/workflow checks required by SPEC-011.
- Confirm repeated required runs expose no unresolved flakiness where repetition is
  needed to investigate a suspect result.

### Traceability

- Acceptance criteria: AC-012-003, AC-012-004, AC-012-007, AC-012-008,
  AC-012-009, AC-012-010, AC-012-011, AC-012-012, AC-012-013
- Specification sections: 8, 10–14, 23, 24, 26, 27

### Completion Evidence

Record commands, versions, test counts, added coverage, criterion mappings,
package result, flakiness investigation, and any opened defects when complete.

---

## TASK-012-003 — Verify Integrated Persistence and Recovery Invariants

### Status

Pending

### Outcome

One deterministic connected regression proves that the complete MVP mutation and
recovery sequence preserves authoritative state, projections, and database
invariants.

### Dependencies

- TASK-012-002 — Close Automated Regression and Traceability Gaps.

### Included

- Build or extend an integration scenario over FakeClock and disposable SQLite.
- Exercise Start, Pause, Resume, switching, Stop, reuse, manual add/edit/delete,
  rename/collision/delete, Settings, and service/application reconstruction.
- Query History and Analytics after relevant mutations.
- Include local-midnight, cross-day, DST, week-start, and long-duration fixtures at
  the appropriate deterministic layer.
- Inspect Tasks, intervals, AppState, and Settings at critical checkpoints.
- Prove no duplicate normalized Task, forbidden overlap, orphan interval, mutable
  duration counter, or invalid singleton state exists.
- Exercise migrations from supported baselines as defined by the specification.
- Update the evidence ledger and defect register.

### Excluded

- Electron window or tray presentation;
- real system-clock manipulation;
- real application profiles;
- UI-only assertions already owned by renderer/package acceptance;
- a new generalized testing framework without demonstrated need.

### Deliverables

- Connected deterministic integration coverage.
- Checkpoint-level persistence evidence.
- Migration/reopen evidence.
- Updated traceability and defect records.

### Verification

- Run the connected integration scenario against a newly created disposable
  database.
- Run the scenario more than once with independent database paths to expose leaked
  state.
- Inspect persisted checkpoints for every invariant in specification §14.
- Run all affected service, repository, History, Analytics, Settings, and migration
  tests.
- Run `npm run typecheck` and `npm run lint`.

### Traceability

- Acceptance criteria: AC-012-005, AC-012-006, AC-012-007, AC-012-008,
  AC-012-009, AC-012-010, AC-012-013
- Specification sections: 9, 11, 14, 18, 24

### Completion Evidence

Record fixture clock/timezone, disposable database paths or safe identifiers,
checkpoint results, migration baselines, test counts, and defects when complete.

---

## TASK-012-004 — Run the Isolated Packaged MVP Regression

### Status

Pending

### Outcome

The packaged macOS arm64 candidate completes the connected MVP workflow in a
disposable profile with correct UI, lifecycle, accessibility, offline, security,
logging, and persisted-state behavior.

### Dependencies

- TASK-012-003 — Verify Integrated Persistence and Recovery Invariants.

### Included

- Resolve and record an isolated packaged Electron profile before launch.
- Verify exact candidate/artifact identity before testing.
- Exercise specification §11 end to end in the packaged application.
- Exercise close/hide, tray restore and commands, explicit Quit, relaunch, and
  reconstruction.
- Exercise keyboard flows, semantic state, focus, dialogs, Light/Dark appearance,
  supported minimum window, long content, and long duration presentation.
- Disconnect or block networking and repeat representative operation.
- Inspect renderer console, main-process logs, runtime network activity, window
  count, and profile writes.
- Inspect disposable SQLite state at critical checkpoints without mutating it to
  manufacture a pass.
- Record automation/manual division accurately.
- Update the evidence ledger and defect register.

### Excluded

- using the owner's real Daymark data in the compatibility-preserved `Time Tracker`
  profile directory;
- owner sign-off, which belongs to TASK-012-006;
- Windows, Linux, or Intel macOS installation runs;
- publishing the release;
- changing system-wide security or networking policy.

### Deliverables

- Complete packaged regression evidence.
- Accessibility/window/theme observations.
- Offline/network, console, log, window, and profile-isolation evidence.
- Persistence checkpoint evidence.
- Updated ledger and defect register.

### Verification

- Run the exact macOS arm64 package/DMG candidate with a recorded isolated profile.
- Complete every scenario in specification §§11–14.
- Confirm no unexpected HTTP(S)/WebSocket request or remote asset.
- Confirm no console/main-process error and exactly one restored window.
- Confirm the real application profile remains untouched.
- Recompute the artifact checksum used by the run.

### Traceability

- Acceptance criteria: AC-012-005 through AC-012-013, AC-012-019
- Specification sections: 7, 9, 11–14, 21, 25, 27

### Completion Evidence

Record artifact/checksum, OS/architecture, isolation path and validation, scenario
results, screenshots or safe observations where useful, console/log/network
results, database checkpoints, and defects when complete.

---

## TASK-012-005 — Audit Cross-Platform Candidate Evidence

### Status

Pending

### Outcome

Every native target and representative environment required by SPEC-011 has
current, attributable evidence for the exact candidate, with no owner-testing
claim beyond macOS Apple Silicon.

### Dependencies

- TASK-012-004 — Run the Isolated Packaged MVP Regression.

### Included

- Review native build, artifact, checksum, installation, tray, offline, reinstall,
  uninstall/reinstall, and applicable upgrade evidence from SPEC-011.
- Match every record to the candidate version, tag, commit, artifact, checksum,
  OS, and architecture.
- Record actual tester/service and test date for each manual environment.
- Confirm macOS arm64 and x64, Windows x64, Linux x64, and required representative
  OS versions are covered.
- Confirm CI evidence is not used as a substitute for required installation
  evidence.
- Review expected unsigned-warning, icon, native module, console, log, profile
  ownership, and data-preservation results.
- Mark missing, stale, mismatched, or unattributable evidence as a release blocker.
- Update the evidence ledger and defect register.

### Excluded

- claiming that the owner personally tested Intel macOS, Windows, or Linux;
- weakening SPEC-011's matrix because hardware is unavailable locally;
- procuring new platform hardware;
- signing/notarization;
- release publication.

### Deliverables

- Reviewed cross-platform evidence matrix.
- Candidate-to-artifact and environment traceability.
- Explicit actual tester attribution.
- Defects for every evidence gap.

### Verification

- Recompute checksums from downloaded release assets where required by SPEC-011.
- Compare all evidence metadata with candidate identity.
- Confirm every SPEC-011 environment and acceptance field has one complete record.
- Confirm the draft remains unpublished and labeled unsigned personal testing.
- Confirm all review links are safe and contain no secrets or personal Task data.

### Traceability

- Acceptance criteria: AC-012-002, AC-012-014, AC-012-019
- Specification sections: 7, 8, 13, 15, 20, 28

### Completion Evidence

Record the reviewed matrix, evidence references, tester attribution, mismatches,
checksum results, draft status, and opened blockers when complete.

---

## TASK-012-006 — Complete Owner macOS Apple Silicon Acceptance

### Status

Pending

### Outcome

The owner personally completes and signs the required hands-on acceptance of the
exact macOS arm64 candidate on Apple Silicon using only synthetic isolated data.

### Dependencies

- TASK-012-005 — Audit Cross-Platform Candidate Evidence.

### Included

- Prepare concise instructions and the exact checksummed DMG for the owner.
- Resolve a safe isolated profile and explain expected unsigned installation.
- Have the owner complete every step in specification §16.
- Capture the owner's actual result, observations, identity, date, OS version,
  architecture, artifact, and checksum outcome.
- Record failed or interrupted steps honestly.
- Link failures to the defect register without silently repairing or repeating
  them as if the first run passed.
- Update the acceptance ledger.

### Excluded

- Codex or automation impersonating owner sign-off;
- using personal Task data or the normal Daymark data in the
  compatibility-preserved `Time Tracker` profile directory;
- requiring the owner to test Intel macOS, Windows, or Linux;
- system-wide Gatekeeper disablement;
- publication or final `GO`, which belongs to TASK-012-008.

### Deliverables

- Completed owner macOS Apple Silicon checklist.
- Exact artifact/checksum and environment record.
- Owner observations and sign-off.
- Linked defect entries for failures.

### Verification

- Confirm every §16 checklist item has an explicit pass/fail result.
- Confirm the owner, date, exact OS/architecture, artifact, and checksum are
  recorded.
- Confirm the profile was isolated and contained no personal data.
- Confirm required keyboard, lifecycle, offline, settings, correction, and
  management scenarios were hands-on.
- Confirm no result claims unsupported platform ownership or testing.

### Traceability

- Acceptance criteria: AC-012-011, AC-012-012, AC-012-015, AC-012-019
- Specification sections: 9, 12, 13, 16, 19, 25, 30

### Completion Evidence

The owner records the checklist result and sign-off. Also record isolation method,
artifact checksum, scenario observations, and linked defects without personal Task
content.

---

## TASK-012-007 — Resolve or Record Release-Blocking Defects

### Status

Pending

### Outcome

Every discovered issue is classified, every allowed bounded blocker repair is
verified against rebuilt/rerun evidence, and any unresolved blocker produces an
explicit `NO-GO` input.

### Dependencies

- TASK-012-006 — Complete Owner macOS Apple Silicon Acceptance.

### Included

- Audit every failure, deviation, warning, and observation from TASK-012-001
  through TASK-012-006.
- Classify issues under specification §17.
- Link each blocker to its authoritative earlier specification and criterion.
- Implement only bounded repairs permitted by specification §18.
- Add focused regression coverage for repaired defects.
- Preserve failed evidence and add linked rerun evidence.
- Rebuild artifacts and regenerate checksums after candidate-affecting changes.
- Rerun every invalidated automated, integrated, packaged, platform, and owner
  check.
- Escalate ambiguous behavior, architectural changes, features, or broad work to
  the appropriate specification/task and retain `NO-GO` until resolved.
- Produce the final open-blocker and non-blocking-observation counts.

### Excluded

- waiving an acceptance criterion;
- reclassifying data, security, privacy, accessibility, installation, or core-flow
  failures as cosmetic;
- hiding the original failed result;
- unrelated refactoring or enhancements;
- release publication.

### Deliverables

- Complete classified defect register.
- Focused fixes and tests when permitted.
- Rebuilt candidate identity/evidence where required.
- Passing reruns or explicit unresolved blocker records.
- Final blocker and observation counts.

### Verification

- Review every issue against specification §§17–18.
- For each fix, run focused tests, the complete automated baseline, and all
  invalidated acceptance.
- Verify artifact/version/tag/commit/checksum consistency after any rebuild.
- Confirm failed and rerun evidence are both retained.
- Confirm every open blocker is carried into a `NO-GO` recommendation.

### Traceability

- Acceptance criteria: AC-012-016, AC-012-017
- Specification sections: 7, 8, 17, 18, 21, 29

### Completion Evidence

Record classifications, authoritative criteria, repairs, commits, focused/full
commands, rebuilt artifacts/checksums, rerun results, and final counts when
complete.

---

## TASK-012-008 — Record Final Release Decision and Reconcile Documentation

### Status

Pending

### Outcome

The final candidate has a complete audited evidence set and one owner-recorded
`GO` or `NO-GO` decision, while the GitHub prerelease remains draft and project
documentation accurately describes the result.

### Dependencies

- TASK-012-007 — Resolve or Record Release-Blocking Defects.

### Included

- Audit AC-012-001 through AC-012-019 directly.
- Reconfirm all prerequisite specification statuses and ledger coverage.
- Reconfirm exact candidate, artifact, evidence, checksum, and draft identity.
- Run the complete final validation baseline against the final evidence commit.
- Review cross-platform evidence, owner checklist, defects, privacy, security,
  offline operation, accessibility, and persistence integrity.
- Calculate open blocker and non-blocking observation counts.
- Present the evidence-backed recommendation to the owner.
- Have the owner record exactly one `GO` or `NO-GO` decision.
- Keep a `GO` limited to unsigned personal-testing prerelease readiness.
- Confirm the GitHub Release remains draft and unpublished.
- Update specification/task statuses, `docs/progress.md`, `docs/plan.md`, and
  relevant release documentation consistently.

### Excluded

- automatic or agent-initiated publication;
- signing/notarization or public-production claims;
- resolving an open blocker after the decision without starting a new candidate
  review;
- unrelated product or roadmap work.

### Deliverables

- Complete final evidence ledger.
- Final validation results.
- Owner-recorded `GO` or `NO-GO` decision.
- Reconciled specification, task, progress, plan, and release documentation.
- Draft unpublished prerelease confirmation.

### Verification

- Run `npm run format:check`.
- Run `npm run typecheck`.
- Run `npm run lint`.
- Run `npm test`.
- Run `npm run package`.
- Run every applicable SPEC-011 release validation command.
- Verify all ledger entries, platform records, owner checklist steps, and defect
  counts.
- Verify artifact checksums and candidate/evidence commits.
- Verify the GitHub Release is still draft and unpublished.
- Run `git diff --check`.

### Traceability

- Acceptance criteria: AC-012-001 through AC-012-019
- Specification sections: all

### Completion Evidence

Record final commands and counts, evidence audit result, candidate identity,
platform review, owner checklist, defect counts, owner decision and timestamp,
draft status, documentation changes, and final Definition of Done audit.

---

# Final Specification Verification

After all implementation tasks are complete:

- verify AC-012-001 through AC-012-019 directly;
- verify SPEC-000 through SPEC-011 remain `Verified`;
- verify every earlier acceptance criterion has attributable current evidence;
- run all validation required by specification §29 and the project Definition of
  Done;
- verify one exact candidate and no mixed-candidate evidence;
- complete the isolated packaged regression;
- review the full SPEC-011 native platform evidence;
- obtain owner macOS Apple Silicon acceptance and final decision;
- verify all persistence, recovery, accessibility, offline, security, privacy, and
  profile-isolation requirements;
- verify no release blocker remains for `GO`;
- verify residual observations are outside existing requirements and documented;
- verify a `NO-GO` cannot publish and a `GO` has not published;
- verify the GitHub prerelease remains draft and unsigned-personal-testing language
  remains prominent;
- update documentation and `docs/progress.md`;
- change the specification to `Verified` and tasks to `Complete` only when every
  required result is recorded;
- leave publication to a separate deliberate owner action and signing/notarization
  to a future specification.
