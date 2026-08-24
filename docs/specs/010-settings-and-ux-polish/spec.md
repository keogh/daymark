# SPEC-010 — Settings and UX Polish

## Status

Verified

## Milestone

M8 — Settings and UX Polish

## Priority

P1

---

# 1. Objective

Complete the MVP application experience with two small, durable preferences and a
bounded whole-application quality pass.

The user must be able to:

- choose Monday or Sunday as the start of the current calendar week;
- choose System, Light, or Dark appearance;
- have each choice apply immediately without a separate Save action;
- retain both choices across renderer reload and application restart;
- rely on System appearance to follow operating-system appearance changes while
  the application is open.

The specification also audits and corrects the implemented Timer, Daily History,
Analytics, Settings, dialogs, and top-level navigation for documented keyboard,
accessibility, state-presentation, duration-formatting, narrow-window, and theme
behavior. This is a consistency and completion pass, not a redesign.

---

# 2. User Story

As an individual user,

I want the application to respect my calendar-week and appearance preferences and
remain coherent across every primary workflow,

so that I can use it comfortably without reconfiguring it or encountering
inconsistent interaction and presentation.

---

# 3. Background

SPEC-002 introduced a light semantic-token renderer foundation. SPEC-008 adds
native tray and window lifecycle behavior. SPEC-009 introduces Timer and Analytics
navigation, fixes Monday as the interim current-week boundary, and deliberately
defers Settings and dark appearance to this specification.

The PRD limits MVP settings to week start and appearance. Normal duration display
is already established as `15m`, `1h 05m`, and `102h 15m`, while the primary timer
uses unbounded-hour `HH:MM:SS`. Decimal hours are only a possible later feature.

The product decisions confirmed for this specification are:

- setting changes apply and persist without a Save button;
- defaults are Monday week start and System appearance;
- System appearance reacts live to operating-system appearance changes;
- UX polish audits all implemented views and workflows, but only corrects
  consistency, accessibility, keyboard, responsive, and documented-state defects;
- no wholesale visual redesign is authorized.

---

# 4. Scope

This specification includes:

- a persisted singleton application-settings record;
- a forward-only migration that seeds Monday and System defaults;
- typed week-start and appearance preference contracts;
- exact runtime validation for setting mutations;
- an injected-Clock Settings service;
- narrow get, set-week-start, and set-theme preload APIs and IPC handlers;
- immediate one-change-at-a-time setting updates without a Save button;
- rollback to the last confirmed preference after a failed update;
- a Settings destination added to the top-level navigation;
- an accessible Settings view with Week starts on and Appearance groups;
- Monday- or Sunday-based current-week Analytics projection from the persisted
  preference;
- authoritative Analytics refresh after week-start changes;
- System, Light, and Dark renderer appearances using semantic tokens;
- live System appearance response to operating-system changes;
- initial appearance resolution before primary application content is shown;
- complete theme coverage for every implemented view, overlay, chart, status, and
  focus treatment;
- a bounded keyboard, focus, accessibility, state, duration, and narrow-window
  audit across the implemented application;
- a source-owned application icon master and primary-platform packaged icon
  verification suitable for reuse by later platform packaging work;
- migration, repository, service, boundary, renderer, integration, regression,
  and isolated packaged acceptance coverage.

---

# 5. Out of Scope

This specification does not implement:

- automatic launch at operating-system startup;
- global keyboard shortcuts;
- custom shortcuts or shortcut settings;
- decimal-hour, seconds, 12/24-hour clock, locale, language, or custom duration
  preferences;
- custom themes, accent colors, font choices, density controls, or high-contrast
  theme modes;
- changing the operating-system theme;
- forcing native tray menus or operating-system chrome to imitate an explicit
  renderer theme where the platform owns their appearance;
- sound, notifications, reminders, idle detection, or Pomodoro behavior;
- data export, import, backup, restore, reset, or database location controls;
- accounts, synchronization, telemetry, crash reporting, or network services;
- persisting the last selected top-level destination;
- Settings controls inside the tray menu;
- arbitrary week starts other than Monday and Sunday;
- retroactively changing timestamps or stored intervals when week start changes;
- persisted weekly totals, theme-derived content, or mutable analytics aggregates;
- new product workflows, visual rebranding, information-architecture changes, or a
  wholesale component rewrite under the name of UX polish;
- Windows/Linux installer icon formats, signing, notarization, installer work, or
  fresh-machine cross-platform validation assigned to SPEC-011.

---

# 6. Dependencies

Required earlier specifications:

