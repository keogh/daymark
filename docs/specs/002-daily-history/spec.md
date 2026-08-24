# SPEC-002 — Daily History

## Status

Verified

## Milestone

M2 — Daily History

## Priority

P0

---

# 1. Objective

Display recorded work on the main screen as an accurate, accessible history grouped
by the user's local calendar day.

The history must show:

- each day's total tracked duration;
- each task's contribution to that day;
- each task's lifetime tracked duration;
- the interval portions contributing to a task on that day;
- live contributions from the currently running interval;
- older history through bounded pagination.

Daily history is a projection over Tasks and TimeIntervals. It must not create
mutable daily or task-total records.

---

# 2. User Story

As an individual user,

I want to review what I worked on each day and inspect the recorded intervals,

so that I can understand where my tracked time went without leaving the timer
screen.

---

# 3. Background

SPEC-001 established persistent Tasks, timestamp-based TimeIntervals, authoritative
timer state, and local-today and lifetime projections for the current task.

The product model defines history as a projection rather than stored aggregate
state. Calendar-day grouping uses the user's current local timezone, and a stored
interval may contribute to more than one day without being physically split.

This specification also establishes the renderer styling and component foundation
needed for Daily History. Tailwind CSS and selected source-owned shadcn/ui
components are supporting implementation infrastructure, not a reason to redesign
the verified timer experience.

---

# 4. Scope

This specification includes:

- Tailwind CSS renderer configuration;
- selective shadcn/ui initialization from the official registry;
- semantic renderer theme tokens;
- incremental migration of shared timer controls and states;
- history grouped by local calendar day;
- a day total for each rendered day;
- a daily and lifetime total for each rendered task;
- expandable task rows containing interval projections;
- local-time interval labels and interval durations;
- correct cross-midnight projection;
- inclusion and local animation of a running interval;
- an initial page containing up to 30 activity days;
- loading older activity days in additional pages;
- loading, empty, error, retry, and pagination states;
- typed history contracts across renderer, preload, IPC, and main process;
- runtime validation of history IPC input;
- repository, service, integration, and renderer tests.

---

# 5. Out of Scope

This specification does not implement:

- task search or suggestions;
- starting or switching tasks from history;
- a Play action on history rows;
- manual time entry;
- adding time from a day or expanded task;
- editing or deleting intervals;
- interval action menus;
- renaming or deleting tasks;
- analytics;
- settings;
- dark-mode selection;
- navigation to a separate history page;
- virtualized scrolling;
- arbitrary date-range selection;
- persisted expansion state;
- a general-purpose design system or wholesale visual redesign.

These behaviors belong to later specifications unless explicitly added by a future
decision.

---

# 6. Dependencies

Required earlier specification:

- SPEC-001 — Core Time Tracking, status Verified.

The existing Task and TimeInterval schema, timer service, Clock abstraction, typed
preload boundary, and AppResult error contract are reused.

---

# 7. History Projection Model

History is calculated from stored Tasks and TimeIntervals at an authoritative
snapshot time supplied by the injected Clock.

Conceptual renderer-facing contracts:

```ts
interface HistoryPageInput {
  beforeDayStartedAt?: number;
}

interface HistoryPage {
  days: HistoryDay[];
  nextBeforeDayStartedAt: number | null;
  now: number;
}

interface HistoryDay {
  dayStartedAt: number;
  dayEndedAt: number;
  totalDurationMs: number;
  tasks: HistoryTask[];
}

interface HistoryTask {
  task: {
    id: string;
    description: string;
  };
  dayDurationMs: number;
  lifetimeDurationMs: number;
  mostRecentActivityAt: number;
  intervals: HistoryInterval[];
}

interface HistoryInterval {
  id: string;
  projectedStartedAt: number;
  projectedEndedAt: number;
  durationMs: number;
  isRunning: boolean;
}
```

Names may be refined during implementation, but the public contract must preserve
the semantics in this specification.

`dayStartedAt` is inclusive and `dayEndedAt` is exclusive. They represent local
calendar boundaries as UTC epoch milliseconds.

`projectedStartedAt` and `projectedEndedAt` are clipped to the selected day's
boundaries. They do not replace or modify the original stored interval timestamps.

`now` is the authoritative snapshot time used for all open-interval projections in
the response.

---

# 8. Data Model Changes

No database schema changes are required.

Do not add:

- daily summary tables;
- cached task totals;
- split records for cross-midnight intervals;
- mutable accumulated-duration columns.

