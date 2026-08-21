import { describe, expect, it } from 'vitest';

import type { Clock } from '@/main/domain/clock';
import {
  createTrayPresentation,
  formatTrayDuration,
  formatTrayTaskDescription,
  getTraySessionDurationMs,
} from '@/main/tray/presentation';
import type { TimerState } from '@/shared/contracts/timer';

const clockAt = (now: number): Clock => ({ now: () => now });

const timerState = (
  status: TimerState['status'],
  overrides: Partial<TimerState> = {},
): TimerState => ({
  status,
  currentTask:
    status === 'idle'
      ? null
      : { id: 'task-1', description: 'Implement authentication' },
  sessionStartedAt: status === 'idle' ? null : 1_000,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: status === 'running' ? 1_000 : null,
  now: 10_000,
  ...overrides,
});

describe('tray presentation', () => {
  it('builds the informational idle menu without timer commands', () => {
    expect(createTrayPresentation(timerState('idle'), clockAt(10_000))).toEqual(
      {
        title: 'Time Tracker',
        tooltip: 'Time Tracker',
        items: [
          { kind: 'information', label: 'Time Tracker' },
          { kind: 'information', label: 'No active timer' },
          { kind: 'separator' },
          { kind: 'command', command: 'open', label: 'Open Time Tracker' },
          { kind: 'separator' },
          { kind: 'command', command: 'quit', label: 'Quit' },
        ],
      },
    );
  });

  it('builds the running menu and advances from the authoritative snapshot', () => {
    const state = timerState('running', { sessionDurationMs: 5_000 });
    const presentation = createTrayPresentation(state, clockAt(12_400));

    expect(presentation.items).toEqual([
      { kind: 'information', label: 'Time Tracker' },
      { kind: 'information', label: 'Implement authentication' },
      { kind: 'information', label: '00:00:07' },
      { kind: 'separator' },
      { kind: 'command', command: 'pause', label: 'Pause' },
      { kind: 'command', command: 'stop', label: 'Stop' },
      { kind: 'separator' },
      { kind: 'command', command: 'open', label: 'Open Time Tracker' },
      { kind: 'separator' },
      { kind: 'command', command: 'quit', label: 'Quit' },
    ]);
  });

  it('builds a fixed paused menu with Resume and Stop', () => {
    const state = timerState('paused', { sessionDurationMs: 5_000 });

    expect(createTrayPresentation(state, clockAt(99_000)).items).toContainEqual(
      {
        kind: 'information',
        label: 'Paused · 00:00:05',
      },
    );
    expect(createTrayPresentation(state, clockAt(99_000)).items).toContainEqual(
      {
        kind: 'command',
        command: 'resume',
        label: 'Resume',
      },
    );
  });

  it('clamps negative snapshot durations and backwards clock deltas', () => {
    expect(
      getTraySessionDurationMs(
        timerState('running', { sessionDurationMs: -1_000 }),
        clockAt(9_000),
      ),
    ).toBe(0);
  });

  it('floors partial seconds and formats unbounded hours', () => {
    expect(formatTrayDuration(1_234)).toBe('00:00:01');
    expect(formatTrayDuration(123 * 3_600_000 + 4 * 60_000 + 5_999)).toBe(
      '123:04:05',
    );
  });
});

describe('tray Task-description presentation', () => {
  it('normalizes Unicode whitespace into one display-only line', () => {
    const stored = '\u2003 Implement\n\t authentication \u00a0 now \u2003';

    expect(formatTrayTaskDescription(stored)).toBe(
      'Implement authentication now',
    );
    expect(stored).toBe(
      '\u2003 Implement\n\t authentication \u00a0 now \u2003',
    );
  });

  it('keeps exactly 80 Unicode code points', () => {
    const description = `${'🐮'.repeat(40)}${'é'.repeat(20)}`;

    expect(Array.from(description)).toHaveLength(80);
    expect(formatTrayTaskDescription(description)).toBe(description);
  });

  it('truncates to 79 code points plus one ellipsis without splitting emoji', () => {
    const description = `${'🐮'.repeat(80)}tail`;
    const formatted = formatTrayTaskDescription(description);

    expect(Array.from(formatted)).toHaveLength(80);
    expect(formatted).toBe(`${'🐮'.repeat(79)}…`);
  });
});