- SPEC-001 — Core Time Tracking, status Verified;
- SPEC-002 — Daily History, status Verified;
- SPEC-003 — Task Search and Reuse, status Verified;
- SPEC-004 — One-Click Task Switching, status Verified;
- SPEC-005 — Manual Time Entry, status Verified;
- SPEC-006 — Edit and Delete Intervals, status Verified;
- SPEC-007 — Task Management, status Verified;
- SPEC-008 — System Tray and Window Lifecycle, status Verified;
- SPEC-009 — Analytics, status Verified before implementation of SPEC-010 begins.

SPEC-010 reuses:

- the established SQLite migration and singleton-record patterns;
- the injected Clock abstraction;
- the `AppResult` controlled-error contract;
- the typed contextBridge and thin IPC patterns;
- Analytics local-calendar projection and authoritative refresh behavior;
- Timer-state notification and revision behavior;
- Timer/Analytics application-shell navigation;
- Tailwind CSS v4, semantic theme tokens, and selected source-owned UI
  primitives.

This specification may be designed and reviewed before SPEC-009 is implemented,
but no SPEC-010 implementation task may begin until SPEC-009 is Verified.

---

# 7. Settings Model

Conceptual shared contracts:

```ts
type WeekStartsOn = 'monday' | 'sunday';
type ThemePreference = 'system' | 'light' | 'dark';

interface ApplicationSettings {
  weekStartsOn: WeekStartsOn;
  theme: ThemePreference;
  updatedAt: number;
}

interface SetWeekStartsOnInput {
  weekStartsOn: WeekStartsOn;
}

interface SetThemeInput {
  theme: ThemePreference;
}
```

Names may be refined during implementation, but the public contract must preserve
these semantics.

The singleton record is authoritative. Renderer state, CSS classes, media-query
matches, local storage, and Analytics presentation are not independent settings
sources of truth.

`updatedAt` is a UTC epoch-millisecond timestamp from the injected Clock. It is
technical revision metadata, not a user-visible value.

---

# 8. Data Model and Migration

Add a singleton table conceptually equivalent to:

```sql
CREATE TABLE application_settings (
  id INTEGER PRIMARY KEY NOT NULL,
  week_starts_on TEXT NOT NULL DEFAULT 'monday',
  theme TEXT NOT NULL DEFAULT 'system',
  updated_at INTEGER NOT NULL,
  CONSTRAINT application_settings_singleton_id_check CHECK (id = 1),
  CONSTRAINT application_settings_week_start_check
    CHECK (week_starts_on IN ('monday', 'sunday')),
  CONSTRAINT application_settings_theme_check
    CHECK (theme IN ('system', 'light', 'dark'))
);
```

The exact migration syntax may follow established Drizzle output conventions.

The migration must:

- preserve every existing Task, TimeInterval, and AppState row unchanged;
- create exactly one settings row with `id = 1`;
- seed `week_starts_on = 'monday'` and `theme = 'system'`;
- seed `updated_at` deterministically without requiring application Clock access
  inside migration SQL;
- be safe for a new database and for an existing database at the latest prior
  migration;
- use normal forward migrations and never require deleting the database.

No mutable totals, formatted values, effective system appearance, navigation
destination, or accessibility-audit state may be persisted.

The repository must provide:

- read the singleton settings row;
- update only `week_starts_on` and `updated_at`;
- update only `theme` and `updated_at`;
- return the authoritative updated row;
- treat a missing or invalid singleton as an invariant failure rather than
  silently manufacturing a replacement during ordinary reads.

Separate field updates prevent one preference command from overwriting a newer
value of the other preference.

---

# 9. Defaults and Persistence Semantics

On first launch after migration:

```text
Week starts on: Monday
Appearance:     System
```

Each confirmed mutation is committed once and survives:

- leaving and returning to Settings;
- renderer reload;
- hiding and restoring the window;
- complete application quit and relaunch.

Closing, hiding, restoring, or explicitly quitting does not create a settings
write. An operating-system appearance change while System is selected does not
create a settings write because the persisted preference remains System.

Settings are global to the one local application profile. They are not associated
with a Task, day, window, or tracking session.

---

# 10. Settings Service Behavior

Conceptual application operations:

```ts
SettingsService.get(): AppResult<ApplicationSettings>

SettingsService.setWeekStartsOn(
  input: SetWeekStartsOnInput,
): AppResult<ApplicationSettings>

SettingsService.setTheme(
  input: SetThemeInput,
): AppResult<ApplicationSettings>
```

`get` must return the authoritative singleton without mutation.

Each set operation must:

1. receive already runtime-validated input;
2. read or conditionally update the singleton through the repository;
3. obtain `updatedAt` from the injected Clock only when a value changes;
4. update only the requested preference;
5. commit once;
6. return the complete authoritative settings row;
7. leave Tasks, TimeIntervals, AppState, and the other preference unchanged.