Repository queries and indexes already justified by the existing schema may be
used. If implementation demonstrates that a new index is necessary, add it through
a migration and document the reason before expanding this specification's scope.

---

# 9. Local Calendar-Day Boundaries

For each local calendar day:

```text
dayStartedAt = local midnight at the start of the day
dayEndedAt   = local midnight at the start of the next day
```

The boundary calculation must use the user's current system timezone. It must not
assume every calendar day is exactly 24 hours; daylight-saving transitions and
other local offset changes must be handled by calendar operations.

The current system timezone is applied when a history page is requested. If the
timezone changes while the application is open, a fresh initial-page load rebuilds
the projection using the new timezone. Previously loaded pagination state need not
be translated across a timezone change.

---

# 10. Interval Contribution

For a closed interval:

```text
effectiveEnd = interval.endedAt
```

For the single open interval:

```text
effectiveEnd = snapshot now
```

For a selected day:

```text
projectedStartedAt = max(interval.startedAt, dayStartedAt)
projectedEndedAt   = min(effectiveEnd, dayEndedAt)
durationMs         = max(0, projectedEndedAt - projectedStartedAt)
```

An interval contributes to the day only when `durationMs > 0`.

All totals in one response must use the same snapshot `now`.

---

# 11. Cross-Midnight Intervals

A stored interval that crosses local midnight appears in each affected activity
day.

Example stored interval:

```text
Aug 13 23:30 -> Aug 14 00:30
```

History projection:

```text
Aug 13: 23:30 -> midnight   30m
Aug 14: midnight -> 00:30   30m
```

Both projected rows retain the same interval ID. The database continues to contain
one interval.

---

# 12. Day, Task, and Lifetime Totals

For each rendered day:

```text
day.totalDurationMs = sum(day task contributions)
```

For each task on that day:

```text
task.dayDurationMs = sum(task interval contributions to that day)
```

For each task:

```text
task.lifetimeDurationMs = sum(all closed interval durations for the task)
                        + open interval duration through snapshot now, if applicable
```

A task appears once per activity day in which it has a positive contribution. A
task with no positive contribution to a day does not appear in that day.

Lifetime totals must be consistent for repeated appearances of the same task in a
single authoritative response.

---

# 13. Ordering

History uses deterministic ordering:

1. activity days are newest first;
2. Today is first even when it is empty;
3. tasks within a day are ordered by their most recent contributing activity,
   newest first;
4. task ordering ties are resolved by description using a deterministic comparison,
   then by task ID;
5. intervals within a task are ordered by projected start, earliest first;
6. interval ties are resolved by interval ID.

`mostRecentActivityAt` is the latest effective endpoint of that task's contributing
intervals in the day, bounded by the snapshot time and the day boundary.

---

# 14. History Pagination

The initial request returns:

- Today, even when Today has no tracked time; and
- up to 30 calendar days containing positive tracked activity, newest first.

Today does not consume one of the 30 activity-day slots when it is empty. When
Today contains activity, it is one of the 30 activity days.

Empty historical days are omitted.

If older activity exists, `nextBeforeDayStartedAt` identifies the exclusive local
day boundary for the next request. A subsequent request returns up to 30 older
activity days and another cursor when applicable.

The main process owns pagination semantics. The renderer must not request an
arbitrary page size.

Loading an older page must:

- retain already displayed days;
- avoid duplicate day sections;
- preserve current expansion state for already displayed rows;
- end when `nextBeforeDayStartedAt` is `null`.

---

# 15. Application Service Behavior

Introduce a history application service with an operation conceptually equivalent
to:

```ts
HistoryService.getPage(input: HistoryPageInput): HistoryPage
```

The service must:

1. obtain one authoritative `now` from the injected Clock;
2. validate or resolve the requested local-day cursor;
3. query only data needed to produce the bounded page and task lifetime totals;
4. calculate local-day interval overlap;
5. include the current open interval through `now`;
6. apply deterministic ordering;
7. return the next cursor only when older activity exists.

History reads must not mutate Tasks, TimeIntervals, or AppState.

The implementation should avoid per-task and per-row query patterns whose query
count grows linearly with the number of rendered tasks.

---

# 16. IPC Contract

Preload exposes an explicit history API:

```ts
window.daymark.history.getPage(
  input: HistoryPageInput,
): Promise<AppResult<HistoryPage>>
```

Conceptual IPC channel:

```text
history:get-page
```

The renderer must not receive generic IPC access.

