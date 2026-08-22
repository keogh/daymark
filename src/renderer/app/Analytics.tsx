import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/renderer/components/ui/alert';
import { Button } from '@/renderer/components/ui/button';
import { Spinner } from '@/renderer/components/ui/spinner';
import type {
  AnalyticsDay,
  AnalyticsRange,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';
import { formatDuration } from './duration-format';
import {
  useAnalyticsController,
  type AnalyticsController,
} from './use-analytics-controller';
import { projectLiveAnalytics } from './project-live-analytics';
import { useEffect, useState, type KeyboardEvent } from 'react';

const RANGE_LABELS: Record<AnalyticsRange, string> = {
  'last-7-days': 'Last 7 days',
  'last-30-days': 'Last 30 days',
};

export const Analytics = ({
  refreshRevision = 0,
  invalidationRevision = 0,
}: {
  refreshRevision?: number;
  invalidationRevision?: number;
}) => {
  const controller = useAnalyticsController(
    refreshRevision,
    invalidationRevision,
  );

  return (
    <section aria-labelledby="analytics-heading" className="analytics-view">
      <header className="analytics-view__header">
        <h2 id="analytics-heading">Analytics</h2>
        <p>Recent tracked time</p>
      </header>
      <RangeSelector controller={controller} />

      {controller.loadState.status === 'loading' && <AnalyticsLoading />}
      {controller.loadState.status === 'error' && (
        <AnalyticsUnavailable onRetry={controller.retry} />
      )}
      {controller.loadState.status === 'ready' && (
        <AnalyticsSummaryView
          controller={controller}
          summary={controller.loadState.summary}
        />
      )}
    </section>
  );
};

const ANALYTICS_RANGES = ['last-7-days', 'last-30-days'] as const;

const RangeSelector = ({ controller }: { controller: AnalyticsController }) => {
  const selectAdjacentRange = (
    event: KeyboardEvent<HTMLButtonElement>,
    range: AnalyticsRange,
  ) => {
    const direction =
      event.key === 'ArrowRight' || event.key === 'ArrowDown'
        ? 1
        : event.key === 'ArrowLeft' || event.key === 'ArrowUp'
          ? -1
          : 0;
    if (direction === 0 || controller.pendingRange !== null) return;

    event.preventDefault();
    const currentIndex = ANALYTICS_RANGES.indexOf(range);
    const nextIndex =
      (currentIndex + direction + ANALYTICS_RANGES.length) %
      ANALYTICS_RANGES.length;
    const nextRange = ANALYTICS_RANGES[nextIndex]!;
    controller.selectRange(nextRange);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[data-range="${nextRange}"]`)
      ?.focus();
  };

  return (
    <fieldset className="analytics-ranges" role="radiogroup">
      <legend className="visually-hidden">Analytics range</legend>
      {ANALYTICS_RANGES.map((range) => (
        <Button
          aria-checked={controller.selectedRange === range}
          aria-disabled={controller.pendingRange === range}
          aria-label={`${RANGE_LABELS[range]}${controller.pendingRange === range ? ', loading' : ''}`}
          className="analytics-ranges__option"
          data-range={range}
          key={range}
          onClick={() => {
            if (controller.pendingRange !== range)
              controller.selectRange(range);
          }}
          onKeyDown={(event) => selectAdjacentRange(event, range)}
          role="radio"
          tabIndex={controller.selectedRange === range ? 0 : -1}
          type="button"
          variant={controller.selectedRange === range ? 'default' : 'outline'}
        >
          {RANGE_LABELS[range]}
        </Button>
      ))}
    </fieldset>
  );
};

const AnalyticsLoading = () => (
  <div className="analytics-state" role="status">
    <Spinner aria-hidden="true" />
    <p>Loading analytics…</p>
  </div>
);

const AnalyticsUnavailable = ({ onRetry }: { onRetry: () => void }) => (
  <Alert className="analytics-state" variant="destructive">
    <AlertTitle>Analytics unavailable</AlertTitle>
    <AlertDescription>
      Analytics could not be loaded. Please try again.
    </AlertDescription>
    <Button onClick={onRetry} type="button" variant="outline">
      Retry
    </Button>
  </Alert>
);

const AnalyticsSummaryView = ({
  controller,
  summary,
}: {
  controller: AnalyticsController;
  summary: AnalyticsSummary;
}) => {
  const liveSummary = useLiveSummary(summary);
  const denominator = summary.range === 'last-7-days' ? 7 : 30;
  return (
    <div
      aria-busy={controller.pendingRange !== null}
      className="analytics-content"
    >
      {controller.pendingRange !== null && (
        <p className="analytics-notice" role="status">
          Loading {RANGE_LABELS[controller.pendingRange]}. Showing{' '}
          {RANGE_LABELS[summary.range]} until it is ready.
        </p>
      )}
      {controller.refreshError && (
        <Alert className="analytics-warning">
          <AlertTitle>Analytics could not be refreshed</AlertTitle>
          <AlertDescription>
            Showing the last available{' '}
            {RANGE_LABELS[summary.range].toLowerCase()} data.
          </AlertDescription>
          <Button onClick={controller.retry} type="button" variant="outline">
            Retry {RANGE_LABELS[controller.selectedRange]}
          </Button>
        </Alert>
      )}

      <p className="analytics-range-label">
        Showing {RANGE_LABELS[summary.range]}
      </p>
      <dl className="analytics-metrics analytics-metrics--primary">
        <Metric
          label="Total"
          value={formatAnalyticsDuration(liveSummary.totalDurationMs)}
        />
        <Metric
          label={`Daily average · ${denominator} days`}
          value={formatAnalyticsDuration(liveSummary.dailyAverageDurationMs)}
        />
      </dl>
      <dl className="analytics-metrics">
        <Metric
          label={`Current week (${formatWeekStart(summary.currentWeek.periodStartedAt)} to today)`}
          value={formatAnalyticsDuration(liveSummary.currentWeek.durationMs)}
        />
        <Metric
          label="Current month (to today)"
          value={formatAnalyticsDuration(liveSummary.currentMonth.durationMs)}
        />
      </dl>

      {liveSummary.totalDurationMs === 0 && (
        <p className="analytics-empty">No time tracked in this period.</p>
      )}
      <DailyChart days={liveSummary.days} capturedAt={liveSummary.capturedAt} />
      <TopTasks summary={liveSummary} />
    </div>
  );
};

const formatWeekStart = (periodStartedAt: number): string =>
  new Intl.DateTimeFormat(undefined, { weekday: 'long' }).format(
    periodStartedAt,
  );

const useLiveSummary = (summary: AnalyticsSummary): AnalyticsSummary => {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (summary.runningTask === null) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1_000);
    return () => window.clearInterval(interval);
  }, [summary]);

  return projectLiveAnalytics(summary, now);
};

const Metric = ({ label, value }: { label: string; value: string }) => (
  <div className="analytics-metric">
    <dt>{label}</dt>
    <dd>{value}</dd>
  </div>
);

const DailyChart = ({
  days,
  capturedAt,
}: {
  days: readonly AnalyticsDay[];
  capturedAt: number;
}) => {
  const maximum = Math.max(0, ...days.map((day) => day.durationMs));
  return (
    <section
      aria-labelledby="tracked-time-heading"
      className="analytics-section"
    >
      <h3 id="tracked-time-heading">Tracked time</h3>
      <div
        aria-hidden="true"
        className="analytics-chart"
        data-count={days.length}
      >
        {days.map((day) => {
          const magnitude =
            maximum === 0 ? 0 : (day.durationMs / maximum) * 100;
          const height = day.durationMs > 0 ? Math.max(3, magnitude) : 0;
          return (
            <div className="analytics-chart__datum" key={day.dayStartedAt}>
              <span className="analytics-chart__bar-track">
                <span
                  className="analytics-chart__bar"
                  style={{ height: `${height}%` }}
                />
              </span>
              <span>{formatShortDate(day.dayStartedAt, capturedAt)}</span>
            </div>
          );
        })}
      </div>
      <ol className="visually-hidden" aria-label="Daily tracked time">
        {days.map((day) => (
          <li key={day.dayStartedAt}>
            {formatAccessibleDate(day.dayStartedAt, capturedAt)}:{' '}
            {formatAnalyticsDuration(day.durationMs)}
          </li>
        ))}
      </ol>
    </section>
  );
};

const TopTasks = ({ summary }: { summary: AnalyticsSummary }) => (
  <section aria-labelledby="top-tasks-heading" className="analytics-section">
    <h3 id="top-tasks-heading">Top tasks</h3>
    {summary.topTasks.length === 0 ? (
      <p className="analytics-section__empty">No tasks in this period.</p>
    ) : (
      <ol className="analytics-tasks">
        {summary.topTasks.slice(0, 5).map((entry) => (
          <li key={entry.task.id}>
            <span>{entry.task.description}</span>
            <span>{formatAnalyticsDuration(entry.durationMs)}</span>
          </li>
        ))}
      </ol>
    )}
  </section>
);

const formatAnalyticsDuration = (durationMs: number) =>
  durationMs > 0 && durationMs < 60_000 ? '<1m' : formatDuration(durationMs);

const isToday = (timestamp: number, capturedAt: number) => {
  const date = new Date(timestamp);
  const today = new Date(capturedAt);
  return (
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate()
  );
};

const formatShortDate = (timestamp: number, capturedAt: number) =>
  isToday(timestamp, capturedAt)
    ? 'Today'
    : new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: 'numeric',
      }).format(timestamp);

const formatAccessibleDate = (timestamp: number, capturedAt: number) => {
  const label = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'full',
  }).format(timestamp);
  return isToday(timestamp, capturedAt) ? `${label} (Today)` : label;
};