Setting a preference to its already persisted value is a successful no-op. It
returns the current settings and does not write or advance `updatedAt`.

Expected repository or transaction failures return a safe controlled failure and
must not leave a partial update.

---

# 11. Analytics Week-Start Integration

SPEC-009's fixed Monday current-week rule is replaced by the persisted preference:

```text
monday = current week begins Monday at local midnight
sunday = current week begins Sunday at local midnight
```

The Analytics service must read the authoritative week-start preference in the
main process as part of each summary request. The renderer does not supply a week
boundary and cannot override the setting through Analytics input.

For either preference, current-week projection must:

- contain the authoritative `capturedAt`;
- end at the next selected week-start day at local midnight;
- use local calendar operations rather than fixed multiples of 24 hours;
- apply the current system timezone at request time;
- use the existing interval-overlap semantics;
- include an open interval only through `capturedAt`;
- leave selected 7-day/30-day and current-month semantics unchanged;
- remain a projection without persisted totals.

After a successful week-start change, any loaded Analytics summary is stale. The
application must invalidate it and obtain a new authoritative summary before
presenting Analytics as current. Navigating to Analytics after the change must not
briefly label or present the old current-week boundary as current.

A preference change never edits intervals, shifts timestamps, changes local-day
history grouping, or mutates the timer.

---

# 12. IPC and Preload Contract

Conceptual renderer-facing API:

```ts
interface SettingsAPI {
  get(): Promise<AppResult<ApplicationSettings>>;
  setWeekStartsOn(
    input: SetWeekStartsOnInput,
  ): Promise<AppResult<ApplicationSettings>>;
  setTheme(input: SetThemeInput): Promise<AppResult<ApplicationSettings>>;
}

interface DaymarkAPI {
  // Existing feature APIs remain unchanged.
  settings: SettingsAPI;
}
```

Use exactly one explicit request channel per operation, conceptually:

```text
settings:get
settings:set-week-start
settings:set-theme
```

IPC handlers must remain thin: validate input, call the service, map unexpected
failures to a safe error, and return the typed result.

The preload must not expose generic get/set preference names, arbitrary keys,
database access, raw `ipcRenderer`, generic invoke/send/on, native-theme objects,
or filesystem access.

---

# 13. Runtime Validation

`settings:get` accepts no payload. A supplied payload is rejected rather than
ignored if the established handler convention permits callers to supply one.

`settings:set-week-start` accepts exactly one own property:

```ts
{ weekStartsOn: 'monday' | 'sunday' }
```

`settings:set-theme` accepts exactly one own property:

```ts
{ theme: 'system' | 'light' | 'dark' }
```

Validation must reject:

- missing, `null`, array, primitive, or function input;
- missing required properties;
- unsupported strings or incorrect value types;
- extra own properties;
- inherited required properties;
- inherited or prototype-polluted extra properties according to the established
  exact-shape validation rules.

Invalid input must not execute the service or mutate persistence.

Controlled codes must distinguish invalid week-start input and invalid theme
input. Names may follow the existing error convention, conceptually:

```text
INVALID_WEEK_START
INVALID_THEME
```

---

# 14. Error Behavior

Expected boundary validation failures return their controlled error code without
internal details.

If initial settings retrieval fails:

- the application uses System appearance as a safe in-memory fallback for the
  current renderer lifetime;
- Timer and other available destinations remain usable;
- Settings shows a concise error and Retry action;
- controls whose authoritative values are unknown are not presented as saved;
- retry obtains a complete authoritative settings row;
- no fallback preference is written automatically.

If a mutation fails:

- the attempted visual preference is rolled back to the last confirmed value;
- the last confirmed settings remain selected;
- a concise inline error explains that the setting was not saved;
- the user can retry by selecting the desired value again;
- focus remains in a predictable location;
- no Task, TimeInterval, AppState, Analytics source data, or other preference is
  mutated.

Unexpected database, service, IPC, or migration failures are logged locally with
technical context while renderer-visible errors omit stack traces, SQL, paths, and
user-created content.

---

# 15. Top-Level Navigation

Extend SPEC-009 navigation to exactly three destinations:

```text
Timer
Analytics
Settings
```

Settings appears consistently in the same semantic navigation on every
destination. Navigation must continue to:

- identify the current destination with `aria-current="page"` or equivalent;
- use ordinary buttons or links rather than incomplete ARIA tabs;
- support normal Tab and activation keys;
- preserve visible focus in every appearance;
- avoid a routing dependency for three local views;
- avoid starting, pausing, resuming, stopping, switching, or otherwise mutating
  the timer;
- keep the authoritative Timer controller and external timer notifications alive
  at application-shell level;
- default a fresh renderer load to Timer;
- avoid persisting the selected destination.

