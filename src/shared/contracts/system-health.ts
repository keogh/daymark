import type { TimerAPI } from './timer';
import type { HistoryAPI } from './history';
import type { IntervalsAPI } from './intervals';
import type { ManualTimeAPI } from './manual-time';
import type { TasksAPI } from './tasks';

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
  readonly intervals: IntervalsAPI;
  readonly manualTime: ManualTimeAPI;
  readonly tasks: TasksAPI;
}

declare global {
  interface Window {
    readonly timeTracker: TimeTrackerAPI;
  }
}
