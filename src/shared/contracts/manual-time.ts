import type { AppResult } from './app-result';

export const MANUAL_TIME_CREATE_INTERVAL_CHANNEL =
  'manual-time:create-interval';

export interface CreateManualIntervalInput {
  readonly taskId?: string;
  readonly taskDescription?: string;
  readonly date: string;
  readonly startTime: string;
  readonly endTime: string;
}

export interface ManualIntervalCreateResult {
  readonly intervalId: string;
}

export interface ManualTimeAPI {
  createInterval(
    this: void,
    input: CreateManualIntervalInput,
  ): Promise<AppResult<ManualIntervalCreateResult>>;
}