`HistoryPageInput` must be runtime validated in the main process. Unknown object
properties are rejected consistently with the project's boundary-validation
strategy.

---

# 17. History Input Validation

The initial request uses:

```ts
{}
```

When present, `beforeDayStartedAt` must be:

- a finite integer;
- a safe JavaScript integer;
- a local calendar-day start for the system timezone at request time;
- no later than the start of Today.

Invalid input returns:

```text
INVALID_HISTORY_RANGE
```

It does not perform a history query or mutate application state.

---

# 18. Error Contract

Expected history failures cross IPC as AppResult values:

```ts
type HistoryErrorCode =
  | 'INVALID_HISTORY_RANGE'
  | 'INTERNAL_ERROR';
```

Unexpected database, projection, or IPC failures must be logged in the main
process and mapped to `INTERNAL_ERROR`. Internal stack traces, SQL details, and
user-created task descriptions must not be unnecessarily logged or exposed.

A history failure must not disable or replace working timer controls.

---

# 19. Renderer Layout

Daily history is part of the main Timer view, below the existing timer area.

Conceptual layout:

```text
Daymark

               current timer

----------------------------------------------------------

Today                                           5h 20m

  Implement authentication
  1h 45m today · 8h 30m total

Yesterday                                       4h 10m
  ...

                         [ Load older ]
```

The view uses normal vertical scrolling. Do not introduce a sidebar, table-heavy
dashboard, separate History route, or nested primary scroll region.

The timer remains the primary visual focus without forcing history below an
unreasonably large empty viewport.

---

# 20. Renderer States

## Initial Loading

The timer remains visible and usable. The history region shows an accessible,
low-distraction loading state.

## Loaded

Render Today followed by older activity days in descending order.

## Empty

When no interval has positive tracked duration:

```text
Today                                      0m

No tracked time yet.
Start your first task above.
```

An open interval with positive elapsed duration is history and replaces the empty
state.

## Initial Error

The history region shows:

```text
History unavailable
Your timer is still available.
[ Retry ]
```

Retry performs a fresh initial request.

## Loading Older

Already loaded history remains visible. The Load older control exposes a pending
state and cannot issue duplicate concurrent requests.

## Older-Page Error

Already loaded history remains visible. Show a compact retryable pagination error
near the Load older control.

## Exhausted

When no older cursor remains, do not render a disabled Load older control.

---

# 21. Day Labels and Duration Formatting

Day headings are formatted in the renderer using the user's locale:

```text
Today
Yesterday
Wednesday, Aug 11
Tuesday, Aug 10
```

The exact locale punctuation and month form may vary according to the platform
locale, but Today and Yesterday use those relative labels in English for the
current MVP copy.

Display formatting:

- day, daily-task, and lifetime totals use compact hours and minutes such as
  `5h 20m`;
- zero totals use `0m`;
- positive interval durations below one minute use `<1m`;
- interval start and end use locale-aware local time without seconds;
- the end of a projection at the next day's boundary is labeled `midnight` to
  avoid displaying an ambiguous next-day `00:00` within the previous day;
- live expanded interval duration uses hours and minutes rather than seconds;
- the primary timer continues to use `HH:MM:SS`.

Duration calculations retain millisecond precision even when display values are
rounded or truncated according to existing duration-formatting conventions.

---

# 22. Expandable Task Rows

Task rows are collapsed initially.

The task row header is a semantic button that:

- toggles on pointer activation, Enter, or Space;
- exposes `aria-expanded`;
- references the interval container with `aria-controls`;
- has a visible focus indicator;
- includes an accessible name containing the task description.

Multiple task rows may be expanded simultaneously.

Expansion state:

- belongs only to renderer presentation state;
- is not persisted;
- resets after renderer reload or complete application restart;
- remains intact for already loaded rows when older history is appended;
- is identified by both activity day and task ID, because a task may appear on
  multiple days.

Expanded intervals are rendered as a semantic list. Each interval exposes its
local start, local end, and contributing duration to assistive technology.

No Play, add, edit, delete, or overflow-menu control is rendered by SPEC-002.

---

# 23. Live Running History

When an interval is running, the renderer may advance only values derivable from
the authoritative snapshot:

- Today's total;
- the active task's daily total;
- the active task's lifetime total;
- the active projected interval's duration and end time.

Local animation must use the response's `now` and elapsed renderer time. It must
not write to SQLite or send per-second IPC messages.

Paused and closed intervals do not advance.

History must request a new authoritative initial page:

- after a successful Start, Pause, Resume, or Stop command;
- during the existing periodic timer reconciliation while the renderer remains
  active;
