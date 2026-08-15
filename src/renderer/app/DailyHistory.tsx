import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/renderer/components/ui/alert';
import { Button } from '@/renderer/components/ui/button';
import { Spinner } from '@/renderer/components/ui/spinner';
import type {
  HistoryDay,
  HistoryInterval,
  HistoryPage,
  HistoryTask,
} from '@/shared/contracts/history';
import {
  formatHistoryDayLabel,
  formatHistoryDuration,
  formatIntervalTime,
} from './history-format';
import {
  useHistoryController,
  type HistoryController,
} from './use-history-controller';

export const DailyHistory = () => {
  const controller = useHistoryController();

  return (
    <section aria-labelledby="history-heading" className="daily-history">
      <h2 className="visually-hidden" id="history-heading">
        Daily history
      </h2>
      <HistoryContent controller={controller} />
    </section>
  );
};

const HistoryContent = ({ controller }: { controller: HistoryController }) => {
  if (controller.loadState.status === 'loading') {
    return (
      <div className="history-loading" role="status">
        <Spinner aria-hidden="true" />
        <span>Loading history…</span>
      </div>
    );
  }

  if (controller.loadState.status === 'error') {
    return (
      <Alert className="history-error">
        <AlertTitle>History unavailable</AlertTitle>
        <AlertDescription>Your timer is still available.</AlertDescription>
        <Button onClick={() => void controller.retry()} size="sm" type="button">
          Retry
        </Button>
      </Alert>
    );
  }

  return <HistoryDays page={controller.loadState.page} />;
};

const HistoryDays = ({ page }: { page: HistoryPage }) => {
  const hasTrackedTime = page.days.some((day) => day.totalDurationMs > 0);

  return (
    <div className="history-days">
      {page.days.map((day) => (
        <HistoryDaySection day={day} key={day.dayStartedAt} now={page.now} />
      ))}
      {!hasTrackedTime && (
        <div className="history-empty">
          <p>No tracked time yet.</p>
          <p>Start your first task above.</p>
        </div>
      )}
    </div>
  );
};

const HistoryDaySection = ({ day, now }: { day: HistoryDay; now: number }) => (
  <section
    aria-labelledby={`history-day-${day.dayStartedAt}`}
    className="history-day"
  >
    <div className="history-day__heading">
      <h3 id={`history-day-${day.dayStartedAt}`}>
        {formatHistoryDayLabel(day.dayStartedAt, now)}
      </h3>
      <p>{formatHistoryDuration(day.totalDurationMs)}</p>
    </div>
    {day.tasks.map((task) => (
      <HistoryTaskRow day={day} key={task.task.id} task={task} />
    ))}
  </section>
);

const HistoryTaskRow = ({
  day,
  task,
}: {
  day: HistoryDay;
  task: HistoryTask;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const intervalListId = `history-intervals-${day.dayStartedAt}-${task.task.id}`;

  return (
    <div className="history-task">
      <button
        aria-label={task.task.description}
        aria-controls={intervalListId}
        aria-expanded={isExpanded}
        className="history-task__toggle"
        onClick={() => setIsExpanded((expanded) => !expanded)}
        type="button"
      >
        <span className="history-task__copy">
          <span className="history-task__description">
            {task.task.description}
          </span>
          <span className="history-task__totals">
            {formatHistoryDuration(task.dayDurationMs)} today ·{' '}
            {formatHistoryDuration(task.lifetimeDurationMs)} total
          </span>
        </span>
        <ChevronDown aria-hidden="true" className="history-task__chevron" />
      </button>
      {isExpanded && (
        <ul className="history-intervals" id={intervalListId}>
          {task.intervals.map((interval) => (
            <HistoryIntervalRow
              day={day}
              interval={interval}
              key={interval.id}
            />
          ))}
        </ul>
      )}
    </div>
  );
};

const HistoryIntervalRow = ({
  day,
  interval,
}: {
  day: HistoryDay;
  interval: HistoryInterval;
}) => {
  const start = formatIntervalTime(interval.projectedStartedAt, false);
  const end = formatIntervalTime(
    interval.projectedEndedAt,
    interval.projectedEndedAt === day.dayEndedAt,
  );
  const duration = formatHistoryDuration(interval.durationMs, true);

  return (
    <li
      aria-label={`${start} to ${end}, ${duration}`}
      className="history-interval"
    >
      <span>
        {start} – {end}
      </span>
      <span>{duration}</span>
    </li>
  );
};
