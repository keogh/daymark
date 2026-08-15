import type { AppResult } from './app-result';

export const HISTORY_GET_PAGE_CHANNEL = 'history:get-page';
export const HISTORY_ACTIVITY_DAY_LIMIT = 30;

export interface HistoryPageInput {
  readonly beforeDayStartedAt?: number;
}

export interface HistoryPage {
  readonly days: HistoryDay[];
  readonly nextBeforeDayStartedAt: number | null;
  readonly now: number;
}

export interface HistoryDay {
  readonly dayStartedAt: number;
  readonly dayEndedAt: number;
  readonly totalDurationMs: number;
  readonly tasks: HistoryTask[];
}

export interface HistoryTask {
  readonly task: HistoryTaskSummary;
  readonly dayDurationMs: number;
  readonly lifetimeDurationMs: number;
  readonly mostRecentActivityAt: number;
  readonly intervals: HistoryInterval[];
}

export interface HistoryTaskSummary {
  readonly id: string;
  readonly description: string;
}

export interface HistoryInterval {
  readonly id: string;
  readonly projectedStartedAt: number;
  readonly projectedEndedAt: number;
  readonly durationMs: number;
  readonly isRunning: boolean;
}

export interface HistoryAPI {
  getPage(this: void, input: HistoryPageInput): Promise<AppResult<HistoryPage>>;
}
