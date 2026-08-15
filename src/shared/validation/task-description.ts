import type { AppResult } from '@/shared/contracts/app-result';
import { hasExactKeys, isRecord } from '@/shared/validation/object-shape';

export const MAX_TASK_DESCRIPTION_CODE_POINTS = 500;

export interface ValidatedTaskDescription {
  readonly source: 'description';
  readonly description: string;
  readonly normalizedDescription: string;
}

export interface ValidatedExistingTaskStart {
  readonly source: 'existing-task';
  readonly taskId: string;
}

export type ValidatedStartTaskInput =
  ValidatedTaskDescription | ValidatedExistingTaskStart;

export const normalizeTaskText = (value: string): string =>
  value.trim().replace(/\s+/gu, ' ').toLocaleLowerCase();

export const validateStartTaskInput = (
  input: unknown,
): AppResult<ValidatedStartTaskInput> => {
  if (!isRecord(input) || typeof input.source !== 'string') {
    return invalidStartTask();
  }

  if (input.source === 'description') {
    if (!hasExactKeys(input, ['source', 'description'])) {
      return invalidStartTask();
    }
    if (typeof input.description !== 'string') {
      return invalidDescription();
    }

    const description = input.description.trim();
    const length = Array.from(description).length;
    if (length === 0 || length > MAX_TASK_DESCRIPTION_CODE_POINTS) {
      return invalidDescription();
    }

    return {
      ok: true,
      value: {
        source: 'description',
        description,
        normalizedDescription: normalizeTaskText(description),
      },
    };
  }

  if (input.source === 'existing-task') {
    if (!hasExactKeys(input, ['source', 'taskId'])) {
      return invalidStartTask();
    }
    if (typeof input.taskId !== 'string' || input.taskId.trim().length === 0) {
      return invalidStartTask();
    }

    return {
      ok: true,
      value: { source: 'existing-task', taskId: input.taskId },
    };
  }

  return invalidStartTask();
};

const invalidDescription = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_TASK_DESCRIPTION',
    message: 'Task description must contain between 1 and 500 characters.',
  },
});

const invalidStartTask = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_START_TASK',
    message: 'Start task input is invalid.',
  },
});
