import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/renderer/components/ui/alert';
import { Button } from '@/renderer/components/ui/button';
import { Spinner } from '@/renderer/components/ui/spinner';
import type { AppResult } from '@/shared/contracts/app-result';
import type {
  HistoryDay,
  HistoryInterval,
  HistoryTask,
} from '@/shared/contracts/history';
import type { TimerState } from '@/shared/contracts/timer';
import {
  formatHistoryDayLabel,
  formatHistoryDuration,
  formatIntervalTime,
} from './history-format';
import {
  useHistoryController,
  type HistoryController,
} from './use-history-controller';
import { useLiveHistoryPage } from './use-live-history-page';
import { formatLocalDateInput } from './local-date-format';
import { EditIntervalDialog } from './EditIntervalDialog';
import { DeleteIntervalDialog } from './DeleteIntervalDialog';

export const DailyHistory = ({
  onAddTime = () => undefined,
  onPlayTask = () =>
    Promise.resolve({
      ok: false as const,
      error: {
        code: 'INTERNAL_ERROR' as const,
        message: 'The timer could not be updated. Please try again.',
      },
    }),
  refreshRevision = 0,
  timer = null,
  onIntervalSaved = () => Promise.resolve(),
}: {
  readonly onAddTime?: (date: string) => void;
  readonly onPlayTask?: (taskId: string) => Promise<AppResult<TimerState>>;
  readonly refreshRevision?: number;
  readonly timer?: TimerState | null;
  readonly onIntervalSaved?: () => Promise<void>;
}) => {
  const controller = useHistoryController(refreshRevision);
  const [pendingRows, setPendingRows] = useState<Record<string, boolean>>({});
  const [historyActionMessage, setHistoryActionMessage] = useState<
    string | null
  >(null);

  const runHistoryTask = async (
    rowId: string,
    taskId: string,
  ): Promise<void> => {
    if (pendingRows[rowId] === true) {
      return;
    }

    setPendingRows((current) => ({ ...current, [rowId]: true }));
    const result = await onPlayTask(taskId);
    setPendingRows((current) => {
      const next = { ...current };
      delete next[rowId];
      return next;
    });

    if (!result.ok && result.error.code === 'TASK_NOT_FOUND') {
      setHistoryActionMessage(result.error.message);
      return;
    }

    if (result.ok) {
      setHistoryActionMessage(null);
    }
  };

  return (
    <section aria-labelledby="history-heading" className="daily-history">
      <h2 className="visually-hidden" id="history-heading">
        Daily history
      </h2>
      <HistoryContent
        controller={controller}
        historyActionMessage={historyActionMessage}
        onPlayTask={runHistoryTask}
        onAddTime={onAddTime}
        pendingRows={pendingRows}
        timer={timer}
        onIntervalSaved={onIntervalSaved}
      />
    </section>
  );
};

const HistoryContent = ({
  controller,
  historyActionMessage,
  onPlayTask,
  onAddTime,
  pendingRows,
  timer,
  onIntervalSaved,
}: {
  controller: HistoryController;
  historyActionMessage: string | null;
  onPlayTask: (rowId: string, taskId: string) => Promise<void>;
  onAddTime: (date: string) => void;
  pendingRows: Record<string, boolean>;
  timer: TimerState | null;
  onIntervalSaved: () => Promise<void>;
}) => {
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

  return (
    <HistoryDays
      controller={controller}
      historyActionMessage={historyActionMessage}
      onPlayTask={onPlayTask}
      onAddTime={onAddTime}
      pendingRows={pendingRows}
      state={controller.loadState}
      timer={timer}
      onIntervalSaved={onIntervalSaved}
    />
  );
};

