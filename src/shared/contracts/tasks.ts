import type { AppResult } from './app-result';

export const TASKS_GET_SUGGESTIONS_CHANNEL = 'tasks:get-suggestions';
export const TASKS_RENAME_CHANNEL = 'tasks:rename';
export const TASKS_DELETE_CHANNEL = 'tasks:delete';
export const TASKS_GET_DELETION_SUMMARY_CHANNEL =
  'tasks:get-deletion-summary';
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

export interface RenameTaskInput {
  readonly taskId: string;
  readonly description: string;
}

export interface DeleteTaskInput {
  readonly taskId: string;
}

export interface TaskDeletionSummaryInput {
  readonly taskId: string;
}

export interface TaskSummary {
  readonly id: string;
  readonly description: string;
}

export interface TaskMutationResult {
  readonly task: TaskSummary;
}

export interface TaskDeletionResult {
  readonly taskId: string;
}

export interface TaskDeletionSummary {
  readonly task: TaskSummary;
  readonly intervalCount: number;
  readonly lifetimeDurationMs: number;
}

export interface TasksAPI {
  getSuggestions(
    this: void,
    input: TaskSuggestionInput,
  ): Promise<AppResult<TaskSuggestionPage>>;
}
