import type { TimerAPI } from './timer';
import type { HistoryAPI } from './history';

export const SYSTEM_HEALTH_CHECK_CHANNEL = 'system:health-check';

export type SystemHealth =
  | {
      readonly status: 'ok';
      readonly database: 'ready';
    }
  | {
      readonly status: 'error';
      readonly database: 'unavailable';
    };

export interface TimeTrackerAPI {
  readonly system: {
    healthCheck(): Promise<SystemHealth>;
  };
  readonly timer: TimerAPI;
  readonly history: HistoryAPI;
}

declare global {
  interface Window {
    readonly timeTracker: TimeTrackerAPI;
  }
}
