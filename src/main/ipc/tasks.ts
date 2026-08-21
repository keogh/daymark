import type { TaskService } from '@/main/services/task-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  TASKS_DELETE_CHANNEL,
  TASKS_GET_DELETION_SUMMARY_CHANNEL,
  TASKS_GET_SUGGESTIONS_CHANNEL,
  TASKS_RENAME_CHANNEL,
  type TaskDeletionResult,
  type TaskDeletionSummary,
  type TaskMutationResult,
  type TaskSuggestionPage,
} from '@/shared/contracts/tasks';
import {
  validateDeleteTaskInput,
  validateRenameTaskInput,
  validateTaskDeletionSummaryInput,
} from '@/shared/validation/task-management-input';
import { validateTaskSuggestionInput } from '@/shared/validation/task-suggestion-input';

type TasksResult =
  | TaskSuggestionPage
  | TaskMutationResult
  | TaskDeletionResult
  | TaskDeletionSummary;

type TasksHandler = (event: unknown, input?: unknown) => AppResult<TasksResult>;

export interface TasksIpcRegistrar {
  handle(channel: string, listener: TasksHandler): void;
}

export interface TasksIpcLogger {
  error(message: string, error: unknown): void;
}

export interface TasksIpcOperations {
  readonly tasks: Pick<
    TaskService,
    'getSuggestions' | 'rename' | 'delete' | 'getDeletionSummary'
  >;
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

      const result = operations.tasks.getSuggestions({
        query: validation.value.query,
      });
      return sanitizeResult(result);
    } catch (error: unknown) {
      logger.error('Unexpected task suggestion IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });

  ipc.handle(TASKS_RENAME_CHANNEL, (_event, input) => {
    try {
      const validation = validateRenameTaskInput(input);
      if (!validation.ok) {
        return validation;
      }

      return sanitizeResult(
        operations.tasks.rename({
          taskId: validation.value.taskId,
          description: validation.value.description,
        }),
      );
    } catch (error: unknown) {
      logger.error('Unexpected task rename IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });

  ipc.handle(TASKS_DELETE_CHANNEL, (_event, input) => {
    try {
      const validation = validateDeleteTaskInput(input);
      if (!validation.ok) {
        return validation;
      }

      return sanitizeResult(operations.tasks.delete(validation.value));
    } catch (error: unknown) {
      logger.error('Unexpected task delete IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });

  ipc.handle(TASKS_GET_DELETION_SUMMARY_CHANNEL, (_event, input) => {
    try {
      const validation = validateTaskDeletionSummaryInput(input);
      if (!validation.ok) {
        return validation;
      }

      return sanitizeResult(
        operations.tasks.getDeletionSummary(validation.value),
      );
    } catch (error: unknown) {
      logger.error('Unexpected task deletion summary IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });
};

const sanitizeResult = <T>(result: AppResult<T>): AppResult<T> =>
  result.ok ? result : { ok: false, error: toRendererSafeError(result.error) };
