import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
  type SubmitEvent,
} from 'react';

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from '@/renderer/components/ui/alert';
import { Button } from '@/renderer/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/renderer/components/ui/field';
import { Input } from '@/renderer/components/ui/input';
import { Spinner } from '@/renderer/components/ui/spinner';
import type { TimerState } from '@/shared/contracts/timer';
import { DailyHistory } from './DailyHistory';
import { ManualTimeEntryDialog } from './ManualTimeEntryDialog';
import { formatLocalDateInput } from './local-date-format';
import { formatClockDuration, formatHoursAndMinutes } from './duration-format';
import { useDisplayDuration } from './use-display-duration';
import { useTaskSuggestions } from './use-task-suggestions';
import {
  useTimerController,
  type TimerController,
} from './use-timer-controller';

export const App = () => {
  const controller = useTimerController();
  const [manualEntryDate, setManualEntryDate] = useState<string | null>(null);

  const openGlobalManualEntry = () =>
    setManualEntryDate(formatLocalDateInput(Date.now()));

  return (
    <main className="app-shell">
      <header className="app-header">
        <h1>Time Tracker</h1>
      </header>

      <section aria-label="Timer" className="timer-view">
        {controller.loadState.status === 'loading' && <LoadingTimer />}
        {controller.loadState.status === 'error' && <LoadError />}
        {controller.loadState.status === 'ready' &&
          controller.loadState.timer.status === 'idle' && (
            <IdleTimer controller={controller} />
          )}
        {controller.loadState.status === 'ready' &&
          controller.loadState.timer.status !== 'idle' && (
            <ActiveTimer
              controller={controller}
              timer={controller.loadState.timer}
            />
          )}
      </section>
      <div className="global-manual-entry">
        <Button onClick={openGlobalManualEntry} type="button" variant="outline">
          Add time
        </Button>
      </div>
      <DailyHistory
        onAddTime={(date) => setManualEntryDate(date)}
        onIntervalSaved={controller.refresh}
        onPlayTask={controller.switchToTask}
        onTaskRenamed={controller.refresh}
        refreshRevision={controller.authoritativeRevision}
        timer={
          controller.loadState.status === 'ready'
            ? controller.loadState.timer
            : null
        }
      />
      {manualEntryDate !== null && (
        <ManualTimeEntryDialog
          initialDate={manualEntryDate}
          onOpenChange={(open) => {
            if (!open) setManualEntryDate(null);
          }}
          onSaved={controller.refresh}
          open
        />
      )}
    </main>
  );
};

const LoadingTimer = () => (
  <div className="timer-message" role="status">
    <Spinner aria-hidden="true" className="timer-message__spinner" />
    <p>Loading timer…</p>
  </div>
);

const LoadError = () => (
  <Alert className="timer-message timer-message--error" variant="destructive">
    <AlertTitle>Timer unavailable</AlertTitle>
    <AlertDescription>
      The timer could not be loaded. Please restart the application.
    </AlertDescription>
  </Alert>
);

interface IdleTimerProps {
  readonly controller: TimerController;
}

