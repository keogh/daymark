# SPEC-007 — Task Management

## Status

Draft

## Milestone

M5 — Task Management

## Priority

P0

---

# 1. Objective

Let the user rename or permanently delete a reusable Task from Daily History
without direct database access, while preserving interval history integrity,
timer state, cascading deletion of a task's intervals, and protection of the
currently active task.

---

# 2. User Story

As an individual user,

I want to rename a task or delete a task I no longer need,

so that my task list stays accurate and I am not stuck with a typo or an
abandoned task forever.

---

# 3. Background

SPEC-001 established persistent, reusable Tasks independent of calendar days.
SPEC-002 through SPEC-004 surfaced Tasks through Daily History rows, search
suggestions, and one-click switching. SPEC-005 and SPEC-006 completed interval
correction: creating, editing, and deleting individual `TimeInterval` records
without touching their Task.

This specification completes M5 by adding the two remaining Task-level
maintenance actions identified in the PRD (FR-020, FR-021) and UX design
document (§15–16): renaming a Task's description and deleting a Task together
with all of its intervals. It does not add a new primary view; Task actions
remain attached to the existing Daily History task row, consistent with the
application's two-primary-view information architecture (Timer, Analytics).

---

# 4. Scope

This specification includes:

- a Task-level actions control on each Daily History task row, distinct from
  the existing Play/Resume control and the row's expand/collapse toggle;
- a Rename action that opens a dialog prefilled with the Task's current
  description and updates it in place;
- a Delete action that opens an informative confirmation showing the Task's
  description, the number of intervals that will be removed, and the complete
  lifetime duration that will be removed;
- confirmed deletion that removes the Task and, via cascading deletion, every
  one of its intervals atomically;
- server-enforced protection against deleting the Task currently loaded as the
  active (running or paused) timer task, matching disabled Rename/Delete
  affordance in the renderer;
- rejection of a rename that would collide with a different existing Task's
  normalized description;
- authoritative refresh of every affected, currently loaded Daily History day
  and of timer state after a successful rename or deletion;
- typed contracts across renderer, preload, IPC, and main process;
- runtime validation of rename, delete, and deletion-summary commands;
- repository, service, integration, boundary, and renderer tests.

---

# 5. Out of Scope

This specification does not implement:

- a dedicated Task list/management view; Task actions remain attached to
  Daily History rows only;
- merging tasks or otherwise resolving a rename collision automatically;
- recovering visibility of a Task whose last remaining interval was deleted
  through SPEC-006 before this specification's Task actions are used on it;
- undo or trash recovery for a deleted Task or its intervals;
- bulk rename or bulk delete;
- Task notes, tags, projects, or clients (excluded globally by DEC-027);
- creating Tasks, which remains covered by SPEC-001, SPEC-003, and SPEC-005;
- editing or deleting individual intervals, which remains covered by
  SPEC-006;
- renaming or deleting a Task from Analytics, the system tray, or task
  suggestions;
- automatically stopping or altering the active timer to allow a delete that
  would otherwise be blocked.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-003 — Task Search and Reuse, status Verified;
- SPEC-004 — One-Click Task Switching, status Verified;
- SPEC-005 — Manual Time Entry, status Verified;
- SPEC-006 — Edit and Delete Intervals, status Verified.

The existing Task schema (including its `ON DELETE CASCADE` foreign key from
`time_intervals.task_id`), normalized-description matching, typed preload
boundary, `AppResult` contract, transactional database access, and Daily
History task-row rendering are reused.

---

# 7. Domain Behavior

Rename behavior:

- changes only `description`, `normalizedDescription`, and the Task's normal
  update metadata;
- preserves the Task's ID and every associated interval unchanged;
- normalizes the submitted description using the same rule as Task creation
  (`trim` and collapse whitespace, then locale-lowercase);
- is rejected when the normalized description matches a different existing
  Task, so two Tasks never become indistinguishable through renaming;
- is not rejected when the normalized description matches only the Task's own
  current value, so correcting the description's casing, spacing, or
  punctuation without changing its identity succeeds;
- must be atomic and leave persistence unchanged on failure;
- is permitted regardless of whether the Task is currently idle, running, or
  paused; renaming never mutates `AppState` or any interval.

Delete behavior:

- deletes exactly the selected Task and, through the existing cascading
  foreign key, every interval that referenced it;
- is rejected without mutation when the Task is currently loaded in
  `AppState` as the running or paused task; the user must stop that task
  before it can be deleted;
