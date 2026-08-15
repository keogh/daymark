import type { TaskSuggestionQueries } from '@/main/database/repositories/task-suggestion-query-repository';
import type { Clock } from '@/main/domain/clock';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TaskSuggestionPage } from '@/shared/contracts/tasks';
import { validateTaskSuggestionInput } from '@/shared/validation/task-suggestion-input';

export interface TaskServiceDependencies {
  readonly clock: Clock;
  readonly suggestionQueries: TaskSuggestionQueries;
}

export class TaskService {
  readonly #clock: Clock;
  readonly #suggestionQueries: TaskSuggestionQueries;

  constructor(dependencies: TaskServiceDependencies) {
    this.#clock = dependencies.clock;
    this.#suggestionQueries = dependencies.suggestionQueries;
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
}