const IdleTimer = ({ controller }: IdleTimerProps) => {
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const suggestions = useTaskSuggestions();
  const listIsVisible =
    suggestions.isOpen &&
    !suggestions.isLoading &&
    suggestions.error === null &&
    suggestions.suggestions.length > 0;
  const highlightedSuggestion =
    suggestions.highlightedIndex === null
      ? undefined
      : suggestions.suggestions[suggestions.highlightedIndex];

  useEffect(() => {
    inputRef.current?.focus();
  }, [controller.commandError]);

  const submit = (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    suggestions.close();
    void controller.start(description);
  };

  const startSuggestion = (taskId: string) => {
    suggestions.close();
    void controller.startExistingTask(taskId);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (listIsVisible) {
        event.preventDefault();
        suggestions.moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }
    if (event.key === 'Escape') {
      if (suggestions.isOpen) {
        event.preventDefault();
        suggestions.close();
      }
      return;
    }
    if (event.key === 'Enter' && highlightedSuggestion !== undefined) {
      event.preventDefault();
      startSuggestion(highlightedSuggestion.task.id);
    }
  };

  return (
    <div className="idle-timer">
      <h2>What are you working on?</h2>
      <form className="start-form" onSubmit={submit}>
        <Field
          className="start-form__field"
          data-invalid={controller.commandError !== null}
        >
          <FieldLabel className="visually-hidden" htmlFor="task-description">
            Task description
          </FieldLabel>
          <div className="task-combobox">
            <Input
              className="min-h-14 px-4 text-base"
              aria-activedescendant={
                listIsVisible && suggestions.highlightedIndex !== null
                  ? `${listboxId}-option-${suggestions.highlightedIndex}`
                  : undefined
              }
              aria-autocomplete="list"
              aria-busy={suggestions.isLoading}
              aria-controls={listboxId}
              aria-describedby={
                controller.commandError === null ? undefined : 'start-error'
              }
              aria-expanded={listIsVisible}
              aria-invalid={controller.commandError !== null}
              autoComplete="off"
              disabled={controller.activeCommand === 'start'}
              id="task-description"
              onBlur={suggestions.close}
              onChange={(event) => {
                const nextDescription = event.target.value;
                setDescription(nextDescription);
                if (controller.commandError !== null) {
                  controller.clearCommandError();
                }
                void suggestions.load(nextDescription);
              }}
              onFocus={() => void suggestions.load(description)}
              onKeyDown={handleKeyDown}
              placeholder="Task description..."
              ref={inputRef}
              role="combobox"
              type="text"
              value={description}
            />
            {listIsVisible && (
              <div
                aria-label="Task suggestions"
                className="task-suggestions"
                id={listboxId}
                role="listbox"
              >
                {suggestions.suggestions.map((suggestion, index) => (
                  <button
                    aria-selected={suggestions.highlightedIndex === index}
                    className="task-suggestion"
                    data-highlighted={suggestions.highlightedIndex === index}
                    id={`${listboxId}-option-${index}`}
                    key={suggestion.task.id}
                    onClick={() => startSuggestion(suggestion.task.id)}
                    onMouseDown={(event) => event.preventDefault()}
                    role="option"
                    tabIndex={-1}
                    type="button"
                  >
                    <span className="task-suggestion__description">
                      {suggestion.task.description}
                    </span>
                    <span className="task-suggestion__totals">
                      Today {formatHoursAndMinutes(suggestion.todayDurationMs)}{' '}
                      · Total{' '}
                      {formatHoursAndMinutes(suggestion.lifetimeDurationMs)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
          {suggestions.error !== null && (
            <p className="task-suggestions__error" role="status">
              {suggestions.error.message}
            </p>
          )}
          <p aria-live="polite" className="visually-hidden" role="status">
            {listIsVisible
              ? `${suggestions.suggestions.length} task suggestions available.`
              : ''}
          </p>
          {controller.commandError !== null && (
            <FieldError className="start-form__error" id="start-error">
              {controller.commandError.message}
            </FieldError>
          )}
        </Field>
        <Button
          className="min-h-14 px-6"
          disabled={
            controller.activeCommand === 'start' ||
            description.trim().length === 0
          }
          size="lg"
          type="submit"
        >
          {controller.activeCommand === 'start' ? 'Starting…' : 'Start'}
        </Button>
      </form>
    </div>
  );
};

interface ActiveTimerProps {
  readonly controller: TimerController;
  readonly timer: TimerState;
}

const ActiveTimer = ({ controller, timer }: ActiveTimerProps) => {
  const displayDuration = useDisplayDuration(timer);
  const isPending = controller.activeCommand !== null;

  if (timer.status === 'idle') {
    return null;
  }

  return (
    <div
      aria-label={`${timer.status} timer`}
      className="active-timer"
      role="region"
    >
      <h2>{timer.currentTask?.description}</h2>
      <output
        aria-label="Current session duration"
        className="active-timer__clock"
      >
        {formatClockDuration(displayDuration)}
      </output>
      <p className="active-timer__status" role="status">
        {timer.status === 'running' ? 'Current session' : 'Paused'}
      </p>
      <p className="active-timer__totals">
        Today {formatHoursAndMinutes(timer.taskTodayDurationMs)}
        <span> · </span>
        Total {formatHoursAndMinutes(timer.taskLifetimeDurationMs)}
      </p>
      <div aria-label="Timer controls" className="timer-controls" role="group">
        {timer.status === 'running' && (
          <Button
            className="min-h-12 min-w-28 px-5"
            disabled={isPending}
            onClick={() => void controller.pause()}
            size="lg"
            type="button"
          >
            {controller.activeCommand === 'pause' ? 'Pausing…' : 'Pause'}
          </Button>
        )}
        {timer.status === 'paused' && (
          <Button
            className="min-h-12 min-w-28 px-5"
            disabled={isPending}
            onClick={() => void controller.resume()}
            size="lg"
            type="button"
          >
            {controller.activeCommand === 'resume' ? 'Resuming…' : 'Resume'}
          </Button>
        )}
        <Button
          className="min-h-12 min-w-28 px-5"
          disabled={isPending}
          onClick={() => void controller.stop()}
          size="lg"
          type="button"
          variant="outline"
        >
          {controller.activeCommand === 'stop' ? 'Stopping…' : 'Stop'}
        </Button>
      </div>
      {controller.commandError !== null && (
        <FieldError className="active-timer__error">
          {controller.commandError.message}
        </FieldError>
      )}
    </div>
  );
};
