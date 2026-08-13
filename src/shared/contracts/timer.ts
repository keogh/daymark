import type { AppResult } from './app-result';

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
