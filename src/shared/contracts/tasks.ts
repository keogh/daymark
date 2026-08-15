import type { AppResult } from './app-result';

export const TASKS_GET_SUGGESTIONS_CHANNEL = 'tasks:get-suggestions';
export const TASK_SUGGESTION_LIMIT = 5;

export interface TaskSuggestionInput {
  readonly query: string;
}

export interface TaskSuggestion {
  readonly task: {
    readonly id: string;
    readonly description: string;
  };
  readonly todayDurationMs: number;
  readonly lifetimeDurationMs: number;
  readonly mostRecentActivityAt: number | null;
}

export interface TaskSuggestionPage {
  readonly suggestions: readonly TaskSuggestion[];
  readonly now: number;
}

export interface TasksAPI {
  getSuggestions(
    this: void,
    input: TaskSuggestionInput,
  ): Promise<AppResult<TaskSuggestionPage>>;
}
