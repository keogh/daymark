# SPEC-008 — System Tray and Window Lifecycle

## Status

Verified

## Milestone

M6 — System Tray

## Priority

P0

---

# 1. Objective

Allow Daymark to remain unobtrusive while tracking by keeping the
application available through a native system tray/menu-bar item, exposing the
essential timer controls there, and making window close, restore, and explicit
quit behavior reliable and distinct.

---

# 2. User Story

As an individual user,

I want to hide the main window and control the active timer from the system
tray,

so that I can continue tracking without keeping Daymark visible and can
return to the complete application whenever I need it.

---

# 3. Background

SPEC-001 established persistent idle, running, and paused timer state backed by
SQLite timestamps. It also established restart reconstruction, so a running
timer does not depend on a window or even the application process remaining
alive. SPEC-002 through SPEC-007 added history and correction workflows in the
renderer without changing that source of truth.

DEC-021 requires the normal main-window close action to hide the window rather
than quit. DEC-022 requires explicit application exit to leave tracking data
unchanged. DEC-024 places Open, Pause/Resume, Stop, Quit, and current timer
information in the MVP tray. The PRD (FR-008–010), UX design (§20–22), and
architecture (§20–21) establish the same behavior.

The current application creates a window without retaining application-level
ownership of it and quits on `window-all-closed` outside macOS. This
specification introduces the lifecycle ownership needed to satisfy those
accepted decisions. It does not change timer semantics.

---

# 4. Scope

This specification includes:

- creating one native system tray/menu-bar item after successful application
  initialization;
- platform-appropriate packaged and development tray icon assets;
- native idle, running, and paused tray menu presentations;
- current Task description presentation, limited to one line and at most 80
  Unicode code points;
- current tracking-session duration in `HH:MM:SS`, advancing once per second
  while running and remaining fixed while paused;
- Pause, Resume, and Stop commands from the tray using the existing
  authoritative timer operations;
- one-command-at-a-time protection for tray timer actions;
- native, safe failure feedback when a tray timer command does not succeed;
- hiding, rather than destroying, the main window after its normal close
  control is used;
- restoring and focusing the existing main window through `Open Daymark`;
- supported platform-standard restoration gestures in addition to the explicit
  Open command;
- explicit Quit that exits without pausing, stopping, closing, or otherwise
  mutating the current interval or `AppState`;
- authoritative synchronization among renderer timer commands, tray commands,
  Task rename/interval corrections that affect tray presentation, and the tray;
- immediate authoritative renderer refresh after a tray transition;
- deterministic cleanup of tray resources, update timers, window references,
  subscriptions, and the database lifecycle during exit;
- unit, lifecycle, integration, boundary, renderer, and packaged-application
  verification.

---

# 5. Out of Scope

This specification does not implement:

- automatic launch at operating-system startup (excluded by DEC-025);
- global keyboard shortcuts;
- notifications, reminders, alarms, sounds, or badges;
- starting a new Task, selecting a different Task, or showing recent Tasks from
  the tray;
- history, interval correction, Task management, analytics, or settings inside
  the native tray menu;
- configurable tray behavior or a choice between close-to-hide and
  close-to-quit;
- a confirmation dialog before Quit;
- stopping, pausing, or repairing a timer during application exit;
- idle detection, computer-sleep correction, or automatic pause;
- minimizing the window to the tray when the normal minimize control is used;
- a full event bus or general-purpose renderer messaging API;
- Windows/Linux installers or complete fresh-machine validation, which remain
  part of SPEC-011 — Packaging and Release.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-000 — Project Foundation, status Verified;
- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-003 — Task Search and Reuse, status Verified;
- SPEC-004 — One-Click Task Switching, status Verified;
- SPEC-005 — Manual Time Entry, status Verified;
- SPEC-006 — Edit and Delete Intervals, status Verified;
- SPEC-007 — Task Management, status Verified.

This specification reuses the existing `TimerService`, `TimerStateReader`,
`TimerState`, `AppResult`, injected `Clock`, narrow preload boundary, renderer
authoritative-refresh behavior, and application database lifecycle.

---

# 7. Domain and Timer Behavior

The tray is a presentation and command surface. It does not introduce a new
domain entity, timer state, transition, or source of truth.

The three authoritative states remain:

```text
idle
running
paused
```

Tray Pause, Resume, and Stop must invoke the same application service operations
used by renderer commands and therefore preserve all SPEC-001 transition,
transaction, clock, and persistence guarantees. The tray must never mutate
`AppState` or `TimeInterval` records directly.

