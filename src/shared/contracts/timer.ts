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

export interface StartTaskInput {
  readonly description: string;
}

export interface TimerAPI {
  getState(): Promise<AppResult<TimerState>>;
  start(input: StartTaskInput): Promise<AppResult<TimerState>>;
  pause(): Promise<AppResult<TimerState>>;
  resume(): Promise<AppResult<TimerState>>;
  stop(): Promise<AppResult<TimerState>>;
}
