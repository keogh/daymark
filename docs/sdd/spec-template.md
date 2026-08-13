# SPEC-XXX — Feature Name

## Status

Draft

## Milestone

M?

## Priority

P0 / P1 / P2

---

# 1. Objective

Describe the single primary outcome of this specification.

---

# 2. User Story

As a ...

I want ...

so that ...

---

# 3. Background

Provide only context necessary to understand this feature.

Do not duplicate the full PRD.

---

# 4. Scope

This specification includes:

- ...

---

# 5. Out of Scope

This specification does not include:

- ...

---

# 6. Dependencies

Required earlier specifications:

- SPEC-...

Or:

    None

---

# 7. Domain Behavior

Define relevant domain behavior.

---

# 8. Data Model Changes

Describe:

- new tables;
- new columns;
- indexes;
- constraints;
- migrations.

If none:

    No database changes.

---

# 9. Application Service Behavior

Define required application operations.

Example:

    TaskService.renameTask(...)
    TimerService.switchTask(...)

---

# 10. IPC Contract

Define renderer-facing APIs.

Example:

```ts
interface FeatureAPI {
  action(input: Input): Promise<Result>;
}
```

# 11. Renderer Behavior

Describe required states and interactions.

Use simple text wireframes when useful.

---

# 12. Validation

Define:

- accepted inputs;
- invalid inputs;
- domain constraints;
- expected error codes.

---

# 13. Error Behavior

Define expected application errors.

---

# 14. Edge Cases

Examples:

- empty data;
- application restart;
- duplicate command;
- midnight;
- deleted records;
- invalid persisted state.

---

# 15. Acceptance Criteria

## AC-001 — Name

Given:

```
...
```

When:

```
...
```

Then:

```
...
```

---

## AC-002 — Name

Given:

```
...
```

When:

```
...
```

Then:

```
...
```

---

# 16. Required Unit Tests

- ...

---

# 17. Required Repository Tests

- ...

Or:

```
None.
```

---

# 18. Required Integration Tests

- ...

---

# 19. Required UI Tests

- ...

---

# 20. Migration Tests

- ...

Or:

```
Not applicable.
```

---

# 21. Security Considerations

Describe process-boundary or privileged-operation concerns.

If none:

```
No additional security concerns beyond the project architecture.
```

---

# 22. Performance Considerations

Describe expected data volume or query behavior.

Do not optimize prematurely.

---

# 23. Accessibility Requirements

- ...

---

# 24. Definition of Done

This specification is complete when:

- all acceptance criteria pass;
- required tests pass;
- TypeScript type checking passes;
- linting passes;
- architecture boundaries are respected;
- documentation matches implementation;
- no unrelated features are added.

---

# 25. Implementation Notes for Codex

Prefer the smallest implementation satisfying this specification.

Do not expand scope.

If the specification conflicts with an architectural decision, document the conflict before changing architecture.

After this specification reaches `Ready for Implementation`, generate its companion
`tasks.md` from `docs/sdd/tasks-template.md` before implementation begins.
