import type { TimerService } from '@/main/services/timer-service';
import type { TimerStateReader } from '@/main/services/timer-state-reader';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  TIMER_GET_STATE_CHANNEL,
  TIMER_PAUSE_CHANNEL,
  TIMER_RESUME_CHANNEL,
  TIMER_START_CHANNEL,
  TIMER_STOP_CHANNEL,
  type TimerState,
} from '@/shared/contracts/timer';
import { validateStartTaskInput } from '@/shared/validation/task-description';

type TimerHandler = (event: unknown, input?: unknown) => AppResult<TimerState>;

export interface TimerIpcRegistrar {
  handle(channel: string, listener: TimerHandler): void;
}

export interface TimerIpcLogger {
  error(message: string, error: unknown): void;
}

export interface TimerIpcOperations {
  readonly getState: Pick<TimerStateReader, 'getState'>;
  readonly commands: Pick<TimerService, 'start' | 'pause' | 'resume' | 'stop'>;
}

export const registerTimerHandlers = (
  ipc: TimerIpcRegistrar,
  operations: TimerIpcOperations,
  logger: TimerIpcLogger,
): void => {
  ipc.handle(
    TIMER_GET_STATE_CHANNEL,
    safeHandler(logger, () => ({
      ok: true,
      value: operations.getState.getState(),
    })),
  );
  ipc.handle(
    TIMER_START_CHANNEL,
    safeHandler(logger, (_event, input) => {
      const validation = validateStartTaskInput(input);
      if (!validation.ok) {
        return validation;
      }
      return operations.commands.start(
        validation.value.source === 'description'
          ? {
              source: 'description',
              description: validation.value.description,
            }
          : {
              source: 'existing-task',
              taskId: validation.value.taskId,
            },
      );
    }),
  );
  ipc.handle(
    TIMER_PAUSE_CHANNEL,
    safeHandler(logger, () => operations.commands.pause()),
  );
  ipc.handle(
    TIMER_RESUME_CHANNEL,
    safeHandler(logger, () => operations.commands.resume()),
  );
  ipc.handle(
    TIMER_STOP_CHANNEL,
    safeHandler(logger, () => operations.commands.stop()),
  );
};

const safeHandler =
  (logger: TimerIpcLogger, operation: TimerHandler): TimerHandler =>
  (event, input) => {
    try {
      const result = operation(event, input);
      if (result.ok) {
        return result;
      }
      return { ok: false, error: toRendererSafeError(result.error) };
    } catch (error: unknown) {
      logger.error('Unexpected timer IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  };
