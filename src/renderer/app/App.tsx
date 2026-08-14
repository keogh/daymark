import { useEffect, useRef, useState, type FormEvent } from 'react';

import { useTimerController } from './use-timer-controller';

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
            <RestoredTimer
              description={
                controller.loadState.timer.currentTask?.description ?? ''
              }
              status={controller.loadState.timer.status}
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
  readonly controller: ReturnType<typeof useTimerController>;
}

const IdleTimer = ({ controller }: IdleTimerProps) => {
  const [description, setDescription] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, [controller.startError]);

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
              controller.startError === null ? undefined : 'start-error'
            }
            aria-invalid={controller.startError !== null}
            autoComplete="off"
            disabled={controller.isStarting}
            id="task-description"
            onChange={(event) => {
              setDescription(event.target.value);
              if (controller.startError !== null) {
                controller.clearStartError();
              }
            }}
            placeholder="Task description..."
            ref={inputRef}
            type="text"
            value={description}
          />
          {controller.startError !== null && (
            <p className="start-form__error" id="start-error" role="alert">
              {controller.startError.message}
            </p>
          )}
        </div>
        <button
          disabled={controller.isStarting || description.trim().length === 0}
          type="submit"
        >
          {controller.isStarting ? 'Starting…' : 'Start'}
        </button>
      </form>
    </div>
  );
};

interface RestoredTimerProps {
  readonly description: string;
  readonly status: 'running' | 'paused';
}

const RestoredTimer = ({ description, status }: RestoredTimerProps) => (
  <div aria-label={`${status} timer`} className="restored-timer" role="region">
    <h2>{description}</h2>
    <p role="status">{status === 'running' ? 'Running' : 'Paused'}</p>
  </div>
);
