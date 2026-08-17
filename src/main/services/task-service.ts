import type { TaskRepository } from '@/main/database/repositories/task-repository';
import type { TaskSuggestionQueries } from '@/main/database/repositories/task-suggestion-query-repository';
import type { TransactionRunner } from '@/main/database/transaction-runner';
import type { Clock } from '@/main/domain/clock';
import { InvalidPersistedTimerStateError } from '@/main/services/timer-state-reader';
import type { AppResult } from '@/shared/contracts/app-result';
import type {
  RenameTaskInput,
  TaskMutationResult,
  TaskSuggestionPage,
} from '@/shared/contracts/tasks';
import {
  validateRenameTaskInput,
  type ValidatedRenameTaskInput,
} from '@/shared/validation/task-management-input';
import { validateTaskSuggestionInput } from '@/shared/validation/task-suggestion-input';

export interface TaskServiceDependencies {
  readonly clock: Clock;
  readonly suggestionQueries: TaskSuggestionQueries;
  readonly tasks: TaskRepository;
  readonly transactions: TransactionRunner;
}

export class TaskService {
  readonly #clock: Clock;
  readonly #suggestionQueries: TaskSuggestionQueries;
  readonly #tasks: TaskRepository;
  readonly #transactions: TransactionRunner;

  constructor(dependencies: TaskServiceDependencies) {
    this.#clock = dependencies.clock;
    this.#suggestionQueries = dependencies.suggestionQueries;
    this.#tasks = dependencies.tasks;
    this.#transactions = dependencies.transactions;
  }

  getSuggestions(input: unknown): AppResult<TaskSuggestionPage> {
    const validation = validateTaskSuggestionInput(input);
    if (!validation.ok) {
      return validation;
    }

    const now = this.#clock.now();
    return {
      ok: true,
      value: {
        suggestions: this.#suggestionQueries.findSuggestions(
          validation.value.normalizedQuery,
          now,
        ),
        now,
      },
    };
  }

  rename(input: RenameTaskInput): AppResult<TaskMutationResult> {
    const validation = validateRenameTaskInput(input);
    if (!validation.ok) {
      return validation;
    }

    try {
      return this.#transactions.run(() =>
        this.#renameInTransaction(validation.value),
      );
    } catch (error: unknown) {
      console.error('Task rename failed.', error);
      return internalError();
    }
  }

  #renameInTransaction(
    input: ValidatedRenameTaskInput,
  ): AppResult<TaskMutationResult> {
    const target = this.#tasks.findById(input.taskId);
    if (target === undefined) {
      return taskNotFound();
    }

    const collision = this.#tasks.findByNormalizedDescriptionExcluding(
      input.normalizedDescription,
      input.taskId,
    );
    if (collision !== undefined) {
      return taskDescriptionConflict();
    }

    const updated = this.#tasks.updateDescription(
      input.taskId,
      input.description,
      input.normalizedDescription,
      this.#clock.now(),
    );
    if (updated === undefined) {
      throw new InvalidPersistedTimerStateError(
        'Task changed before its rename completed.',
      );
    }

    return {
      ok: true,
      value: { task: { id: updated.id, description: updated.description } },
    };
  }
}

const taskNotFound = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TASK_NOT_FOUND',
    message: 'The selected task no longer exists.',
  },
});

const taskDescriptionConflict = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'TASK_DESCRIPTION_CONFLICT',
    message: 'Another task already uses that description.',
  },
});

const internalError = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  },
});
