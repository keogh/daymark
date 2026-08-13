import type { AppResult } from '@/shared/contracts/app-result';
import type { StartTaskInput } from '@/shared/contracts/timer';

export const MAX_TASK_DESCRIPTION_CODE_POINTS = 500;

export interface ValidatedTaskDescription {
  readonly description: string;
  readonly normalizedDescription: string;
}

export const validateStartTaskInput = (
  input: unknown,
): AppResult<ValidatedTaskDescription> => {
  if (typeof input !== 'object' || input === null) {
    return invalidDescription();
  }

  const description = (input as Partial<StartTaskInput>).description;
  if (typeof description !== 'string') {
    return invalidDescription();
  }

  const trimmedDescription = description.trim();
  const length = Array.from(trimmedDescription).length;
  if (length === 0 || length > MAX_TASK_DESCRIPTION_CODE_POINTS) {
    return invalidDescription();
  }

  return {
    ok: true,
    value: {
      description: trimmedDescription,
      normalizedDescription: trimmedDescription.toLocaleLowerCase(),
    },
  };
};

const invalidDescription = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_TASK_DESCRIPTION',
    message: 'Task description must contain between 1 and 500 characters.',
  },
});
