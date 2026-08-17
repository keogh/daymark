import type { AppResult } from '@/shared/contracts/app-result';
import type {
  DeleteTaskInput,
  TaskDeletionSummaryInput,
} from '@/shared/contracts/tasks';
import {
  MAX_TASK_DESCRIPTION_CODE_POINTS,
  normalizeTaskText,
} from '@/shared/validation/task-description';
import { hasExactKeys, isRecord } from '@/shared/validation/object-shape';

export interface ValidatedRenameTaskInput {
  readonly taskId: string;
  readonly description: string;
  readonly normalizedDescription: string;
}

export type ValidatedDeleteTaskInput = DeleteTaskInput;
export type ValidatedTaskDeletionSummaryInput = TaskDeletionSummaryInput;

const RENAME_KEYS = ['taskId', 'description'] as const;
const TASK_ID_KEYS = ['taskId'] as const;

export const validateRenameTaskInput = (
  input: unknown,
): AppResult<ValidatedRenameTaskInput> => {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, RENAME_KEYS) ||
    !isTrimmedNonEmptyString(input.taskId) ||
    typeof input.description !== 'string'
  ) {
    return invalidTaskRename();
  }

  const description = input.description.trim();
  const length = Array.from(description).length;
  if (length === 0 || length > MAX_TASK_DESCRIPTION_CODE_POINTS) {
    return invalidTaskRename();
  }

  return {
    ok: true,
    value: {
      taskId: input.taskId,
      description,
      normalizedDescription: normalizeTaskText(description),
    },
  };
};

export const validateDeleteTaskInput = (
  input: unknown,
): AppResult<ValidatedDeleteTaskInput> => validateTaskIdOnlyInput(input);

export const validateTaskDeletionSummaryInput = (
  input: unknown,
): AppResult<ValidatedTaskDeletionSummaryInput> =>
  validateTaskIdOnlyInput(input);

const validateTaskIdOnlyInput = (
  input: unknown,
): AppResult<{ readonly taskId: string }> => {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, TASK_ID_KEYS) ||
    !isTrimmedNonEmptyString(input.taskId)
  ) {
    return invalidTaskDelete();
  }

  return { ok: true, value: { taskId: input.taskId } };
};

const isTrimmedNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim();

const invalidTaskRename = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_TASK_RENAME',
    message: 'Task rename input is invalid.',
  },
});

const invalidTaskDelete = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_TASK_DELETE',
    message: 'Task delete input is invalid.',
  },
});