- must be atomic: the Task and its intervals are removed in a single
  transaction, never leaving orphaned intervals or a partially deleted Task;
- does not affect any other Task or interval;
- does not affect `AppState` when the deleted Task was not the active task
  (the only case in which deletion is permitted).

Reading Task deletion context:

- a narrow read operation reports the Task's current description, its
  complete interval count, and its complete lifetime duration so the renderer
  can present an informative confirmation before deletion is attempted;
- this read performs no mutation and does not itself block deletion; the
  active-task guard is enforced by the delete operation.

Because Task totals, Daily History groupings, and task suggestions are
projections over persisted Tasks and intervals, a successful rename or
deletion changes what subsequent authoritative reads return without requiring
any additional bookkeeping.

---

# 8. Data Model Changes

No database schema changes are required.

The existing `time_intervals.task_id` foreign key already declares
`ON DELETE CASCADE` (see `docs/domain/data-model.md` §7, §17). This
specification is the first feature to exercise that cascade through a direct
Task delete rather than relying on it as a latent constraint.

Do not add soft-delete columns, Task revisions, or a Task deletion log.

Existing invariants remain mandatory:

- an interval's Task reference must be valid;
- only one interval may be open globally;
- the currently loaded `AppState` Task, when set, must remain a valid Task
  reference at all times, which the active-task delete guard preserves.

---

# 9. Application Service Behavior

Add task management operations conceptually equivalent to:

```ts
interface RenameTaskInput {
  readonly taskId: string;
  readonly description: string;
}

interface DeleteTaskInput {
  readonly taskId: string;
}

interface TaskDeletionSummaryInput {
  readonly taskId: string;
}

interface TaskSummary {
  readonly id: string;
  readonly description: string;
}

interface TaskMutationResult {
  readonly task: TaskSummary;
}

interface TaskDeletionResult {
  readonly taskId: string;
}

interface TaskDeletionSummary {
  readonly task: TaskSummary;
  readonly intervalCount: number;
  readonly lifetimeDurationMs: number;
}

TaskService.rename(
  input: RenameTaskInput,
): Promise<AppResult<TaskMutationResult>>;

TaskService.delete(
  input: DeleteTaskInput,
): Promise<AppResult<TaskDeletionResult>>;

TaskService.getDeletionSummary(
  input: TaskDeletionSummaryInput,
): Promise<AppResult<TaskDeletionSummary>>;
```

Exact naming may follow established repository conventions, but the renderer
boundary must remain explicit and narrowly typed.

The rename operation must:

1. validate the full input before persistence work, reusing the established
   description shape and length rules;
2. normalize the description using the established normalization rule;
3. load the target Task within the mutation transaction;
4. reject a missing target with a controlled error;
5. reject a normalized description that matches a different existing Task
   with a controlled error, without mutation;
6. allow a normalized description that matches only the target Task's own
   current value;
7. update exactly one Task's description, normalized description, and update
   metadata, and commit once;
8. leave every interval and `AppState` unchanged;
9. return the updated Task summary.

The delete operation must:

1. validate the full input before persistence work;
2. load the target Task within the mutation transaction;
3. reject a missing target with a controlled error;
4. read `AppState` within the same transaction and reject with a controlled
   error, without mutation, when its current Task equals the target;
5. delete exactly one Task, allowing the existing cascading foreign key to
   remove its intervals, and commit once;
6. leave every other Task, every other interval, and `AppState` unchanged;
7. return the deleted Task's ID.

The deletion-summary read must:

1. validate the full input;
2. load the target Task and reject a missing target with a controlled error;
3. compute the Task's current interval count and lifetime duration using the
   established lifetime-duration projection;
4. perform no mutation.

If persisted state is invalid or a transactional invariant fails unexpectedly,
the operation must roll back, return a controlled generic failure, and log the
technical issue locally without logging user-created Task descriptions.

---

# 10. IPC Contract

Extend the existing narrow Tasks API exposed through preload:

```ts
interface TasksAPI {
  getSuggestions(
    input: TaskSuggestionInput,
  ): Promise<AppResult<TaskSuggestionPage>>;
  rename(input: RenameTaskInput): Promise<AppResult<TaskMutationResult>>;
  delete(input: DeleteTaskInput): Promise<AppResult<TaskDeletionResult>>;
  getDeletionSummary(
    input: TaskDeletionSummaryInput,
  ): Promise<AppResult<TaskDeletionSummary>>;
}
```