When a user activates a destination, focus follows ordinary browser behavior and
is not forcibly moved unless required to recover from an element that was removed.
The destination page has one clear level-one content heading within the
application shell's logical heading structure.

---

# 16. Settings Renderer Layout

Conceptual layout:

```text
Daymark                         Timer  Analytics  Settings

Settings
Preferences apply automatically.

Calendar
Week starts on
(*) Monday
( ) Sunday

Appearance
(*) System       Follow this computer's appearance
( ) Light
( ) Dark
```

Exact spacing and control composition may be refined, but the Settings view must:

- use a semantic page heading;
- group each preference with `fieldset`/`legend` or equivalent native semantics;
- use native radio behavior or a fully equivalent accessible single-selection
  control;
- communicate the currently persisted selection without color alone;
- explain System appearance in visible text;
- state that changes apply automatically without presenting a Save button;
- show one initial loading state without presenting guessed values as saved;
- show one clear pending state while a mutation is in progress;
- show controlled load and mutation errors in text;
- remain usable at the supported minimum desktop window size;
- avoid excessive cards, a large sidebar, or dashboard treatment.

Only one setting mutation may be pending at a time. While it is pending, both
preference groups are disabled or otherwise protected from concurrent commands.
Navigation remains available. This prevents response ordering from replacing a
newer confirmed preference with stale complete-settings data.

---

# 17. Immediate Preference Interaction

There is no Save, Apply, Cancel, or confirmation dialog.

For week start:

1. the user selects Monday or Sunday;
2. the control enters a pending state;
3. the application persists the choice;
4. on success, the returned authoritative settings become confirmed and Analytics
   is invalidated;
5. on failure, selection remains or returns to the prior confirmed value and an
   inline error appears.

For appearance:

1. the user selects System, Light, or Dark;
2. the renderer applies the requested appearance immediately;
3. the control enters a pending state and persists the choice;
4. on success, the returned authoritative settings become confirmed;
5. on failure, the renderer restores the prior confirmed appearance and presents
   the inline error.

The pending state must not replace the entire Settings view with a spinner or
remove navigation. Repeated activation of the already confirmed preference causes
no visible error, no persistence write, and no theme transition.

---

# 18. Appearance Semantics

The effective renderer appearance is:

```text
theme = light  -> Light
theme = dark   -> Dark
theme = system -> current operating-system light/dark preference
```

System mode must react while the application is open. A system light/dark change:

- updates the effective renderer appearance without reload;
- does not change the selected Settings value from System;
- does not invoke settings IPC;
- does not write SQLite;
- does not mutate Timer or Analytics state.

Explicit Light or Dark ignores later operating-system appearance changes until
System is selected again.

The root renderer element must expose the effective/preference theme through a
small explicit attribute or class suitable for semantic CSS tokens. Components
must consume semantic tokens for product meaning. Do not scatter theme-condition
branches or raw light-only palette values through feature components.

`color-scheme` must match the effective renderer appearance so browser-owned form
controls and scrollbars remain coherent where supported.

Native tray menus and operating-system-owned window chrome may continue to follow
platform behavior. This specification does not require imitating an explicit
renderer theme in native surfaces when Electron or the platform owns them.

---

# 19. Initial Appearance Resolution

The application must request settings as part of renderer bootstrap. Primary
Timer, Analytics, and Settings content must not render in a knowingly incorrect
theme and then visibly repaint as the normal startup path.

A short neutral application loading state may be shown while both settings and
the initial authoritative Timer state resolve. The application must:

- use system-aware base colors for the pre-resolution surface;
- apply the resolved theme before revealing primary content;
- avoid displaying false saved Settings selections;
- avoid delaying Timer recovery longer than the settings request itself;
- fall back safely to System for the renderer lifetime if settings retrieval
  fails, as defined in §14.

This requirement does not authorize renderer access to synchronous filesystem,
SQLite, Node.js, or raw Electron APIs and does not require duplicating the
authoritative preference in local storage.

---

# 20. Theme Coverage

Light and Dark appearances, plus both effective forms of System, must cover all
implemented renderer surfaces:

- application shell and top-level navigation;
- idle, running, paused, loading, and unavailable Timer states;
- Task input, suggestions, buttons, and command errors;
- Daily History days, Task rows, interval details, actions, pagination, empty,
  loading, exhausted, and retry states;
- manual entry, interval edit/delete, and Task rename/delete dialogs;
- Analytics range controls, summary values, chart, Top Tasks, empty, loading,
  stale, and error states;
- Settings controls, pending state, and errors;
- dropdown menus, popovers, overlays, separators, inputs, focus rings, selection,
  destructive actions, and disabled states.

For each appearance:

- text and interactive-state contrast must be sufficient;
- focus indicators must remain clearly visible;
- running, paused, destructive, warning, stale, disabled, selected, and error
  meaning must not rely on color alone;
