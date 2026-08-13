# Definition of Done

This Definition of Done applies to every implementation specification unless the specification explicitly adds stricter requirements.

---

# 1. Product Behavior

The implementation satisfies all acceptance criteria in the active specification.

No known acceptance criterion is intentionally skipped.

---

# 2. Scope

Only behavior required by the active specification or necessary supporting infrastructure is implemented.

No unrelated roadmap features are introduced.

---

# 3. Architecture

The implementation respects the documented architecture.

In particular:

- renderer does not access SQLite;
- renderer does not access Node.js directly;
- renderer does not access raw ipcRenderer;
- preload exposes narrow typed APIs;
- IPC handlers remain thin;
- business logic belongs in services/domain;
- persistence belongs in repositories/query modules.

---

# 4. Type Safety

TypeScript type checking passes.

Avoid introducing `any` without a justified reason.

Cross-process contracts are explicitly typed.

---

# 5. Runtime Validation

External/process-boundary input is validated at runtime where required.

Invalid input produces controlled application errors.

---

# 6. Persistence

If the feature changes persistence:

- schema is updated;
- a migration exists;
- constraints are preserved;
- existing user data remains compatible.

No production database reset is required.

---

# 7. Domain Invariants

Relevant domain invariants are protected.

Examples:

- only one open timer interval;
- valid interval timestamps;
- no forbidden interval overlap;
- valid task references.

---

# 8. Tests

All tests required by the specification exist and pass.

Tests should cover behavior, not implementation trivia.

Automated tests and test-only support code live under `test/`, with test paths
mirroring the corresponding production paths under `src/`. Tests are not
colocated with production source files.

---

# 9. Regression Safety

Existing project tests pass.

The feature does not knowingly break earlier verified specifications.

---

# 10. UI

When UI is included:

- required states exist;
- loading behavior is reasonable;
- errors are handled;
- keyboard interaction works where specified;
- visible focus is preserved;
- controls have meaningful labels.

---

# 11. Error Handling

Expected failure modes are handled.

Errors exposed to the renderer are safe and understandable.

Internal stack traces are not shown directly to the user.

---

# 12. Performance

The feature does not introduce obviously unnecessary repeated:

- database writes;
- full-table scans;
- timers;
- renderer/main IPC traffic.

Optimization beyond reasonable MVP requirements is not required.

---

# 13. Security

No privileged API is exposed unnecessarily.

Renderer input is never implicitly trusted merely because it comes from the local application.

---

# 14. Documentation

Relevant documentation reflects actual behavior.

Architecture or product decisions changed during implementation are recorded in:

    docs/decisions.md

---

# 15. Validation Commands

The project baseline should pass:

```bash
npm run typecheck
npm run lint
npm test
```

For foundation, packaging, release, or platform-related specifications:

```
npm run package
```

must also pass where required.

---

# 16. Progress

`docs/progress.md` is updated after completing the specification.

---

# 17. Final Review

Before marking the specification Verified, answer:

- Does implementation match the specification?
- Do tests demonstrate the important behavior?
- Does persistence remain valid?
- Are architecture boundaries respected?
- Is documentation accurate?
- Was unnecessary scope added?

All answers should be satisfactory before completion.
