import { describe, expect, it, vi } from 'vitest';

import { publishTimerState } from '@/main/timer/state-publisher';
import type { TimerStatePublicationWindow } from '@/main/timer/state-publisher';
import {
  TIMER_STATE_CHANGED_CHANNEL,
  type TimerState,
} from '@/shared/contracts/timer';

const state: TimerState = {
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null,
  now: 1_000,
};

describe('publishTimerState', () => {
  it('publishes only to live windows with live web contents', () => {
    const liveSend = vi.fn();
    const destroyedWindowSend = vi.fn();
    const destroyedContentsSend = vi.fn();

    publishTimerState(
      [
        window(false, false, liveSend),
        window(true, false, destroyedWindowSend),
        window(false, true, destroyedContentsSend),
      ],
      state,
    );

    expect(liveSend).toHaveBeenCalledWith(TIMER_STATE_CHANGED_CHANNEL, state);
    expect(destroyedWindowSend).not.toHaveBeenCalled();
    expect(destroyedContentsSend).not.toHaveBeenCalled();
  });
});

const window = (
  destroyed: boolean,
  contentsDestroyed: boolean,
  send: (channel: string, state: TimerState) => void,
): TimerStatePublicationWindow => ({
  isDestroyed: () => destroyed,
  webContents: { isDestroyed: () => contentsDestroyed, send },
});
