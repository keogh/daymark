import type { AppResult } from './app-result';

export const TIMER_GET_STATE_CHANNEL = 'timer:get-state';
export const TIMER_START_CHANNEL = 'timer:start';
export const TIMER_PAUSE_CHANNEL = 'timer:pause';
export const TIMER_RESUME_CHANNEL = 'timer:resume';
export const TIMER_STOP_CHANNEL = 'timer:stop';

export type TimerStatus = 'idle' | 'running' | 'paused';

export interface TimerTask {
  readonly id: string;
  readonly description: string;
}

export interface TimerState {
  readonly status: TimerStatus;
  readonly currentTask: TimerTask | null;
  readonly sessionStartedAt: number | null;
  readonly sessionDurationMs: number;
  readonly taskTodayDurationMs: number;
  readonly taskLifetimeDurationMs: number;
  readonly activeIntervalStartedAt: number | null;
  readonly now: number;
}

export type StartTaskInput =
  | {
      readonly source: 'description';
      readonly description: string;
    }
  | {
      readonly source: 'existing-task';
      readonly taskId: string;
    };

export interface TimerAPI {
  getState(this: void): Promise<AppResult<TimerState>>;
  start(this: void, input: StartTaskInput): Promise<AppResult<TimerState>>;
  pause(this: void): Promise<AppResult<TimerState>>;
  resume(this: void): Promise<AppResult<TimerState>>;
  stop(this: void): Promise<AppResult<TimerState>>;
}