- charts and muted text must remain distinguishable from their background;
- overlays and surfaces must retain clear boundaries;
- no light-only flash, unreadable raw color, transparent text, or invisible icon
  may remain in the ordinary workflows.

The audit should migrate hard-coded presentation colors to existing or minimally
extended semantic tokens when needed. It must not rewrite already-correct
components merely for stylistic uniformity.

---

# 21. Bounded UX Polish Audit

The implementation must audit every implemented primary workflow against its
verified specification and the project Definition of Done. Corrections are in
scope only when they address one of the following:

- keyboard reachability and activation;
- Escape behavior for dismissible overlays;
- dialog focus containment, initial focus, and focus restoration;
- visible focus in Light and Dark appearances;
- semantic names, roles, labels, headings, field groups, and current-page state;
- text alternatives for icon-only controls;
- status and error text not communicated only through color;
- non-noisy live-region behavior;
- documented initial loading, empty, pending, stale, exhausted, and retry states;
- shared normal-duration and timer-duration formatting;
- unbounded-hour layout behavior;
- long Task-description wrapping;
- supported minimum-width scrolling and reflow;
- reduced-motion-safe loading and presentation;
- consistent disabled and pending behavior that prevents duplicate mutations;
- removal of renderer runtime HTTP(S) assets or other violations of local-only
  operation.

The audit must produce a concise checklist mapping each implemented destination
and overlay to reviewed concerns and any resulting code/test change. A checked
item with no defect does not require a code change.

The audit must not:

- alter domain behavior or verified timer semantics;
- invent new empty/error states contrary to an earlier specification;
- add a new component framework, router, state manager, or accessibility test
  platform without demonstrated need;
- restyle the product into a different visual system;
- expand scope to future roadmap features;
- treat subjective visual preference as a defect.

---

# 22. Duration Formatting

All normal renderer durations continue to use the established shared format:

```text
0m
15m
1h 05m
102h 15m
```

The primary Timer and tray session duration continue to use unbounded-hour
`HH:MM:SS` presentation as specified by their owning specifications.

The audit must remove accidental competing renderer formatters or inconsistent
zero-padding where the same presentation context is intended. It must preserve
exact underlying millisecond values and must not introduce decimal hours or a new
duration preference.

---

# 23. Responsive Desktop Behavior

The application must remain usable at the configured minimum BrowserWindow size
and at the normal packaged size.

At the supported minimum width:

- top-level navigation remains reachable and may wrap without overlap;
- primary actions remain visible without horizontal page scrolling where
  reasonably possible;
- forms reflow without truncated labels or off-screen submit controls;
- long Task descriptions wrap;
- duration values remain associated with the correct label or Task;
- dialogs fit within the viewport and scroll internally when content exceeds
  available height;
- Analytics chart and semantic values remain understandable;
- Settings groups remain readable and operable.

A mobile layout and reduction of the configured platform minimum window size are
not required.

---

# 24. Application Icon

Provide a source-owned application icon master that:

- is recognizable at ordinary desktop application sizes;
- does not depend on small text;
- remains legible against light and dark surrounding surfaces;
- is distinct from, but visually compatible with, the native tray asset;
- is stored locally and packaged without runtime network access;
- can be reused to derive later Windows and Linux distribution formats.

SPEC-010 must wire and verify the icon for the primary-platform packaged
application using the existing Electron Forge configuration. SPEC-011 owns final
platform-specific conversion, installers, signing/notarization decisions, and
fresh-machine cross-platform acceptance.

The icon is product presentation, not a new brand system. Creating it must not
trigger a broader logo, typography, or interface redesign.

---

# 25. Edge Cases

The implementation must handle:

- a newly migrated profile with default settings;
- an existing profile containing Tasks, closed/open intervals, and AppState;
- renderer reload with each persisted theme;
- application restart with each persisted preference;
- hiding/restoring the window while a setting or timer is active;
- changing appearance while idle, running, or paused;
- changing the operating-system appearance while System is selected;
- changing the operating-system appearance while Light or Dark is selected;
- changing week start near a local week boundary;
- Sunday and Monday at local midnight, including DST-adjacent weeks;
- changing week start while Analytics has usable cached presentation;
- repeated selection of the already persisted value;
- repository failure during either preference update;
- settings load failure and successful Retry;
- malformed, extra-property, and prototype-derived IPC input;
- timestamps or durations beyond 99 hours;
- long Task descriptions and empty Analytics/History data;
- reduced-motion preference;
- minimum supported width and constrained height;
- offline packaged operation.

---

# 26. Acceptance Criteria

## AC-010-001 — Migration Creates Safe Defaults

