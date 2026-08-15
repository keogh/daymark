import type { IntervalService } from '@/main/services/interval-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  INTERVALS_DELETE_CHANNEL,
  INTERVALS_UPDATE_CHANNEL,
  type DeleteIntervalInput,
  type IntervalMutationResult,
  type UpdateIntervalInput,
} from '@/shared/contracts/intervals';
import {
  validateDeleteIntervalInput,
  validateUpdateIntervalInput,
} from '@/shared/validation/interval-correction-input';

type IntervalMutationHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<IntervalMutationResult>;

export interface IntervalsIpcRegistrar {
  handle(channel: string, listener: IntervalMutationHandler): void;
}

export interface IntervalsIpcLogger {
  error(message: string, error: unknown): void;
}

export interface IntervalsIpcOperations {
  readonly commands: Pick<IntervalService, 'update' | 'delete'>;
}

export const registerIntervalsHandlers = (
  ipc: IntervalsIpcRegistrar,
  operations: IntervalsIpcOperations,
  logger: IntervalsIpcLogger,
): void => {
  ipc.handle(INTERVALS_UPDATE_CHANNEL, (_event, input) => {
    try {
      const validation = validateUpdateIntervalInput(input);
      if (!validation.ok) {
        return validation;
      }

      return operations.commands.update(toUpdateInput(validation.value));
    } catch (error: unknown) {
      logger.error('Unexpected interval update IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });

  ipc.handle(INTERVALS_DELETE_CHANNEL, (_event, input) => {
    try {
      const validation = validateDeleteIntervalInput(input);
      if (!validation.ok) {
        return validation;
      }

      return operations.commands.delete(toDeleteInput(validation.value));
    } catch (error: unknown) {
      logger.error('Unexpected interval delete IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });
};

const toUpdateInput = (input: UpdateIntervalInput): UpdateIntervalInput => ({
  intervalId: input.intervalId,
  startDate: input.startDate,
  startTime: input.startTime,
  endDate: input.endDate,
  endTime: input.endTime,
});

const toDeleteInput = (input: DeleteIntervalInput): DeleteIntervalInput => ({
  intervalId: input.intervalId,
});