Conceptual IPC channels:

```text
tasks:rename
tasks:delete
tasks:get-deletion-summary
```

Do not expose raw `ipcRenderer`, generic invoke/send helpers, database
objects, or unrestricted task mutation access.

The main-process boundary must runtime-validate every command shape before
application or persistence logic executes.

---

# 11. Renderer Behavior

Each Daily History task row exposes a Task actions control, distinct from the
Play/Resume control and the row's expand/collapse toggle:

```text
▼ Implement authentication              ⋯
  1h 45m today · 8h 30m total          Rename
                                        Delete task

    09:10 – 10:15       1h 05m       ⋯
    11:30 – 12:10          40m       ⋯

    + Add time
```

`Delete task` is disabled, with a programmatically associated reason, whenever
the row's Task is the currently active (running or paused) timer task. The
server independently enforces this rule regardless of renderer state.

A Task appearing on more than one loaded Daily History day renders one Task
actions control per day-row instance, but Rename and Delete act on the single
underlying Task; a successful mutation is reflected on every loaded day that
shows it.

## Rename Surface

Rename opens a compact dialog prefilled with the Task's current description:

```text
Rename Task

[ Implement authentication ]

                         Cancel   Save
```

Rename behavior:

- Cancel closes without mutation;
- Save is disabled until the field is a syntactically valid description;
- duplicate submissions are prevented while pending;
- a controlled collision failure keeps the dialog open, preserves the entered
  text, and presents an understandable inline error inviting a different
  description;
- success closes the dialog and authoritatively refreshes history and timer
  state, so every visible occurrence of the Task shows its new description.

## Delete Surface

Delete first loads the Task's deletion summary, then opens a confirmation
dialog before making any mutation:

```text
Delete "Implement authentication"?

This will permanently delete the task and
its 17 recorded time intervals (8h 30m).

Cancel       Delete
```

Delete behavior:

- Cancel closes without mutation;
- confirmation invokes Delete once and prevents duplicate submissions while
  pending;
- a controlled failure keeps or restores actionable UI and communicates the
  failure without falsely showing success;
- success closes the confirmation and authoritatively refreshes history and
  timer state, removing the Task from every loaded day.

---

# 12. Validation

`RenameTaskInput` must be an exact plain object containing:

```text
taskId: string
description: string
```

Validation rules:

- unknown properties are rejected;
- `taskId` must be a non-empty trimmed string;
- `description` must satisfy the established Task description shape and
  length rules (trimmed, 1 to 500 Unicode code points);
- the normalized description is derived using the established normalization
  rule and compared for collision against other Tasks, excluding the target
  itself.

`DeleteTaskInput` and `TaskDeletionSummaryInput` must each be an exact plain
object containing only a valid, trimmed `taskId` string.

The service must repeat all material invariant checks inside its transaction
even when renderer and IPC validation have already passed.

---

# 13. Error Behavior

Expected controlled error codes:

- `INVALID_TASK_RENAME` — malformed rename input or an invalid description;
- `INVALID_TASK_DELETE` — malformed delete or deletion-summary input;
- `TASK_NOT_FOUND` — the target Task no longer exists (reused from the
  existing code);
- `TASK_DESCRIPTION_CONFLICT` — the normalized description matches a
  different existing Task;
- `ACTIVE_TASK_CANNOT_BE_DELETED` — the target Task is the current running or
  paused timer task;
- `INTERNAL_ERROR` — unexpected failure or invalid persisted state safely
  mapped at the boundary.

Equivalent names may be consolidated if an existing controlled code precisely
represents the behavior, but validation, missing-target, collision, and
active-task failures must remain distinguishable where the UI response
differs.

No internal stack trace, SQL detail, or user-created Task description may be
included in boundary error details or technical logs beyond what is necessary
for the visible confirmation UI.

---

# 14. Edge Cases

- Renaming a Task to its current description, or to a value that normalizes
  to the same identity with different casing or spacing, is a valid
  idempotent success; it must not be rejected as a collision with itself.
- Renaming the currently active (running or paused) Task is permitted and its
  live display updates after the authoritative refresh without altering
  timer status, session timing, or any interval.
- If another action deletes the target Task after its Rename or Delete UI
  opened, the stale command returns `TASK_NOT_FOUND` and mutates nothing.