const HistoryDays = ({
  controller,
  historyActionMessage,
  onPlayTask,
  onAddTime,
  pendingRows,
  state,
  timer,
  onIntervalSaved,
}: {
  controller: HistoryController;
  historyActionMessage: string | null;
  onPlayTask: (rowId: string, taskId: string) => Promise<void>;
  onAddTime: (date: string) => void;
  pendingRows: Record<string, boolean>;
  state: Extract<HistoryController['loadState'], { status: 'ready' }>;
  timer: TimerState | null;
  onIntervalSaved: () => Promise<void>;
}) => {
  const page = useLiveHistoryPage(state.page);
  const hasTrackedTime = page.days.some((day) => day.totalDurationMs > 0);

  return (
    <div className="history-days">
      {historyActionMessage !== null && (
        <p aria-live="polite" className="history-action-status" role="status">
          {historyActionMessage}
        </p>
      )}
      {page.days.map((day) => (
        <HistoryDaySection
          day={day}
          key={day.dayStartedAt}
          now={page.now}
          onPlayTask={onPlayTask}
          onAddTime={onAddTime}
          pendingRows={pendingRows}
          timer={timer}
          onIntervalSaved={onIntervalSaved}
        />
      ))}
      {!hasTrackedTime && (
        <div className="history-empty">
          <p>No tracked time yet.</p>
          <p>Start your first task above.</p>
        </div>
      )}
      {state.reconciliationStatus === 'error' && (
        <Alert className="history-pagination__error">
          <AlertDescription>
            History could not be refreshed. Showing the last update.
          </AlertDescription>
          <Button
            onClick={() => void controller.reconcile()}
            size="sm"
            type="button"
            variant="outline"
          >
            Retry refresh
          </Button>
        </Alert>
      )}
      <HistoryPagination controller={controller} state={state} />
    </div>
  );
};

const HistoryPagination = ({
  controller,
  state,
}: {
  controller: HistoryController;
  state: Extract<HistoryController['loadState'], { status: 'ready' }>;
}) => {
  const exhaustedStatusRef = useRef<HTMLParagraphElement>(null);
  const wasLoading = useRef(false);
  const hasOlderPage = state.page.nextBeforeDayStartedAt !== null;
  const isLoading = state.olderPageStatus === 'loading';

  useEffect(() => {
    if (wasLoading.current && !isLoading && !hasOlderPage) {
      exhaustedStatusRef.current?.focus();
    }
    wasLoading.current = isLoading;
  }, [hasOlderPage, isLoading]);

  if (!hasOlderPage) {
    return (
      <p
        className="history-pagination__exhausted visually-hidden"
        ref={exhaustedStatusRef}
        role="status"
        tabIndex={-1}
      >
        All history loaded.
      </p>
    );
  }

  return (
    <div className="history-pagination">
      {state.olderPageStatus === 'error' && (
        <Alert className="history-pagination__error">
          <AlertDescription>
            Older history could not be loaded.
          </AlertDescription>
          <Button
            onClick={() => void controller.loadOlder()}
            size="sm"
            type="button"
            variant="outline"
          >
            Retry
          </Button>
        </Alert>
      )}
      {state.olderPageStatus !== 'error' && (
        <Button
          disabled={isLoading}
          onClick={() => void controller.loadOlder()}
          size="sm"
          type="button"
          variant="outline"
        >
          {isLoading ? 'Loading older…' : 'Load older'}
        </Button>
      )}
    </div>
  );
};

const HistoryDaySection = ({
  day,
  now,
  onPlayTask,
  onAddTime,
  pendingRows,
  timer,
  onIntervalSaved,
}: {
  day: HistoryDay;
  now: number;
  onPlayTask: (rowId: string, taskId: string) => Promise<void>;
  onAddTime: (date: string) => void;
  pendingRows: Record<string, boolean>;
  timer: TimerState | null;
  onIntervalSaved: () => Promise<void>;
}) => (
  <section
    aria-labelledby={`history-day-${day.dayStartedAt}`}
    className="history-day"
  >
    <div className="history-day__heading">
      <div>
        <h3 id={`history-day-${day.dayStartedAt}`}>
          {formatHistoryDayLabel(day.dayStartedAt, now)}
        </h3>
        <p>{formatHistoryDuration(day.totalDurationMs)}</p>
      </div>
      <Button
        aria-label={`Add time for ${formatHistoryDayLabel(day.dayStartedAt, now)}`}
        onClick={() => onAddTime(formatLocalDateInput(day.dayStartedAt))}
        size="sm"
        type="button"
        variant="outline"
      >
        Add time
      </Button>
    </div>
    {day.tasks.map((task) => (
      <HistoryTaskRow
        day={day}
        key={task.task.id}
        onPlayTask={onPlayTask}
        pendingRows={pendingRows}
        task={task}
        timer={timer}
        onIntervalSaved={onIntervalSaved}
      />
    ))}
  </section>
);