The tray duration is current tracking-session duration, not Task daily duration
or lifetime duration:

- while running, presentation duration equals the last authoritative
  `sessionDurationMs` plus elapsed wall-clock time since that snapshot's `now`;
- while paused, presentation duration equals the authoritative
  `sessionDurationMs` and does not advance;
- while idle, no duration is shown;
- presentation clamps a negative clock delta or negative duration to zero and
  floors display to complete seconds;
- durations may exceed 99 hours and continue using unbounded hours, consistent
  with the existing renderer clock format.

The once-per-second display update must animate from the latest authoritative
snapshot using the injected `Clock`. It must not query SQLite or invoke the
timer service once per second. Authoritative reads occur at initialization and
after relevant commands or mutations; the existing renderer reconciliation
cadence remains independent.

---

# 8. Data Model Changes

No database changes.

Do not persist tray state, window visibility, formatted duration, mutable
duration counters, or quit intent. Existing interval and `AppState` invariants
remain unchanged.

---

# 9. Tray Presentation

The tray owns one context menu at a time. Exact native spacing and iconography
may vary by operating system, but item labels, availability, and command
semantics must be equivalent.

## Idle

```text
Daymark
No active timer
-----------------
Open Daymark
-----------------
Quit
```

## Running

```text
Daymark
Implement authentication
01:23:42
-----------------
Pause
Stop
-----------------
Open Daymark
-----------------
Quit
```

## Paused

```text
Daymark
Implement authentication
Paused · 01:23:42
-----------------
Resume
Stop
-----------------
Open Daymark
-----------------
Quit
```

`Daymark`, current information, and duration rows are informational and
must not invoke commands. Pause/Resume and Stop are omitted while idle rather
than presented as usable actions.

Task-description presentation must:

1. replace every run of Unicode whitespace with one ordinary space;
2. trim leading and trailing whitespace for display only;
3. show the complete single-line value when it contains at most 80 Unicode code
   points;
4. otherwise show its first 79 Unicode code points followed by `…`, for a total
   maximum of 80;
5. never modify or persist the presentation value.

Tray icon requirements:

- use an application-owned local asset included in development and packaged
  builds;
- use a macOS template-compatible monochrome asset where the platform supports
  it;
- provide an appropriate Windows/Linux fallback rather than relying on a
  remote resource or renderer asset URL;
- include recognizable visible content at native tray sizes and an accessible
  tooltip/title of `Daymark` where the platform supports one.

---

# 10. Tray Service and Command Behavior

Add a main-process tray owner conceptually equivalent to:

```ts
interface TrayService {
  initialize(initialState: TimerState): void;
  synchronize(state: TimerState): void;
  dispose(): void;
}
```

Exact naming may follow repository conventions. The service may receive narrow
adapters for the native Tray/Menu APIs, scheduler, injected Clock, timer
commands, window controller, error dialog, and state-change publisher so its
behavior remains deterministic in tests.

Initialization must:

1. occur only after database initialization and authoritative timer services
   are available;
2. obtain one authoritative timer snapshot;
3. create exactly one Tray instance and initial menu;
4. start one one-second ticker only when the snapshot is running;
5. fail application startup safely if required tray creation or its required
   icon cannot be completed.

Synchronization must:

- replace the stored authoritative snapshot;
- rebuild menu presentation immediately;
- start one ticker when entering running;
- retain that one ticker when replacing one running snapshot with another;
- stop the ticker when entering paused or idle;
- never leave multiple tickers active;
- ignore calls after disposal.

Each ticker callback must update only running-duration presentation derived from
the stored snapshot and Clock. It must not perform a database read, send a
renderer event, or execute a timer command.

Pause, Resume, and Stop tray actions must:

1. accept no renderer-controlled input;
2. allow only one tray command to be pending at a time;
3. disable or otherwise guard Pause/Resume and Stop while pending;
4. execute the corresponding existing `TimerService` operation;
5. on success, synchronize the tray to the returned authoritative state and
   publish that state to every live main window;
6. on a controlled or unexpected failure, obtain a fresh authoritative state
   when safely possible, synchronize and publish it, and never claim the
   requested transition succeeded;
7. show a short native error dialog such as `Daymark could not pause the
   timer. Open Daymark to review its current state.`;
8. log unexpected technical failures locally without logging Task descriptions,
   while avoiding unnecessary error logging for expected controlled outcomes;
