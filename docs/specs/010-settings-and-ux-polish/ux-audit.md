# TASK-010-006 — Bounded Whole-App UX Audit

Audit completed 2026-08-22 against SPEC-010 §§20–23 and §34. Browser plugin was
not available, so rendered verification used the packaged macOS arm64 application
through its local DevTools protocol with isolated temporary profiles. This audit
records evidence only for implemented surfaces and does not expand product scope.

## Checklist

| Surface | Keyboard, focus, and semantics | States, content, and layout | Result |
| --- | --- | --- | --- |
| Shell navigation | Native buttons, visible focus, Primary navigation name, and one `aria-current="page"`; packaged Tab/Enter reached Analytics without a Timer transition | Timer state remains authoritative across destinations; 640×480 navigation remained visible without horizontal overflow | No product-behavior change |
| Timer | Labeled input/combobox, native Start/Pause/Resume/Stop controls, named control group, text running/paused status, restrained announcements | Loading/unavailable/idle/running/paused/pending/error coverage retained; long description wrapped; clock remained unbounded `HH:MM:SS` | Normal summary durations consolidated |
| Task suggestions | Combobox/listbox/option semantics, arrow/Enter/Escape behavior, highlighted non-color edge, and count announcement retained | Loading/error/stale search behavior and five-result bound retained; long descriptions wrap | No further change |
| Daily History | Semantic day sections, expansion state, named Play/actions, keyboard dropdown, and exhausted focus behavior retained | Loading/empty/retry/stale/exhausted/running-action states retained; descriptions wrap and interval actions reflow | Normal durations consolidated |
| Analytics | Named destination heading, semantic chart alternative, text loading/stale/error/empty states, and range selection name retained | Zero and greater-than-99-hour values, 7/30-day chart overflow, long Top Task text, and 640×480 layout remained understandable | Added radio-group arrow keys, roving tabindex, and focus-preserving pending state |
| Settings | Native labeled radio groups expose checked state; pending disables concurrent preference commands; automatic application and no-Save behavior are explicit | Loading/error/Retry/pending/rollback states retained; groups were readable and operable at 640×480 | No further change |
| Task menu | Named icon-only trigger, menu/menuitem keyboard behavior, Escape closure, destructive text, and disabled deletion reason retained | Loading/error deletion-summary states retained; menu is viewport-bounded by Radix | No change |
| Add time dialog | Dialog name/description, initial Task focus, containment, Escape, labels, invalid text, and disabled pending controls retained | Long suggestion content and form reflow reviewed at 640×480 | Added global/per-day trigger focus restoration and shared internal scrolling |
| Edit time dialog | Named/ described dialog, labeled fields, initial focus, containment, Escape, error association, and trigger restoration retained | Two-column fields reflow to one column; long Task wraps | Shared internal scrolling added |
| Delete time dialog | Named/ described dialog, non-destructive initial action, containment, Escape, error text, and trigger restoration retained | Complete range/Task/duration stay associated; long Task wraps | Shared internal scrolling added |
| Rename Task dialog | Named/ described dialog, initial description focus, containment, Escape, validation text, and trigger restoration retained | Long input and pending/error states remain usable | Shared internal scrolling added |
| Delete Task dialog | Named/ described dialog, Cancel initial focus, containment, Escape, destructive text, and trigger restoration retained | Long title and summary remain readable | Shared internal scrolling added |
| Shared presentation | Focus rings and state text work in Light/Dark; no status relies only on color | Global reduced-motion rule bounds all animation/transition; no renderer HTTP(S) resources | No change |

## Defects Corrected

1. Normal durations used competing `0h 0m` and unpadded-minute forms. One shared
   normal formatter now produces `0m`, `15m`, `1h 05m`, and `102h 15m`; Analytics
   and History retain their documented `<1m` contexts. Stored values are unchanged.
2. Analytics range buttons exposed radio roles without arrow-key radio behavior.
   The group now supports Left/Up/Right/Down selection, wraparound, roving tabindex,
   and an `aria-disabled` pending state that prevents duplicate activation without
   discarding focus.
3. Conditionally mounted global and per-day Add time dialogs did not restore focus
   after Escape. Both now retain and restore their exact invoking button.
4. Shared dialogs had no constrained-height scrolling contract. All implemented
   dialogs now use a viewport-bounded maximum height and internal vertical scroll;
   short-height footers may wrap.

## Verification Evidence

- Focused repaired-surface suite: 100 tests in 8 files passed before the final
  focus repair; final focused suite passed 85 tests in 5 files.
- Complete renderer suite: 118 tests in 13 files passed.
- Complete regression suite: 680 tests in 81 files passed.
- `npm run typecheck`, `npm run lint`, `npm run format:check`,
  `git diff --check`, and `npm run package` passed. The final package run required
  network access after the sandboxed run could not resolve `github.com`.
- Packaged artifact: `out/Time Tracker-darwin-arm64/Time Tracker.app`, isolated
  profile, `file:` renderer, effective Dark appearance, normal 1040×720 and exact
  configured-minimum 640×480 renderer viewports.
- Packaged keyboard path: Timer navigation focus → Tab → Analytics → Enter;
  Last 7 days → ArrowRight → Last 30 days; Timer → long-description Start → Stop;
  Add time → initial Task focus → Escape → exact Add time trigger restoration.
- At 640×480, Timer, long Task History content, Settings, and Add time had no
  horizontal page overflow. The dialog computed `max-height: 448px`,
  `overflow-y: auto`, and remained within the 480px viewport.
- Renderer console warning/error count was zero and the Resource Timing list had
  zero HTTP(S) resources.
- Screenshots were kept outside the repository at
  `/tmp/timetracker-task010-minimum.png`,
  `/tmp/timetracker-task010-dialog-minimum.png`, and
  `/tmp/timetracker-task010-settings-minimum.png`.

## Scope Review

No domain, IPC, persistence, navigation architecture, visual direction, or new
workflow was introduced. Theme coverage from TASK-010-005, existing Radix dialog
containment/menu behavior, established loading/error states, and global
reduced-motion handling were explicitly reviewed and required no additional code.
