import { useEffect, useRef, useState, type FormEvent } from 'react';

import type { TimerState } from '@/shared/contracts/timer';
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
    </main>
  );
};

const LoadingTimer = () => (
  <div className="timer-message" role="status">
    <span aria-hidden="true" className="timer-message__spinner" />
    <p>Loading timer…</p>
  </div>
);

const LoadError = () => (
  <div className="timer-message timer-message--error" role="alert">
    <h2>Timer unavailable</h2>
    <p>The timer could not be loaded. Please restart the application.</p>
  </div>
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
        <div className="start-form__field">
          <label className="visually-hidden" htmlFor="task-description">
            Task description
          </label>
          <input
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
            <p className="start-form__error" id="start-error" role="alert">
              {controller.commandError.message}
            </p>
          )}
        </div>
        <button
          disabled={
            controller.activeCommand === 'start' ||
            description.trim().length === 0
          }
          type="submit"
        >
          {controller.activeCommand === 'start' ? 'Starting…' : 'Start'}
        </button>
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
          <button
            disabled={isPending}
            onClick={() => void controller.pause()}
            type="button"
          >
            {controller.activeCommand === 'pause' ? 'Pausing…' : 'Pause'}
          </button>
        )}
        {timer.status === 'paused' && (
          <button
            disabled={isPending}
            onClick={() => void controller.resume()}
            type="button"
          >
            {controller.activeCommand === 'resume' ? 'Resuming…' : 'Resume'}
          </button>
        )}
        <button
          className="timer-controls__stop"
          disabled={isPending}
          onClick={() => void controller.stop()}
          type="button"
        >
          {controller.activeCommand === 'stop' ? 'Stopping…' : 'Stop'}
        </button>
      </div>
      {controller.commandError !== null && (
        <p className="active-timer__error" role="alert">
          {controller.commandError.message}
        </p>
      )}
    </div>
  );
};
