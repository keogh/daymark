import {
  TIMER_STATE_CHANGED_CHANNEL,
  type TimerState,
} from '@/shared/contracts/timer';

export interface TimerStatePublicationWindow {
  isDestroyed(): boolean;
  webContents: {
    isDestroyed(): boolean;
    send(channel: string, state: TimerState): void;
  };
}

export const publishTimerState = (
  windows: readonly TimerStatePublicationWindow[],
  state: TimerState,
): void => {
  for (const window of windows) {
    if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
      window.webContents.send(TIMER_STATE_CHANGED_CHANNEL, state);
    }
  }
};
