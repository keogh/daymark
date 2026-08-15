import type { TaskService } from '@/main/services/task-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  TASKS_GET_SUGGESTIONS_CHANNEL,
  type TaskSuggestionPage,
} from '@/shared/contracts/tasks';
import { validateTaskSuggestionInput } from '@/shared/validation/task-suggestion-input';

type TasksHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<TaskSuggestionPage>;

export interface TasksIpcRegistrar {
  handle(channel: string, listener: TasksHandler): void;
}

export interface TasksIpcLogger {
  error(message: string, error: unknown): void;
}

export interface TasksIpcOperations {
  readonly getSuggestions: Pick<TaskService, 'getSuggestions'>;
}

export const registerTasksHandler = (
  ipc: TasksIpcRegistrar,
  operations: TasksIpcOperations,
  logger: TasksIpcLogger,
): void => {
  ipc.handle(TASKS_GET_SUGGESTIONS_CHANNEL, (_event, input) => {
    try {
      const validation = validateTaskSuggestionInput(input);
      if (!validation.ok) {
        return validation;
      }

      const result = operations.getSuggestions.getSuggestions({
        query: validation.value.query,
      });
      if (result.ok) {
        return result;
      }
      return { ok: false, error: toRendererSafeError(result.error) };
    } catch (error: unknown) {
      logger.error('Unexpected task suggestion IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });
};
