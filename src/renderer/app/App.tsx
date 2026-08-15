import { useEffect, useRef, useState, type FormEvent } from 'react';

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
import { formatClockDuration, formatHoursAndMinutes } from './duration-format';
import { useDisplayDuration } from './use-display-duration';
import {
  useTimerController,
  type TimerController,
} from './use-timer-controller';

export const App = () => {
  const controller = useTimerController();

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
      <DailyHistory refreshRevision={controller.authoritativeRevision} />
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

  useEffect(() => {
    inputRef.current?.focus();
  }, [controller.commandError]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void controller.start(description);
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
          <Input
            className="min-h-14 px-4 text-base"
            aria-describedby={
              controller.commandError === null ? undefined : 'start-error'
            }
            aria-invalid={controller.commandError !== null}
            autoComplete="off"
            disabled={controller.activeCommand === 'start'}
            id="task-description"
            onChange={(event) => {
              setDescription(event.target.value);
              if (controller.commandError !== null) {
                controller.clearCommandError();
              }
            }}
            placeholder="Task description..."
            ref={inputRef}
            type="text"
            value={description}
          />
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
