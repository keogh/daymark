import { useCallback, useEffect, useRef, useState } from 'react';

import type { AppError, AppResult } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';
import { validateStartTaskInput } from '@/shared/validation/task-description';

type TimerLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly timer: TimerState };

export type TimerCommand = 'start' | 'pause' | 'resume' | 'stop';

export interface TimerController {
  readonly loadState: TimerLoadState;
  readonly activeCommand: TimerCommand | null;
  readonly commandError: AppError | null;
  readonly start: (description: string) => Promise<void>;
  readonly startExistingTask: (taskId: string) => Promise<void>;
  readonly pause: () => Promise<void>;
  readonly resume: () => Promise<void>;
  readonly stop: () => Promise<void>;
  readonly clearCommandError: () => void;
  readonly authoritativeRevision: number;
}

const AUTHORITATIVE_SYNC_MS = 60_000;

const unexpectedError: AppError = {
  code: 'INTERNAL_ERROR',
  message: 'The timer could not be updated. Please try again.',
};

export const useTimerController = (): TimerController => {
  const [loadState, setLoadState] = useState<TimerLoadState>({
    status: 'loading',
  });
  const [activeCommand, setActiveCommand] = useState<TimerCommand | null>(null);
  const [commandError, setCommandError] = useState<AppError | null>(null);
  const [authoritativeRevision, setAuthoritativeRevision] = useState(0);
  const requestVersion = useRef(0);

  useEffect(() => {
    let isActive = true;

    const loadTimer = async () => {
      try {
        const result = await window.timeTracker.timer.getState();
        if (!isActive) {
          return;
        }

        setLoadState(
          result.ok
            ? { status: 'ready', timer: result.value }
            : { status: 'error' },
        );
      } catch {
        if (isActive) {
          setLoadState({ status: 'error' });
        }
      }
    };

    void loadTimer();

    return () => {
      isActive = false;
    };
  }, []);

  const runCommand = useCallback(
    async (
      command: TimerCommand,
      operation: () => Promise<AppResult<TimerState>>,
    ): Promise<void> => {
      const version = ++requestVersion.current;
      setActiveCommand(command);
      setCommandError(null);
      try {
        const result = await operation();
        if (version !== requestVersion.current) {
          return;
        }
        if (result.ok) {
          setLoadState({ status: 'ready', timer: result.value });
          setAuthoritativeRevision((revision) => revision + 1);
        } else {
          setCommandError(result.error);
        }
      } catch {
        if (version === requestVersion.current) {
          setCommandError(unexpectedError);
        }
      } finally {
        if (version === requestVersion.current) {
          setActiveCommand(null);
        }
      }
    },
    [],
  );

  const start = useCallback(
    async (description: string): Promise<void> => {
      const validation = validateStartTaskInput({
        source: 'description',
        description,
      });
      if (!validation.ok) {
        setCommandError(validation.error);
        return;
      }
      if (validation.value.source !== 'description') {
        return;
      }
      const validatedDescription = validation.value.description;

      await runCommand('start', () =>
        window.timeTracker.timer.start({
          source: 'description',
          description: validatedDescription,
        }),
      );
    },
    [runCommand],
  );

  const pause = useCallback(
    () => runCommand('pause', window.timeTracker.timer.pause),
    [runCommand],
  );
  const startExistingTask = useCallback(
    (taskId: string) =>
      runCommand('start', () =>
        window.timeTracker.timer.start({
          source: 'existing-task',
          taskId,
        }),
      ),
    [runCommand],
  );
  const resume = useCallback(
    () => runCommand('resume', window.timeTracker.timer.resume),
    [runCommand],
  );
  const stop = useCallback(
    () => runCommand('stop', window.timeTracker.timer.stop),
    [runCommand],
  );

  const timer = loadState.status === 'ready' ? loadState.timer : null;
  useEffect(() => {
    if (timer === null || timer.status === 'idle' || activeCommand !== null) {
      return;
    }

    const interval = window.setInterval(() => {
      const version = requestVersion.current;
      void window.timeTracker.timer
        .getState()
        .then((result) => {
          if (result.ok && version === requestVersion.current) {
            setLoadState({ status: 'ready', timer: result.value });
            setAuthoritativeRevision((revision) => revision + 1);
          }
        })
        .catch(() => undefined);
    }, AUTHORITATIVE_SYNC_MS);

    return () => window.clearInterval(interval);
  }, [activeCommand, timer]);

  const clearCommandError = useCallback(() => setCommandError(null), []);

  return {
    loadState,
    activeCommand,
    commandError,
    start,
    startExistingTask,
    pause,
    resume,
    stop,
    clearCommandError,
    authoritativeRevision,
  };
};