Given a database at the latest pre-SPEC-010 migration,
when the SPEC-010 migration runs,
then exactly one valid settings row exists with Monday and System defaults and all
existing Task, TimeInterval, and AppState data is unchanged.

## AC-010-002 — Settings Persist Across Reload and Restart

Given the user successfully selects Sunday and Dark,
when the renderer reloads and the application later fully restarts,
then Settings still shows Sunday and Dark and the renderer uses Dark without
mutating timer or interval data.

## AC-010-003 — Week Start Applies Without Save

Given Monday is confirmed,
when the user selects Sunday,
then exactly one validated update is performed without a Save action, Sunday
becomes the confirmed selection, and the other preference is unchanged.

## AC-010-004 — Analytics Uses the Persisted Week Start

Given known intervals whose current-week contribution differs between Monday and
Sunday boundaries,
when each preference is confirmed and Analytics is requested,
then current-week boundaries and totals use that persisted local-calendar rule
while selected-range and current-month values remain unchanged.

## AC-010-005 — Appearance Applies Immediately and Persists

Given any confirmed appearance,
when the user selects Light or Dark,
then the requested renderer appearance applies immediately, persists once, and is
restored as the confirmed appearance after reload and restart.

## AC-010-006 — System Appearance Reacts Live

Given System is confirmed,
when the operating-system appearance changes between light and dark,
then the renderer follows without reload, settings IPC, database writes, selection
change, or timer mutation.

## AC-010-007 — Explicit Appearance Ignores System Changes

Given Light or Dark is confirmed,
when the operating-system appearance changes,
then the explicit renderer appearance and confirmed Settings value remain
unchanged.

## AC-010-008 — Failed Mutations Roll Back Safely

Given confirmed settings and an injected persistence failure,
when the user attempts either preference change,
then the last confirmed values and effective appearance are restored, a safe
inline error is shown, focus remains usable, and no partial or unrelated mutation
occurs.

## AC-010-009 — Settings Load Failure Does Not Disable Tracking

Given initial Settings retrieval fails,
when the renderer starts,
then it safely uses System appearance for that renderer lifetime, keeps Timer and
navigation usable, presents unknown Settings as an error with Retry rather than as
saved defaults, and writes no fallback value.

## AC-010-010 — Three-Destination Navigation Is Accessible

Given any Timer state,
when the user navigates among Timer, Analytics, and Settings by keyboard or
pointer,
then the current destination is identified semantically, focus is visible, Timer
state continues authoritatively, and navigation performs no timer transition.

## AC-010-011 — Settings Controls Are Accessible and Serialized

Given Settings loaded successfully,
when a preference is operated with keyboard or pointer,
then labeled single-selection semantics expose the confirmed value, one pending
operation prevents concurrent setting commands, automatic application is
explained, and no Save button is present.

## AC-010-012 — Every Implemented Surface Supports Light and Dark

Given representative content and every documented state across Timer, History,
Analytics, Settings, menus, and dialogs,
when effective appearance is Light and then Dark,
then content, boundaries, chart values, focus, statuses, errors, disabled states,
and destructive actions remain perceivable and no meaning relies on color alone.

## AC-010-013 — Keyboard and Focus Workflows Remain Complete

Given each implemented primary workflow and overlay,
when it is completed using the keyboard,
then controls are reachable and operable, Escape closes dismissible overlays,
dialogs contain and restore focus, and no global Space or unrequested shortcut is
introduced.

## AC-010-014 — States and Duration Presentation Are Consistent

Given loading, empty, pending, stale, exhausted, retry, zero-duration, and
greater-than-99-hour representative states,
when each owning view is rendered,
then the previously specified state behavior is present and durations use the
established shared context-appropriate format without changing source values.

## AC-010-015 — Minimum-Window Layout Remains Usable

Given long Task descriptions and representative Timer, History, Analytics,
Settings, and dialog content,
when the window is at its configured minimum size,
then navigation, labels, values, actions, focus, and scrolling remain usable
without overlapping or inaccessible content.

## AC-010-016 — Settings Boundary Is Narrow and Validated

Given malformed, extra-property, inherited, or unsupported setting input,
when it crosses IPC,
then the request returns the appropriate controlled error without service or
repository execution, internal details, generic IPC, Node.js, filesystem, or
database exposure.

## AC-010-017 — Settings Do Not Corrupt Product State

Given idle, running, and paused timer states with existing data,
when preferences are read, changed, reselected, reloaded, or restored after
failure,
then Tasks, TimeIntervals, AppState, timer transitions, selected-range Analytics,
and Daily History remain unchanged except for the specified current-week
projection and renderer appearance.

## AC-010-018 — Application Icon Is Local and Packaged