- after the application regains focus when practical;
- when local midnight changes the active interval's day projection.

A periodic refresh interval no greater than 60 seconds is sufficient. The exact
shared controller design is an implementation detail.

If reconciliation fails after history was already loaded, retain the last valid
history and expose a retryable non-destructive error rather than clearing it.

---

# 24. Tailwind CSS and shadcn/ui Foundation

The renderer adopts:

- Tailwind CSS v4;
- the official `@shadcn` registry only;
- the Radix-based Nova preset;
- Lucide icons;
- semantic theme tokens with a neutral/slate foundation and the existing blue as
  the semantic primary color;
- light appearance for SPEC-002.

Dark-mode-ready semantic tokens may be structured for later extension, but this
specification does not add a theme selector or dark-mode product behavior.

Use the existing npm package manager and `@/*` source-root alias. Initialize
shadcn/ui for the existing Vite renderer; do not scaffold a new application.

Only official components required by this specification may be added. The expected
initial set is limited to shared primitives such as:

- Button;
- Input;
- Field where required by the installed shadcn version;
- Separator;
- Skeleton or Spinner;
- Alert or Empty when useful;
- Collapsible when it improves the accessible task-row implementation.

The exact minimal set must be confirmed against the current official registry and
component documentation immediately before installation. Do not install all
components or community registry blocks.

Added component source must be reviewed and tested like application-owned code.

---

# 25. Incremental Timer Migration

As part of the renderer foundation task:

- migrate reusable Button and Input controls;
- migrate form field, loading, empty, and error primitives when the selected
  official components provide a clear fit;
- preserve existing timer semantics, labels, focus behavior, command-pending
  behavior, and visual hierarchy;
- keep the specialized timer clock and layout custom;
- avoid restyling unrelated renderer behavior.

Tailwind utilities are appropriate for layout and composition. Shared component
variants and semantic tokens own reusable color and typography styling. Feature
components must not encode product meaning with raw palette utilities such as
`text-blue-600`.

---

# 26. Accessibility Requirements

The implementation must provide:

- semantic headings for the history region and each day;
- a named history region;
- keyboard-operable expansion controls;
- visible focus for every interactive control;
- status text that does not rely on color alone;
- meaningful pending and error announcements without excessive live-region noise;
- labels for retry and pagination controls;
- sufficient semantic-token contrast;
- reduced-motion-safe loading feedback;
- no focus loss when an older page is appended;
- DOM order matching the visual day, task, and interval order.

Live duration text must not announce every visual update through an assertive live
region.

---

# 27. Performance Considerations

The initial and older-page queries are bounded to 30 activity days.

The history implementation must:

- avoid loading all history merely to render the initial page;
- avoid one query per task or interval row;
- avoid per-second IPC calls and database reads;
- calculate all open-interval values from one authoritative snapshot time;
- preserve already loaded pages while loading older data;
- remain responsive with at least several years of ordinary single-user interval
  history.

Virtualization and speculative caching are not required.

---

# 28. Security Considerations

History remains a read-only renderer capability exposed through the narrow preload
API.

The renderer must not receive:

- SQLite or Drizzle objects;
- filesystem access;
- Node.js APIs;
- raw `ipcRenderer`;
- arbitrary query construction.

History input is untrusted at the IPC boundary and must be runtime validated.

Tailwind CSS, shadcn/ui source components, Radix primitives, and icon components
must not require runtime network access. The packaged application must render the
history and its styles offline.

---

# 29. Edge Cases

The implementation must handle:

- no intervals;
- Today empty with older history present;
- exactly 30 activity days;
- more than 30 activity days;
- no older page after the initial response;
- failure of the initial history request;
- failure while loading an older page;
- repeated or stale pagination requests without duplicate rendered days;
- several intervals for the same task on one day;
- the same task appearing on several days;
- multiple tasks with the same most-recent activity timestamp;
- a closed interval ending exactly at local midnight;
- an interval beginning exactly at local midnight;
- an interval crossing one or more local midnights;
- a running interval crossing midnight while the renderer is open;
- a paused timer;
- renderer reload while running or paused;
- local calendar days affected by daylight-saving offset changes;
- task descriptions long enough to wrap;
- sub-minute positive intervals;
- an invalid or non-boundary pagination cursor;
- a system timezone change followed by a fresh history load.

Existing database invariants prevent invalid negative intervals and more than one
open interval. If invalid persisted state is nevertheless detected, fail safely,
log technical context without unnecessary user content, and return
`INTERNAL_ERROR`.

