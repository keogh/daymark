import type { AppResult } from '@/shared/contracts/app-result';
import type { TaskSuggestionInput } from '@/shared/contracts/tasks';
import {
  MAX_TASK_DESCRIPTION_CODE_POINTS,
  normalizeTaskText,
} from '@/shared/validation/task-description';

export interface ValidatedTaskSuggestionInput extends TaskSuggestionInput {
  readonly normalizedQuery: string;
}

export const validateTaskSuggestionInput = (
  input: unknown,
): AppResult<ValidatedTaskSuggestionInput> => {
  if (
    typeof input !== 'object' ||
    input === null ||
    Array.isArray(input) ||
    Object.keys(input).length !== 1 ||
    !Object.hasOwn(input, 'query')
  ) {
    return invalidTaskSearch();
  }

  const query = (input as Record<'query', unknown>).query;
  if (
    typeof query !== 'string' ||
    Array.from(query.trim()).length > MAX_TASK_DESCRIPTION_CODE_POINTS
  ) {
    return invalidTaskSearch();
  }

  return {
    ok: true,
    value: { query, normalizedQuery: normalizeTaskText(query) },
  };
};

const invalidTaskSearch = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_TASK_SEARCH',
    message: 'Task search must contain at most 500 characters.',
  },
});