const HistoryTaskRow = ({
  day,
  onPlayTask,
  pendingRows,
  task,
  timer,
  onIntervalSaved,
}: {
  day: HistoryDay;
  onPlayTask: (rowId: string, taskId: string) => Promise<void>;
  pendingRows: Record<string, boolean>;
  task: HistoryTask;
  timer: TimerState | null;
  onIntervalSaved: () => Promise<void>;
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [editInterval, setEditInterval] = useState<HistoryInterval | null>(
    null,
  );
  const [deleteInterval, setDeleteInterval] = useState<HistoryInterval | null>(
    null,
  );
  const editReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const deleteReturnFocusRef = useRef<HTMLButtonElement | null>(null);
  const intervalListId = `history-intervals-${day.dayStartedAt}-${task.task.id}`;
  const rowId = `${day.dayStartedAt}:${task.task.id}`;
  const isPending = pendingRows[rowId] === true;
  const isSameTask = timer?.currentTask?.id === task.task.id;
  const isAlreadyRunning = timer?.status === 'running' && isSameTask;
  const actionLabel = isAlreadyRunning
    ? 'Already running'
    : isPending
      ? timer?.status === 'paused' && isSameTask
        ? 'Resuming…'
        : 'Starting…'
      : timer?.status === 'paused' && isSameTask
        ? 'Resume'
        : 'Play';

  return (
    <div className="history-task">
      <div className="history-task__header">
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
        <Button
          aria-label={`${actionLabel} ${task.task.description}`}
          className="history-task__action"
          disabled={isPending || isAlreadyRunning}
          onClick={() => void onPlayTask(rowId, task.task.id)}
          size="sm"
          type="button"
          variant={isAlreadyRunning ? 'outline' : 'default'}
        >
          {actionLabel}
        </Button>
      </div>
      {isExpanded && (
        <ul className="history-intervals" id={intervalListId}>
          {task.intervals.map((interval) => (
            <HistoryIntervalRow
              day={day}
              interval={interval}
              key={interval.id}
              onEdit={(trigger) => {
                editReturnFocusRef.current = trigger;
                setEditInterval(interval);
              }}
              onDelete={(trigger) => {
                deleteReturnFocusRef.current = trigger;
                setDeleteInterval(interval);
              }}
              taskDescription={task.task.description}
            />
          ))}
        </ul>
      )}
      {editInterval !== null && (
        <EditIntervalDialog
          interval={editInterval}
          onOpenChange={(open) => {
            if (!open) {
              setEditInterval(null);
              window.setTimeout(() => editReturnFocusRef.current?.focus(), 0);
            }
          }}
          onSaved={onIntervalSaved}
          open
          taskDescription={task.task.description}
        />
      )}
      {deleteInterval !== null && (
        <DeleteIntervalDialog
          interval={deleteInterval}
          onDeleted={onIntervalSaved}
          onOpenChange={(open) => {
            if (!open) {
              setDeleteInterval(null);
              window.setTimeout(() => deleteReturnFocusRef.current?.focus(), 0);
            }
          }}
          open
          taskDescription={task.task.description}
        />
      )}
    </div>
  );
};

const HistoryIntervalRow = ({
  day,
  interval,
  onEdit,
  onDelete,
  taskDescription,
}: {
  day: HistoryDay;
  interval: HistoryInterval;
  onEdit: (trigger: HTMLButtonElement) => void;
  onDelete: (trigger: HTMLButtonElement) => void;
  taskDescription: string;
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
      {interval.isRunning ? (
        <span className="history-interval__status">
          Running · actions unavailable
        </span>
      ) : (
        <span
          aria-label={`Actions for ${start} to ${end}`}
          className="history-interval__actions"
          role="group"
        >
          <Button
            aria-label={`Edit ${taskDescription}, ${start} to ${end}`}
            onClick={(event) => onEdit(event.currentTarget)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Edit
          </Button>
          <Button
            aria-label={`Delete ${taskDescription}, ${start} to ${end}`}
            onClick={(event) => onDelete(event.currentTarget)}
            size="sm"
            type="button"
            variant="ghost"
          >
            Delete
          </Button>
        </span>
      )}
    </li>
  );
};