---

# 30. Acceptance Criteria

## AC-002-001 — Empty History

Given no interval has positive tracked duration,

when the initial history page loads,

then Today is rendered with `0m`, the empty-state guidance is visible, and timer
controls remain usable.

---

## AC-002-002 — History Grouped by Day

Given intervals contribute to several local calendar days,

when history loads,

then each activity day appears once in newest-first order and each task appears in
every day to which it positively contributes.

---

## AC-002-003 — Day and Task Totals

Given multiple tasks and intervals contribute to one day,

when that day is projected,

then the day total equals the sum of its task daily totals and each task daily total
equals the sum of its interval contributions.

---

## AC-002-004 — Lifetime Totals

Given one task has intervals on multiple days,

when it appears in history,

then each appearance shows the same lifetime duration calculated from all of that
task's intervals through the response snapshot.

---

## AC-002-005 — Cross-Midnight Projection

Given one stored interval runs from 23:30 to 00:30 across local midnight,

when both days are displayed,

then the interval contributes 30 minutes to each day, appears as a clipped
projection in both expanded rows, and remains one database record.

---

## AC-002-006 — Deterministic Ordering

Given several tasks and intervals contribute to a day,

when history is returned and rendered,

then tasks are ordered by most recent contributing activity and intervals are
ordered by projected start, with deterministic tie-breaking.

---

## AC-002-007 — Expand and Collapse Task Intervals

Given a collapsed task history row,

when the user activates its row header with pointer, Enter, or Space,

then its contributing intervals become visible, accessibility state is updated,
and other expanded rows remain expanded.

---

## AC-002-008 — Initial Pagination

Given more than 30 activity days exist and Today is empty,

when the initial page loads,

then Today plus the 30 newest activity days are returned and a cursor for older
activity is available.

---

## AC-002-009 — Load Older History

Given an older-history cursor exists,

when the user activates Load older,

then up to 30 older activity days are appended without duplicates or focus loss,
existing expansion state remains intact, and the control disappears after the
final page.

---

## AC-002-010 — Running History Advances Locally

Given an authoritative history snapshot contains an open interval,

when renderer time advances without a timer transition,

then the applicable current-day, task-daily, task-lifetime, and expanded interval
values advance from the snapshot without per-second IPC or database writes.

---

## AC-002-011 — Midnight Rollover While Running

Given an open interval crosses local midnight while the renderer is active,

when history reconciles after midnight,

then the prior day stops advancing, Today contains the post-midnight contribution,
and the stored interval is not split.

---

## AC-002-012 — Timer Transitions Refresh History

Given history is loaded,

when Start, Pause, Resume, or Stop succeeds,

then history obtains a new authoritative projection and displays totals consistent
with the persisted timer state.

---

## AC-002-013 — History Failure Is Isolated

Given the initial history request fails,

when the renderer displays the error,

then timer controls remain usable and Retry can load history without restarting the
application.

---

## AC-002-014 — Older-Page Failure Preserves Data

Given one or more history pages are visible,

when loading an older page fails,

then visible history and expansion state are retained and the failed page can be
retried without duplicate concurrent requests.

---

## AC-002-015 — Invalid History Input

Given malformed, unsafe, future, or non-local-midnight cursor input crosses IPC,

when the history handler validates it,

then it returns `INVALID_HISTORY_RANGE`, performs no history query or mutation, and
does not expose internal details.

---

## AC-002-016 — Timezone and DST-Safe Projection

Given intervals fall on a local calendar day whose UTC offset changes,

when history is projected,

then calendar boundaries follow the system timezone rather than assuming a
24-hour day and all contributions remain correct.

---

## AC-002-017 — Styling Foundation Preserves Timer Behavior

Given Tailwind CSS and selected official shadcn/ui primitives are introduced,

when the existing idle, running, paused, loading, and error timer states are used,

then their behavior, labels, keyboard access, focus handling, and command-pending
semantics remain consistent with verified SPEC-001 behavior.

---

## AC-002-018 — Packaged Offline Renderer

Given a packaged application with no network connection,

when the main screen opens,

then Tailwind styles, source-owned components, icons, timer states, and Daily
History render without a runtime network dependency.

---

# 31. Required Unit Tests

Unit tests must cover:

- local day-boundary construction;
- ordinary and cross-midnight interval overlap;
- exact-midnight endpoints;
- open interval projection using FakeClock;
- day, task-daily, and task-lifetime totals;
- deterministic task and interval ordering;
- pagination cursor semantics;
- a DST-shortened or DST-lengthened local calendar day using a deterministic test
  timezone;
