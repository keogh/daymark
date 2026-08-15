import type { AppResult } from './app-result';

export const INTERVALS_UPDATE_CHANNEL = 'intervals:update';
export const INTERVALS_DELETE_CHANNEL = 'intervals:delete';

export interface UpdateIntervalInput {
  readonly intervalId: string;
  readonly startDate: string;
  readonly startTime: string;
  readonly endDate: string;
  readonly endTime: string;
}

export interface DeleteIntervalInput {
  readonly intervalId: string;
}

export interface IntervalMutationResult {
  readonly intervalId: string;
}

export interface IntervalsAPI {
  update(
    this: void,
    input: UpdateIntervalInput,
  ): Promise<AppResult<IntervalMutationResult>>;
  delete(
    this: void,
    input: DeleteIntervalInput,
  ): Promise<AppResult<IntervalMutationResult>>;
}
