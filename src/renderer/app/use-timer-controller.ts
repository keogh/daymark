import { useCallback, useEffect, useState } from 'react';

import type { AppError } from '@/shared/contracts/app-result';
import type { TimerState } from '@/shared/contracts/timer';
import { validateStartTaskInput } from '@/shared/validation/task-description';

type TimerLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly timer: TimerState };

export interface TimerController {
  readonly loadState: TimerLoadState;
  readonly isStarting: boolean;
  readonly startError: AppError | null;
  readonly start: (description: string) => Promise<void>;
  readonly clearStartError: () => void;
}

const unexpectedError: AppError = {
  code: 'INTERNAL_ERROR',
  message: 'The timer could not be updated. Please try again.',
};

export const useTimerController = (): TimerController => {
  const [loadState, setLoadState] = useState<TimerLoadState>({
    status: 'loading',
  });
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<AppError | null>(null);

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

  const start = useCallback(async (description: string): Promise<void> => {
    const validation = validateStartTaskInput({ description });
    if (!validation.ok) {
      setStartError(validation.error);
      return;
    }

    setIsStarting(true);
    setStartError(null);
    try {
      const result = await window.timeTracker.timer.start({
        description: validation.value.description,
      });
      if (result.ok) {
        setLoadState({ status: 'ready', timer: result.value });
      } else {
        setStartError(result.error);
      }
    } catch {
      setStartError(unexpectedError);
    } finally {
      setIsStarting(false);
    }
  }, []);

  const clearStartError = useCallback(() => setStartError(null), []);

  return {
    loadState,
    isStarting,
    startError,
    start,
    clearStartError,
  };
};
