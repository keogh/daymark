import type { TimerStatus } from '@/shared/contracts/timer';

export interface AppState {
  readonly id: 1;
  readonly timerStatus: TimerStatus;
  readonly currentTaskId: string | null;
  readonly sessionStartedAt: number | null;
  readonly updatedAt: number;
}