- If the timer starts, switches to, or resumes the target Task after the
  Delete confirmation opened but before it is confirmed, the confirmed
  deletion is rejected as `ACTIVE_TASK_CANNOT_BE_DELETED` without mutation.
- Deleting a Task removes every one of its intervals regardless of how many
  Daily History days are currently loaded; only loaded days can visibly
  refresh, consistent with existing history-refresh behavior.
- A Task whose last remaining interval was previously removed via SPEC-006 no
  longer appears in Daily History and therefore has no Task actions control
  available through this specification; this is an accepted limitation (see
  Out of Scope).
- Two rapid rename submissions that would each collide with a different
  Task's normalized description are each independently rejected without
  mutating either Task.

---

# 15. Acceptance Criteria

## AC-007-001 — Daily History Task Rows Expose Rename and Delete

Given a Daily History task row is visible,

when the user opens its Task actions control,

then Rename and Delete task actions are available, distinct from the Play or
Resume control and the row's expand/collapse toggle.

## AC-007-002 — Rename Opens With Current Description

Given a Task is visible in Daily History,

when the user activates Rename,

then a dialog opens prefilled with the Task's current, complete description.

## AC-007-003 — Valid Rename Updates the Task Everywhere

Given a valid, non-colliding new description,

when the user saves,

then the Task retains its ID and every associated interval, its description
and normalized description update, and no interval or `AppState` mutation
occurs.

## AC-007-004 — Rename Excludes the Task From Its Own Collision Check

Given the user submits a description that normalizes to the Task's own
current value,

when the user saves,

then the rename succeeds and is not rejected as a collision with itself.

## AC-007-005 — Rename Collision Is Rejected Without Mutation

Given the submitted description normalizes to match a different existing
Task,

when the user attempts to save,

then the rename is rejected as `TASK_DESCRIPTION_CONFLICT`, the entered text
remains available for correction, and no Task is mutated.

## AC-007-006 — Delete Requires an Informative Confirmation

Given a Task is visible in Daily History,

when the user activates Delete,

then no mutation occurs until a confirmation identifies the Task's
description, its complete interval count, and its complete lifetime duration,
and the user confirms Delete.

## AC-007-007 — Confirmed Delete Cascades to All Intervals

Given the user confirms deletion of an existing Task,

when deletion succeeds,

then the Task and every one of its intervals are removed, while every other
Task, interval, and `AppState` remain unchanged.

## AC-007-008 — The Active Task Cannot Be Deleted

Given a Task is currently loaded in `AppState` as the running or paused
timer task,

when the user attempts to delete it through the renderer control or a forged
delete command,

then the Task actions control shows Delete as disabled and, independently,
the boundary command returns `ACTIVE_TASK_CANNOT_BE_DELETED` without
mutation.

## AC-007-009 — Renaming the Active Task Is Allowed

Given a Task is currently loaded in `AppState` as the running or paused
timer task,

when the user renames it successfully,

then the new description is reflected in the current timer display after
authoritative refresh, and timer status, session timing, and every interval
remain unchanged.

## AC-007-010 — Missing Targets Fail Safely

Given a Task was deleted after its Rename or Delete UI opened,

when the stale command is submitted,

then the operation returns `TASK_NOT_FOUND`, communicates the failure, and
creates or mutates nothing.

## AC-007-011 — Successful Mutations Refresh Every Loaded Occurrence

Given a rename or deletion succeeds and the affected Task appears on more
than one currently loaded Daily History day,

when the renderer handles the result,

then every loaded day showing that Task, along with timer state, refreshes
from authoritative APIs to reflect the change consistently.

## AC-007-012 — Boundary Inputs Are Runtime Validated

Given malformed, incomplete, or extra-property rename, delete, or
deletion-summary input crosses the renderer boundary,

when the corresponding API is invoked,

then the command is rejected with its controlled validation error before
service mutation logic executes.

## AC-007-013 — Task Management UI Is Keyboard Accessible

Given Task actions or a rename/delete dialog is visible,

when the user navigates by keyboard or assistive technology,

then all controls are labeled, reachable, visibly focusable, and operable
without a pointer, dialog focus is managed, the disabled state of Delete for
the active Task is programmatically communicated, and status is not
communicated only by color.

---

# 16. Required Unit Tests

- exact-shape runtime validation for rename, delete, and deletion-summary
  inputs, including malformed IDs, unknown properties, and invalid
  descriptions;
- service rename behavior for valid, self-collision-excluded, missing-target,
  and different-Task-collision cases;