9. return the menu to an actionable state after completion.

The application must also synchronize the tray after every successful
renderer-originated Start, Switch, Pause, Resume, or Stop. A successful active
Task rename and a successful interval correction that can change current-session
duration must refresh the tray from authoritative state. Other mutations may
refresh it when simpler, but must not create per-second database work.

No full application event bus is required. A direct, typed application-level
notification callback or similarly narrow coordinator is sufficient.

---

# 11. Window Lifecycle Behavior

The main process owns at most one normal main window.

Normal window close must:

- prevent destruction of the window;
- hide the window;
- keep the renderer, tray, database, and application process alive;
- leave timer persistence completely unchanged;
- behave the same whether timer state is idle, running, or paused.

The normal minimize control retains ordinary operating-system minimize behavior.

`Open Daymark` must:

1. use the retained window when it exists;
2. restore it first if minimized;
3. show it if hidden;
4. focus it and request normal foreground attention where permitted by the OS;
5. never create a duplicate window from repeated commands.

If the normal window was destroyed for an exceptional reason while the
application and tray remain alive, the next Open or application-activation
request may create exactly one replacement window using the normal secure
window options.

Platform restoration behavior:

- the context-menu `Open Daymark` command works on macOS, Windows, and
  Linux;
- macOS application activation, including normal Dock activation, restores the
  existing window or creates one replacement if none exists;
- a native tray double-click restores the window on Windows and Linux where
  Electron exposes that gesture reliably;
- the tray context menu remains the primary portable interaction; platform
  gestures must not suppress it.

`window-all-closed` must not quit the ready application while its tray lifecycle
is active. This replaces the current non-macOS automatic-quit behavior.

---

# 12. Explicit Quit and Shutdown

Selecting Quit exits immediately without confirmation.

Explicit Quit must:

1. mark the application lifecycle as quitting before asking Electron to quit;
2. allow window close events during shutdown to destroy windows rather than
   converting those events back into Hide;
3. dispose the tray and its ticker/subscriptions;
4. close the database through the established shutdown lifecycle;
5. not invoke Pause, Stop, interval close, `AppState` mutation, or any other
   timer command.

Operating-system/application quit events must use the same cleanup path. Cleanup
must be idempotent so repeated quit-related events do not recreate resources or
throw.

If the application exits while running, the open interval and running
`AppState` remain persisted. If it exits while paused, paused state remains
persisted. Relaunch reconstructs either state through existing SPEC-001 logic
before creating the tray presentation.

---

# 13. Renderer Synchronization and Preload Contract

Tray commands occur outside the renderer and therefore require one narrow
main-to-renderer timer-state notification. Extend the timer API conceptually:

```ts
interface TimerAPI {
  // Existing methods omitted.
  onStateChanged(
    listener: (state: TimerState) => void,
  ): () => void;
}
```

Conceptual event channel:

```text
timer:state-changed
```

The preload implementation must:

- expose only subscription to this specific event;
- pass only the typed `TimerState` payload to the listener, never the Electron
  event object;
- return an unsubscribe function that removes exactly the registered wrapper;
- never expose raw `ipcRenderer`, generic `on`, generic `send`, or arbitrary
  channel selection.

The renderer timer controller must subscribe once and unsubscribe on cleanup.
For each published authoritative state it must:

- replace its timer snapshot immediately;
- clear a now-stale timer command error where appropriate;
- advance its authoritative revision so every loaded Daily History page
  reconciles;
- preserve the existing stale-request protection so an older renderer request
  cannot overwrite the newer published state.

A successful renderer-originated command may already have the same returned
state. Duplicate delivery must be safe and must not issue another timer command.
The once-per-second tray animation must not publish renderer events.

As an additional recovery path, focusing a restored main window must trigger an
authoritative timer refresh as well as the existing history reconciliation. A
failed focus refresh keeps the last usable snapshot and existing retry/error
behavior; it does not mutate timer state.

---

# 14. Validation and Error Behavior

Tray native commands have no external payload to validate. Their availability
must still be derived from authoritative state:

- Pause is available only from running;
- Resume is available only from paused;
- Stop is available only from running or paused.

The service layer remains authoritative if native menu state becomes stale or a
command races another transition. Invalid or stale transitions return their
existing controlled errors without partial mutation.

The `timer:state-changed` renderer event is main-process output, not a renderer
command. No renderer-supplied event payload or channel may be accepted. If an
invalid internal state payload is detected during development or testing, it
must not replace the renderer's last usable state.

