import type { AppResult } from './app-result';

export const ANALYTICS_RANGES = ['last-7-days', 'last-30-days'] as const;

export type AnalyticsRange = (typeof ANALYTICS_RANGES)[number];

export interface AnalyticsSummaryInput {
  readonly range: AnalyticsRange;
}

export interface AnalyticsSummary {
  readonly range: AnalyticsRange;
  readonly rangeStartedAt: number;
  readonly rangeEndedAt: number;
  readonly capturedAt: number;
  readonly days: readonly AnalyticsDay[];
  readonly totalDurationMs: number;
  readonly dailyAverageDurationMs: number;
  readonly currentWeek: AnalyticsPeriodTotal;
  readonly currentMonth: AnalyticsPeriodTotal;
  readonly topTasks: readonly AnalyticsTaskTotal[];
  readonly runningTask: AnalyticsRunningTask | null;
}

export interface AnalyticsDay {
  readonly dayStartedAt: number;
  readonly dayEndedAt: number;
  readonly durationMs: number;
}

export interface AnalyticsPeriodTotal {
  readonly periodStartedAt: number;
  readonly periodEndedAt: number;
  readonly durationMs: number;
}

export interface AnalyticsTaskSummary {
  readonly id: string;
  readonly description: string;
}

export interface AnalyticsTaskTotal {
  readonly task: AnalyticsTaskSummary;
  readonly durationMs: number;
  readonly mostRecentActivityAt: number;
}

export interface AnalyticsRunningTask extends AnalyticsTaskTotal {
  readonly intervalStartedAt: number;
}

export interface AnalyticsAPI {
  getSummary(
    this: void,
    input: AnalyticsSummaryInput,
  ): Promise<AppResult<AnalyticsSummary>>;
}