- service delete behavior for valid, missing-target, and active-task cases;
- service deletion-summary behavior for valid and missing-target cases;
- no-mutation behavior for every controlled failure;
- controlled mapping of invalid persisted state and unexpected failures.

---

# 17. Required Repository Tests

- rename exactly one Task's description and normalized description while
  preserving its ID and every associated interval;
- reject or safely fail a rename colliding with a different Task's normalized
  description;
- delete exactly one Task and, through the existing foreign key, all of its
  intervals, without affecting other Tasks or intervals;
- reject or safely fail deletion targeting a missing Task or the current
  `AppState` Task;
- compute an accurate interval count and lifetime duration for the
  deletion-summary read;
- transaction rollback when rename or delete persistence fails.

---

# 18. Required Integration Tests

- disposable-SQLite rename flow through service and repository, including a
  Task visible across multiple Daily History days;
- disposable-SQLite delete flow proving cascading interval removal and
  updated day/lifetime projections;
- active-task delete rejection without `AppState` mutation, including a
  paused Task;
- rename of the currently active Task reflected in authoritative timer state
  without altering timer status or session timing;
- preload and IPC tests proving all three explicit APIs are exposed, routed,
  runtime validated, and safely error-mapped.

---

# 19. Required UI Tests

- Task actions control discoverability, and its independence from the
  Play/Resume control and the expand/collapse toggle;
- disabled Delete state, with an accessible reason, for the active Task;
- rename dialog prefill, cancel, pending state, duplicate-submission
  prevention, controlled collision-failure value preservation, and successful
  close-and-refresh behavior;
- deletion-summary loading, informative confirmation content, cancel
  behavior, pending state, controlled failure behavior, and successful
  close-and-refresh behavior;
- consistent refresh of a renamed or deleted Task across every loaded day
  that shows it;
- keyboard operation, labels, focus management, visible focus, and
  non-color-only status communication.

---

# 20. Migration Tests

Not applicable. No schema migration is required.

---

# 21. Security Considerations

- Renderer code uses only the explicit preload Tasks APIs.
- Main-process handlers runtime-validate exact command shapes.
- Task existence, collision, and active-task invariants are checked
  authoritatively inside the transaction, not merely inferred from renderer
  state.
- Expected failures return controlled errors without stack traces or SQL
  details.
- Technical logs avoid user-created Task descriptions.

---

# 22. Performance Considerations

- The deletion-summary read uses one bounded, indexed query per Task; it must
  not load the complete database into the renderer.
- Rename and delete each perform one bounded transaction and one
  authoritative UI refresh, not repeated writes or per-second work.
- Cascading interval deletion is performed by the existing database foreign
  key, not by deleting intervals individually from application code.
- No cached totals are introduced; projections remain query-derived.

---

# 23. Accessibility Requirements

- The Task actions control exposes a name that identifies the Task and is
  reachable and operable by keyboard.
- The disabled Delete state for the active Task is exposed through
  `aria-disabled` (or equivalent) and an accessible description, not through
  visual styling alone.
- Menus and dialogs support keyboard opening, traversal, activation, and
  Escape or Cancel behavior.
- Modal focus moves into the dialog, remains contained while open, and
  returns to the invoking control when practical.
- Validation and mutation errors are programmatically associated with the
  relevant field or surface.
- Pending and error states are communicated through text or semantics, not
  color alone.

---

# 24. Definition of Done

This specification is complete when:

- all acceptance criteria pass;
- required unit, repository, integration, boundary, and UI tests pass;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes;
- packaged-app smoke verification covers renaming a Task, a rejected rename
  collision, deleting a non-active Task with cascading interval removal, and
  a disabled/rejected delete attempt on the active Task;
- architecture boundaries are respected;
- documentation and `docs/progress.md` match implementation;
- no unrelated features are added.

---

# 25. Implementation Notes for Codex

Prefer extending the existing `normalizeTaskText`, `AppResult`, history
refresh, dialog, and transaction patterns where their semantics match. Reuse
the established Task description validation rules rather than duplicating
them.

Do not reimplement cascading interval deletion in application code; rely on
the existing `ON DELETE CASCADE` foreign key and verify it with a repository
test.

Keep interval-level editing and deletion out of scope; this specification
only mutates Task records. Do not introduce a Task selector, notes field, or
any field beyond `description`.

Prefer the smallest implementation satisfying this specification. If an
architectural conflict is discovered, document it before changing
architecture.