Expected tray command failures receive the safe native message described in
§10. Unexpected failures also log technical context locally and use the same
safe presentation. Native dialogs and logs must not contain Task descriptions,
database paths, SQL details, or stack traces in user-visible text.

If tray or icon initialization fails, startup must:

- log a technical failure locally;
- show a safe startup error;
- dispose any partially created tray/ticker/window resources;
- close the database through the established lifecycle;
- quit rather than run an unreachable background application whose Close
  action would hide its only window.

---

# 15. Edge Cases

- The application launches into idle, running, or paused state.
- A running or paused session duration is zero or exceeds 99 hours.
- The wall clock observed by presentation is temporarily earlier than the
  authoritative snapshot's `now`.
- A Task description contains line breaks, repeated whitespace, emoji,
  combining characters, or more than 80 Unicode code points.
- Pause/Resume/Stop is selected twice rapidly.
- A tray command races a renderer command or a stale native menu.
- The user closes the window while a renderer command is pending.
- Open is selected repeatedly while the window is visible, hidden, minimized,
  loading, or exceptionally absent.
- The user closes, restores, closes again, and then quits.
- A tray action occurs while the window is hidden or already visible.
- The active Task is renamed while running or paused.
- A closed interval in the current paused session is edited or deleted.
- A controlled tray command failure occurs and authoritative reread succeeds.
- An unexpected tray command failure occurs and authoritative reread also
  fails.
- Tray initialization fails after the database opens but before normal startup
  completes.
- Quit is requested more than once or overlaps an OS shutdown event.
- The application quits and relaunches while running or paused.

---

# 16. Acceptance Criteria

## AC-008-001 — Native Tray Starts From Authoritative State

Given the database reconstructs idle, running, or paused timer state,

When the application finishes successful initialization,

Then exactly one tray exists and its initial menu matches that authoritative
state before the tray can execute a timer command.

## AC-008-002 — Idle Tray Presentation

Given the timer is idle,

When the tray menu is displayed,

Then it shows `No active timer`, Open, and Quit, and exposes no usable Pause,
Resume, or Stop action.

## AC-008-003 — Running Tray Presentation Advances Locally

Given a running authoritative snapshot,

When wall-clock seconds pass without a timer transition,

Then the tray shows the one-line truncated Task description and an advancing
`HH:MM:SS` session duration, using one ticker and no per-second database or IPC
read.

## AC-008-004 — Paused Tray Presentation Remains Fixed

Given a paused authoritative snapshot,

When wall-clock seconds pass,

Then the tray shows `Paused · HH:MM:SS`, exposes Resume and Stop, and does not
run a duration-update ticker.

## AC-008-005 — Tray Pause, Resume, and Stop Are Authoritative

Given the corresponding transition is valid,

When Pause, Resume, or Stop is selected from the tray,

Then exactly one existing timer-service command executes, persistence and
`AppState` satisfy SPEC-001, and the tray and live renderer receive the returned
authoritative state.

## AC-008-006 — Tray Commands Cannot Be Duplicated

Given one tray timer command is pending,

When another tray timer action is attempted,

Then no second transition starts and controls become actionable again only
after the first attempt is reconciled.

## AC-008-007 — Tray Command Failure Is Visible and Safe

Given a tray timer command returns a controlled failure or throws unexpectedly,

When the failure is handled,

Then no success is implied, a fresh authoritative state is used when available,
the menu remains usable, and a safe native error dialog appears without exposing
user content or internal details.

## AC-008-008 — All Relevant Mutations Synchronize Tray Presentation

Given the tray is initialized,

When a renderer timer command succeeds, the active Task is renamed, or an
interval correction changes current-session duration,

Then the tray refreshes promptly from authoritative state without waiting for a
per-second database poll.

## AC-008-009 — Normal Close Hides Without Mutation

Given the application is idle, running, or paused,

When the user invokes the normal main-window close control,

Then the same window is hidden, the application and tray remain alive, and no
timer or persistence state changes.

## AC-008-010 — Open Restores One Existing Window

Given the main window is hidden or minimized,

When `Open Daymark` is selected one or more times,

Then one existing window is restored, shown, and focused without creating a
duplicate.

## AC-008-011 — Platform Activation Restores Reliably

Given the main window is hidden,

When macOS application activation occurs or a supported Windows/Linux tray
double-click occurs,