- history input runtime validation;
- history display-duration derivation from an authoritative snapshot;
- interval and day-label formatting edge cases.

---

# 32. Required Repository Tests

Repository/query tests must use disposable SQLite databases and cover:

- bounded retrieval of intervals overlapping the required day range;
- inclusion of intervals that begin before but end inside or after the range;
- inclusion of the open interval;
- exclusion of non-overlapping intervals;
- discovery of older activity for pagination;
- task lifetime aggregation without mutating persisted data;
- stable behavior with more than 30 activity days;
- query behavior that does not execute one database query per rendered task.

Tests must never access the user's application database.

---

# 33. Required Integration Tests

Integration tests across HistoryService and disposable SQLite must cover:

- an empty database;
- several tasks across several days;
- one task repeated across days;
- several intervals for one task in one day;
- cross-midnight projection without record splitting;
- an open interval advancing under FakeClock;
- initial and older-page traversal beyond 30 activity days;
- invalid cursor rejection at the IPC boundary;
- read-only history requests leaving Tasks, TimeIntervals, and AppState unchanged;
- unexpected failures mapped to safe `INTERNAL_ERROR` results.

---

# 34. Required UI Tests

React Testing Library tests must cover:

- loading, empty, loaded, initial-error, loading-older, older-page-error, and
  exhausted states;
- Today rendered when empty but older history exists;
- day/task/interval content and hierarchy;
- compact total and interval formatting;
- task expansion with pointer and keyboard interaction;
- `aria-expanded`, `aria-controls`, semantic lists, headings, and named regions;
- multiple simultaneously expanded rows;
- expansion state preserved while appending older history;
- Load older focus preservation and duplicate-request prevention;
- retry behavior without disabling timer controls;
- local running-duration advancement and paused stability;
- successful timer commands triggering authoritative history refresh;
- timer behavior regression coverage after shared primitive migration;
- long task-description wrapping at the supported narrow renderer width.

---

# 35. Migration Tests

No database migration is expected.

If implementation demonstrates that a new index is required, this section and the
task breakdown must be updated before adding the migration.

---

# 36. Required Manual and Packaged Verification

Before marking the specification Verified:

- launch the development application and inspect the idle, running, paused, empty,
  expanded, error/retry where practical, and pagination states;
- verify keyboard navigation and visible focus;
- verify normal vertical scrolling at representative narrow and wide window sizes;
- exercise a running interval across a local-day boundary using a controlled test
  path where practical;
- package the application for the current platform;
- launch the packaged application with isolated user data;
- verify timer and history rendering while network access is unavailable;
- verify renderer reload and complete application restart while running and paused.

---

# 37. Documentation Requirements

Implementation must keep these documents consistent:

- `docs/decisions.md` for the accepted renderer styling/component decision;
- `docs/architecture/architecture.md` for the renderer technology stack;
- `docs/context.md` for the concise technology summary;
- `docs/specs/002-daily-history/tasks.md` for active-task status and evidence;
- `docs/plan.md` for the current implementation task;
- `docs/progress.md` after meaningful milestones and final verification.

Do not rewrite completed specifications merely to reflect the new renderer tooling.

---

# 38. Definition of Done

This specification is complete when:

- all acceptance criteria AC-002-001 through AC-002-018 pass;
- required unit, repository, integration, and renderer tests pass;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm run format:check` passes;
- `npm test` passes;
- `npm run package` passes for the current platform;
- packaged offline verification passes;
- existing SPEC-001 behavior remains covered and correct;
- architecture and security boundaries are respected;
- documentation matches implementation;
- no later-spec controls or behavior are introduced.

---

# 39. Implementation Notes for Codex

- Complete one unblocked task from the companion `tasks.md` at a time.
- Use the injected Clock for every authoritative history snapshot.
- Prefer a bounded set-based history query/projection over row-by-row repository
  calls.
- Keep calendar calculations explicit and deterministic in tests.
- Use the current official shadcn CLI and component documentation immediately
  before initializing or adding components; do not guess component APIs.
- Use `npx shadcn@latest` because this repository uses npm.
- Review every generated source file before accepting it.
- Keep shadcn components under the established `@/*` alias and renderer boundary.
- Do not install community registry blocks or all available components.
- Preserve source-owned component accessibility and semantic-token conventions.
- Do not add a new state-management framework for history.
