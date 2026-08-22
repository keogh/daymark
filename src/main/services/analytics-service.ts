import type {
  AnalyticsIntervalRecord,
  AnalyticsQueries,
} from '@/main/database/repositories/analytics-query-repository';
import type { Clock } from '@/main/domain/clock';
import {
  projectAnalyticsSummary,
  resolveAnalyticsDays,
  resolveCurrentMonth,
  resolveCurrentWeek,
  type AnalyticsTaskProjectionInput,
} from '@/main/services/analytics-projections';
import type {
  AnalyticsSummary,
  AnalyticsSummaryInput,
} from '@/shared/contracts/analytics';
import type { SettingsRepository } from '@/main/database/repositories/settings-repository';

export interface AnalyticsServiceDependencies {
  readonly clock: Clock;
  readonly analyticsQueries: AnalyticsQueries;
  readonly settings: Pick<SettingsRepository, 'get'>;
}

export class AnalyticsService {
  readonly #clock: Clock;
  readonly #analyticsQueries: AnalyticsQueries;
  readonly #settings: AnalyticsServiceDependencies['settings'];

  constructor(dependencies: AnalyticsServiceDependencies) {
    this.#clock = dependencies.clock;
    this.#analyticsQueries = dependencies.analyticsQueries;
    this.#settings = dependencies.settings;
  }

  getSummary(input: AnalyticsSummaryInput): AnalyticsSummary {
    const capturedAt = this.#clock.now();
    const { weekStartsOn } = this.#settings.get();
    const selectedDays = resolveAnalyticsDays(input.range, capturedAt);
    const currentWeek = resolveCurrentWeek(capturedAt, weekStartsOn);
    const currentMonth = resolveCurrentMonth(capturedAt);
    const records = this.#analyticsQueries.findOverlappingUnion({
      selectedRangeStartedAt: selectedDays[0]!.dayStartedAt,
      currentWeekStartedAt: currentWeek.periodStartedAt,
      currentMonthStartedAt: currentMonth.periodStartedAt,
      capturedAt,
    });

    return projectAnalyticsSummary({
      range: input.range,
      capturedAt,
      weekStartsOn,
      tasks: groupRecordsByTask(records),
    });
  }
}

const groupRecordsByTask = (
  records: readonly AnalyticsIntervalRecord[],
): AnalyticsTaskProjectionInput[] => {
  const tasks = new Map<string, AnalyticsTaskProjectionInput>();

  for (const record of records) {
    const existing = tasks.get(record.task.id);
    if (existing === undefined) {
      tasks.set(record.task.id, {
        task: record.task,
        intervals: [record.interval],
      });
    } else {
      (existing.intervals as (typeof record.interval)[]).push(record.interval);
    }
  }

  return [...tasks.values()];
};
