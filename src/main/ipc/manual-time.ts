import type { ManualTimeService } from '@/main/services/manual-time-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  MANUAL_TIME_CREATE_INTERVAL_CHANNEL,
  type CreateManualIntervalInput,
  type ManualIntervalCreateResult,
} from '@/shared/contracts/manual-time';
import {
  validateCreateManualIntervalInput,
  type ValidatedCreateManualIntervalInput,
} from '@/shared/validation/manual-time-input';

type ManualTimeHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<ManualIntervalCreateResult>;

export interface ManualTimeIpcRegistrar {
  handle(channel: string, listener: ManualTimeHandler): void;
}

export interface ManualTimeIpcLogger {
  error(message: string, error: unknown): void;
}

export interface ManualTimeIpcOperations {
  readonly createInterval: Pick<ManualTimeService, 'createInterval'>;
}

export const registerManualTimeHandler = (
  ipc: ManualTimeIpcRegistrar,
  operations: ManualTimeIpcOperations,
  logger: ManualTimeIpcLogger,
): void => {
  ipc.handle(MANUAL_TIME_CREATE_INTERVAL_CHANNEL, (_event, input) => {
    try {
      const validation = validateCreateManualIntervalInput(input);
      if (!validation.ok) {
        return validation;
      }

      return operations.createInterval.createInterval(
        toCreateManualIntervalInput(validation.value),
      );
    } catch (error: unknown) {
      logger.error('Unexpected manual time IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });
};

const toCreateManualIntervalInput = (
  input: ValidatedCreateManualIntervalInput,
): CreateManualIntervalInput =>
  input.taskSource === 'existing-task'
    ? {
        taskId: input.taskId,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      }
    : {
        taskDescription: input.taskDescription,
        date: input.date,
        startTime: input.startTime,
        endTime: input.endTime,
      };