Then the existing window is restored while the portable context menu remains
available.

## AC-008-012 — Renderer Reconciles Tray Changes

Given the renderer is live and the timer is changed through the tray,

When the main process publishes the resulting state or the window regains
focus,

Then the renderer immediately shows authoritative timer state and reconciles
all loaded history without issuing a duplicate command or accepting an older
request over the new state.

## AC-008-013 — Explicit Quit Preserves Tracking State

Given the timer is running or paused,

When Quit is selected,

Then the application exits without confirmation and without invoking a timer
transition or mutating the open interval or `AppState`.

## AC-008-014 — Relaunch Reconstructs Quit State

Given the application explicitly quit while running or paused,

When it is relaunched later,

Then the existing SPEC-001 recovery reconstructs the correct state and the tray
and renderer initially represent it, including elapsed wall-clock time while a
running interval remained open.

## AC-008-015 — Shutdown Cleans Up Exactly Once

Given tray, ticker, window, subscriptions, and database resources exist,

When explicit Quit or operating-system shutdown proceeds,

Then resources are disposed idempotently, window close is allowed to destroy
the window, and no tray or ticker remains active.

## AC-008-016 — Startup Failure Does Not Leave a Background Process

Given required tray or icon initialization fails,

When startup handles that failure,

Then it logs the technical error, shows safe startup feedback, cleans partial
resources, closes the database, and exits without leaving a hidden or
unreachable application.

## AC-008-017 — Narrow Boundary and Local-Only Assets Are Preserved

Given the tray and renderer synchronization are implemented,

When process boundaries and packaged resources are inspected,

Then the tray stays in the main process, preload exposes only the specific typed
state subscription, renderer security settings remain unchanged, and tray assets
load locally without network access.

## AC-008-018 — Packaged Primary-Platform Workflow Works

Given an isolated packaged macOS build,

When the close, restore, Pause, Resume, Stop, Quit-while-running, and relaunch
scenarios are exercised,

Then each workflow satisfies this specification, the tray icon/menu remain
usable, persisted timestamps prove Quit did not stop tracking, and no relevant
main or renderer error is emitted.

---

# 17. Required Unit Tests

- Tray presentation tests cover idle, running, paused, unbounded-hour duration,
  negative clock delta, whitespace normalization, Unicode-safe 80-code-point
  truncation, and safe tooltip/title configuration.
- Tray service tests cover initialization, exact menu commands, one-ticker
  ownership, local duration advancement without authoritative reads, snapshot
  replacement, running-to-running synchronization, ticker cancellation, and
  idempotent disposal.
- Tray command tests cover Pause, Resume, Stop, pending duplicate prevention,
  successful publication, controlled failure, thrown failure, authoritative
  reread failure, safe native dialog copy, and sanitized technical logging.
- Window lifecycle tests cover close-to-hide in all timer states, open from
  hidden/minimized/visible states, focus, duplicate prevention, exceptional
  replacement, activation gestures, quitting bypass, and idempotent cleanup.
- Startup tests cover database/service/state/tray/window ordering and cleanup
  after tray or icon initialization failure.
- Timer-state notification/coordinator tests cover renderer commands, tray
  commands, active Task rename, relevant interval corrections, and duplicate
  snapshot safety.

---

# 18. Required Repository Tests

No new repository behavior is required.

Existing disposable-SQLite repository tests remain part of regression
validation. Tests must never use the user's application database.

---

# 19. Required Integration Tests

- Application-service integration tests prove tray Pause, Resume, and Stop use
  existing transactional behavior and produce correct persisted intervals and
  `AppState`.
- Lifecycle integration tests prove close/hide/restore does not mutate SQLite or
  dispose the database and explicit Quit performs no timer command.
- Restart integration tests cover running and paused state across explicit Quit
  and reconstructed initial tray state.
- Synchronization integration tests cover renderer-originated transitions,
  tray-originated transitions, active Task rename, and a current-session
  interval correction without periodic database polling.
- Failure integration tests prove startup cleanup and no partially alive tray or
  application lifecycle.

---

# 20. Required Boundary and Renderer Tests

- Preload tests prove `timer.onStateChanged` subscribes only to the named event,
  strips the Electron event object, forwards the typed state, returns a precise
  unsubscribe function, and does not expose generic messaging capability.
- Renderer controller tests prove published state replaces the timer snapshot,
  invalid/stale delivery does not regress state, history revision advances,
  duplicate delivery issues no command, focus performs an authoritative refresh,
  and listeners are cleaned up on unmount.