Given the primary-platform packaged application,
when its application artifact and ordinary launcher presentation are inspected,
then the configured source-owned icon is present, recognizable, locally packaged,
and does not require a runtime network resource.

## AC-010-019 — Packaged Settings and Polish Workflow Works Offline

Given an isolated packaged primary-platform application with representative data,
when the complete Settings, theme, Analytics week-start, keyboard, dialog,
minimum-window, reload, restart, and running-timer scenarios are exercised offline,
then behavior satisfies this specification with a clean renderer console and no
HTTP(S) resource request.

---

# 27. Required Unit Tests

- settings contract values and controlled error-code coverage;
- exact-shape week-start and theme validation, including inherited input;
- SettingsService get, changed update, same-value no-op, Clock timestamp, field
  isolation, missing singleton, and repository failure behavior;
- Monday and Sunday local-current-week boundaries;
- Sunday/Monday boundary, DST, timezone, open-interval, and greater-than-99-hour
  projection behavior;
- theme preference to effective appearance resolution;
- System media-query changes and explicit-theme nonreaction;
- immediate appearance rollback after failed persistence;
- settings-controller serialization, stale result protection, load fallback, and
  Retry;
- shared duration format coverage retained for normal and timer contexts.

---

# 28. Required Repository and Migration Tests

- migration from the latest prior schema preserves every existing Task,
  TimeInterval, and AppState value;
- migration seeds exactly one Monday/System settings row;
- singleton ID, week-start, and theme checks reject invalid direct writes;
- repository reads the singleton;
- each update changes only its target field and `updatedAt`;
- same-value service behavior produces no repository update;
- repeated sequential updates preserve the other preference;
- missing singleton is surfaced as an invariant failure;
- disposable databases only are used.

---

# 29. Required Integration Tests

- settings survive service reconstruction against disposable SQLite;
- week-start changes alter only current-week Analytics boundaries/totals;
- selected-range, current-month, History, Tasks, intervals, and AppState remain
  unchanged across settings changes;
- settings changes while idle, running, and paused preserve Timer state;
- renderer reload/application-service reconstruction restores preferences;
- transaction/repository failure rolls back completely;
- Analytics request reads the authoritative persisted preference rather than a
  renderer-provided boundary.

---

# 30. Required Boundary Tests

- exact settings channel names and payload shapes;
- malformed input returns controlled validation errors without service calls;
- expected service failures remain controlled;
- unexpected failures become safe `INTERNAL_ERROR` results and are logged locally;
- handlers register and dispose through established lifecycle composition;
- preload exposes only `settings.get`, `settings.setWeekStartsOn`, and
  `settings.setTheme` with typed contracts;
- no raw `ipcRenderer`, generic preference key, generic invoke/send/on,
  native-theme object, Node.js, filesystem, database, or SQL capability reaches
  the renderer.

---

# 31. Required Renderer Tests

- initial settings loading, ready, error, and Retry states;
- fallback System appearance after load failure without guessed saved values;
- Timer/Analytics/Settings navigation semantics and keyboard operation;
- Settings field grouping, labels, descriptions, confirmed selection, and absence
  of Save controls;
- immediate theme application, pending serialization, success confirmation, and
  failure rollback;
- successful week-start change invalidates stale Analytics presentation;
- system appearance live change without settings API calls;
- explicit Light/Dark resistance to system changes;
- renderer reload initialization without knowingly rendering primary content in
  the wrong persisted theme;
- representative Light and Dark rendering of every destination, shared primitive,
  dialog, menu, chart, status, and error state;
- visible-focus and non-color state indicators;
- keyboard-only primary workflows and dialog focus restoration;
- reduced-motion-safe behavior;
- normal, zero, and unbounded-hour duration layout;
- long descriptions and configured-minimum-window layout;
- no Timer command caused by settings or navigation;
- no runtime HTTP(S) assets.

Tests should assert semantics and state attributes rather than fragile pixel or
class snapshots. Targeted visual inspection remains required for contrast,
clipping, and theme completeness.

---

# 32. Security Considerations

Settings are privileged persisted application data and remain owned by the main
process.

The renderer must not receive:

- SQLite, Drizzle, repositories, or database paths;
- Node.js or filesystem APIs;
- raw Electron objects, `ipcRenderer`, or `nativeTheme`;
- arbitrary preference keys or generic persistence operations;
- generic event subscription.

All mutation input is untrusted and runtime validated. Theme CSS, fonts, icons,
and assets remain local. Do not introduce telemetry, hosted fonts, remote theme
resources, or crash reporting.

Logs must avoid Task descriptions and user interval content. Renderer-visible
errors must omit SQL, stack traces, and filesystem paths.

---

# 33. Performance Considerations

Settings contain one row and require no cache, background job, or optimization
framework.

