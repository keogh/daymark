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
}

declare global {
  interface Window {
    readonly timeTracker: TimeTrackerAPI;
  }
}
