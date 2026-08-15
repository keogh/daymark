import type { Clock } from '@/main/domain/clock';
import type { HistoryService } from '@/main/services/history-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  HISTORY_GET_PAGE_CHANNEL,
  type HistoryPage,
} from '@/shared/contracts/history';
import { validateHistoryPageInput } from '@/shared/validation/history-page-input';

type HistoryHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<HistoryPage>;

export interface HistoryIpcRegistrar {
  handle(channel: string, listener: HistoryHandler): void;
}

export interface HistoryIpcLogger {
  error(message: string, error: unknown): void;
}

export interface HistoryIpcDependencies {
  readonly clock: Pick<Clock, 'now'>;
  readonly historyService: Pick<HistoryService, 'getPage'>;
}

export const registerHistoryHandler = (
  ipc: HistoryIpcRegistrar,
  dependencies: HistoryIpcDependencies,
  logger: HistoryIpcLogger,
): void => {
  ipc.handle(HISTORY_GET_PAGE_CHANNEL, (_event, input) => {
    try {
      const validation = validateHistoryPageInput(
        input,
        dependencies.clock.now(),
      );
      if (!validation.ok) {
        return validation;
      }

      return {
        ok: true,
        value: dependencies.historyService.getPage(validation.value),
      };
    } catch (error: unknown) {
      logger.error('Unexpected history IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });
};