- Existing renderer timer, history, task, and interval workflows remain passing.
- No new renderer visual surface is required by this specification.

---

# 21. Migration Tests

Not applicable.

---

# 22. Security Considerations

- Tray and native window lifecycle access remains exclusively in the Electron
  main process.
- The renderer receives no Tray, Menu, BrowserWindow, app-lifecycle, filesystem,
  path, database, or raw Electron capability.
- The preload bridge exposes a fixed timer-state subscription only and removes
  its internal event wrapper precisely.
- Renderer-originated inputs cannot select tray commands or native event
  channels.
- Tray icons are local packaged assets; no runtime network resource is used.
- Native error dialogs expose no Task description, database path, SQL detail, or
  stack trace.
- Existing `contextIsolation`, renderer sandbox, and disabled Node integration
  remain unchanged.

---

# 23. Performance Considerations

- At most one tray-duration ticker may exist, and only while running.
- The ticker cadence is once per second and is stopped promptly on Pause, Stop,
  disposal, or failed initialization.
- Each tick derives display from one stored snapshot and the injected Clock; it
  performs no SQLite query, IPC invocation, renderer publication, or persistence
  write.
- Menu rebuilding once per running second is accepted for the selected live
  `HH:MM:SS` UX, but unrelated native resources must be reused rather than
  recreated where Electron permits.
- State-changing operations cause one prompt authoritative synchronization;
  they must not start independent polling loops.
- Hiding the retained renderer is accepted so restoring preserves UI state and
  avoids repeated window construction.

---

# 24. Accessibility and Native UX Requirements

- Native menu item labels are clear text and do not rely on color or icon alone.
- Paused state includes the word `Paused`.
- Informational rows cannot be mistaken for commands.
- Unavailable commands are omitted or disabled consistently with §9 and pending
  behavior.
- `Open Daymark` remains present in every timer state.
- The tray exposes the application tooltip/title `Daymark` where supported.
- Restoring the window focuses it without unexpectedly moving focus inside the
  renderer beyond normal platform behavior.
- Native error feedback clearly states that the requested timer action may not
  have occurred and directs the user to open the application.

---

# 25. Platform and Packaged Verification

Implementation must isolate genuine platform-specific behavior behind small
main-process branches or adapters. Shared timer, tray presentation, and window
lifecycle behavior must not depend on macOS-only APIs.

Before verification:

- `npm run package` must include all required tray assets;
- the packaged macOS arm64 application must be exercised with an isolated user
  data directory;
- tests or review must demonstrate Windows/Linux icon selection and
  double-click registration paths even when those platforms are unavailable in
  the current environment;
- complete Windows/Linux installer and fresh-machine tray verification remains
  required by SPEC-011.

Packaged macOS acceptance must cover:

```text
launch idle → inspect tray
start → close window → observe advancing tray
pause from tray → restore → verify renderer/history
resume from tray → stop from tray
start → close → quit from tray → inspect SQLite → relaunch
repeat Open/close/restore without duplicate windows
```

No HTTP(S) resources, unexpected renderer console errors, uncaught
main-process errors, or modification of the user's real application profile is
permitted.

---

# 26. Definition of Done

This specification is complete when:

- AC-008-001 through AC-008-018 pass;
- all required unit, integration, boundary, renderer, lifecycle, restart, and
  packaged-application checks pass;
- `npm run format:check`, `npm run typecheck`, `npm run lint`, `npm test`, and
  `npm run package` pass;
- the packaged macOS workflow in §25 passes against an isolated profile;
- source and packaged tray assets are present and local;
- timer persistence and renderer security boundaries remain unchanged;
- documentation and `docs/progress.md` match the implementation;
- no unrelated analytics, settings, packaging, or deferred tray features are
  added.

---

# 27. Implementation Notes for Codex

Prefer the smallest direct lifecycle coordination satisfying this
specification. A full event bus, new persistence, renderer-owned timer logic, or
additional runtime dependency is not justified.

Keep native Electron objects behind narrow main-process adapters where this
makes behavior testable. Reuse the existing `Clock`, `TimerService`,
`TimerStateReader`, duration semantics, `AppResult`, preload patterns, and
renderer revision-based history reconciliation.

Do not implement SPEC-009 Analytics, SPEC-010 Settings, SPEC-011 Packaging and
Release, or any deferred roadmap behavior while completing this specification.
