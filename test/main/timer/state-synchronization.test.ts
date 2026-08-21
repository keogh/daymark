import { describe, expect, it, vi } from 'vitest';

import { TimerPresentationSynchronization } from '@/main/timer/state-synchronization';
import type { TimerState } from '@/shared/contracts/timer';

const idleState: TimerState = {
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null,
  now: 1_000,
};

describe('TimerPresentationSynchronization', () => {
  it('synchronizes and publishes a successful returned timer snapshot', () => {
    const synchronizeTray = vi.fn();
    const publishState = vi.fn();
    const synchronization = new TimerPresentationSynchronization({
      synchronizeTray,
      publishState,
      readState: vi.fn(),
    });
    const result = { ok: true as const, value: idleState };

    expect(synchronization.synchronizeTimerResult(result)).toBe(result);
    expect(synchronizeTray).toHaveBeenCalledWith(idleState);
    expect(publishState).toHaveBeenCalledWith(idleState);
  });

  it('refreshes successful related mutations and ignores failures', () => {
    const synchronizeTray = vi.fn();
    const publishState = vi.fn();
    const readState = vi.fn(() => idleState);
    const synchronization = new TimerPresentationSynchronization({
      synchronizeTray,
      publishState,
      readState,
    });

    synchronization.refreshAfter({ ok: true, value: { id: 'changed' } });
    synchronization.refreshAfter({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'failed' },
    });

    expect(readState).toHaveBeenCalledOnce();
    expect(synchronizeTray).toHaveBeenCalledOnce();
    expect(publishState).toHaveBeenCalledOnce();
  });
});
