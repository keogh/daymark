import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useDisplayDuration } from '@/renderer/app/use-display-duration';
import type { TimerState } from '@/shared/contracts/timer';

const snapshotNow = 1_000_000;

const runningState: TimerState = {
  status: 'running',
  currentTask: { id: 'task-1', description: 'Focus' },
  sessionStartedAt: snapshotNow - 60_000,
  sessionDurationMs: 60_000,
  taskTodayDurationMs: 60_000,
  taskLifetimeDurationMs: 60_000,
  activeIntervalStartedAt: snapshotNow - 60_000,
  now: snapshotNow,
};

describe('useDisplayDuration', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('advances locally from the authoritative running snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(snapshotNow);
    const { result } = renderHook(() => useDisplayDuration(runningState));

    expect(result.current).toBe(60_000);
    await act(() => vi.advanceTimersByTime(5_000));
    expect(result.current).toBe(65_000);
  });

  it('keeps paused duration fixed as renderer time advances', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(snapshotNow);
    const pausedState: TimerState = {
      ...runningState,
      status: 'paused',
      activeIntervalStartedAt: null,
    };
    const { result } = renderHook(() => useDisplayDuration(pausedState));

    await act(() => vi.advanceTimersByTime(30_000));
    expect(result.current).toBe(60_000);
  });
});