The implementation must:

- perform at most one settings read for normal renderer bootstrap;
- perform no persistence write for same-value selection;
- perform exactly one transaction/write for a changed preference;
- perform no write when effective System appearance changes;
- use CSS/media-query or one bounded browser listener for live System appearance;
- clean up any browser listener during renderer lifecycle;
- avoid polling settings;
- avoid per-second settings IPC or database reads;
- avoid rerunning unrelated Timer/History queries after theme changes;
- refresh Analytics only when week start can affect its current-week projection;
- avoid a broad renderer rerender architecture or new global state framework.

---

# 34. Accessibility Requirements

SPEC-010 must provide and verify:

- semantic three-destination navigation with current-page indication;
- one logical page heading per destination;
- labeled native or equivalent radio-group semantics for each setting;
- confirmed, pending, error, and disabled states communicated beyond color;
- visible focus in all effective appearances;
- keyboard operation with normal Tab, Enter, Space, arrow-key radio behavior, and
  Escape where overlays own it;
- no global Space interception or new global shortcut;
- dialog focus containment, initial focus, Escape behavior, and restoration;
- sufficient contrast for text, focus, borders, charts, warnings, errors,
  destructive actions, muted content, and disabled controls;
- status announcements that are useful and restrained, with no per-second Timer
  or Analytics announcement;
- reduced-motion-safe loading and transitions;
- long-content wrapping and usable zoom/minimum-window layout;
- every state and action understandable without color, hover, or pointer-only
  interaction.

The UX audit checklist and focused automated tests must cover every implemented
destination and overlay. Automated semantic checks complement, but do not replace,
manual keyboard and visual review.

---

# 35. Platform and Packaged Verification

Final acceptance requires an isolated packaged macOS arm64 run on the primary
development platform. It must verify:

- new-profile Monday/System defaults;
- changing and persisting Sunday, Light, Dark, and System;
- renderer reload and full restart persistence;
- live operating-system appearance response in System mode where test tooling can
  safely simulate or observe it;
- explicit-theme stability across system appearance changes;
- Analytics current-week recalculation against known boundary data;
- unchanged running and paused Timer behavior during settings/navigation changes;
- keyboard navigation and representative dialog focus behavior;
- representative loading, empty, error, and long-duration/description states;
- Light and Dark Timer, History, Analytics, Settings, menu, and dialog surfaces;
- normal and configured-minimum window sizes;
- application icon presence in the packaged artifact;
- clean renderer console and absence of HTTP(S) runtime resources.

Automated tests provide injected persistence failure, malformed IPC, migration,
DST, exact projection, and exhaustive state coverage that is impractical to
reproduce manually.

Windows and Linux behavior remains required and platform-neutral. Fresh-machine
cross-platform theme, icon, installer, and release acceptance belongs to
SPEC-011. SPEC-010 must not introduce macOS-only settings, CSS, service, or
projection assumptions.

---

# 36. Definition of Done

This specification is complete when:

- AC-010-001 through AC-010-019 pass;
- all required unit, migration, repository, integration, boundary, renderer, and
  regression tests pass;
- the bounded UX audit checklist is completed and retained with verification
  evidence;
- isolated packaged primary-platform verification passes;
- `npm run format:check` passes if that script remains available;
- `npm run typecheck` passes;
- `npm run lint` passes;
- `npm test` passes;
- `npm run package` passes;
- settings remain authoritative main-process SQLite data with a safe migration;
- System theme changes create no database write or settings IPC;
- Analytics uses the authoritative persisted week-start preference;
- no verified Timer, History, correction, Task, Analytics, tray, or lifecycle
  behavior regresses;
- renderer security and local-only operation remain intact;
- documentation and progress accurately describe implementation and deviations;
- no redesign, automatic startup, shortcuts, export, backup, or other future scope
  is added.

---

# 37. Implementation Notes for Codex

Prefer the smallest implementation that satisfies this specification.

Use a dedicated singleton settings repository/service rather than adding
preference responsibilities to AppState. AppState represents authoritative Timer
state; application preferences have a different lifecycle and mutation contract.

Keep Analytics boundary input unchanged if possible. Read week start inside the
main-process Analytics composition so the renderer cannot construct authoritative
calendar boundaries.

Use the existing semantic-token foundation. Add only tokens demonstrated by the
Light/Dark audit. Do not add a theme library, router, global state manager,
accessibility framework, or icon runtime dependency without a documented need.

The audit is evidence-driven. Preserve earlier verified behavior and add targeted
repairs/tests where an actual gap exists. Do not mechanically rewrite the renderer.

SPEC-009 must be Verified before implementation begins. Implement only one
unblocked task from `tasks.md` at a time and update `docs/plan.md` for that task
before changing production code.
