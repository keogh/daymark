import { describe, expect, it } from 'vitest';

import {
  validateDeleteTaskInput,
  validateRenameTaskInput,
  validateTaskDeletionSummaryInput,
} from '@/shared/validation/task-management-input';

describe('validateRenameTaskInput', () => {
  it('validates and normalizes an exact rename input', () => {
    expect(
      validateRenameTaskInput({
        taskId: 'task-1',
        description: '  Implement   Authentication  ',
      }),
    ).toEqual({
      ok: true,
      value: {
        taskId: 'task-1',
        description: 'Implement   Authentication',
        normalizedDescription: 'implement authentication',
      },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { taskId: 'task-1' },
    { description: 'Focus' },
    { taskId: 'task-1', description: 'Focus', extra: true },
    { taskId: '', description: 'Focus' },
    { taskId: ' task-1', description: 'Focus' },
    { taskId: 'task-1 ', description: 'Focus' },
    { taskId: '   ', description: 'Focus' },
    { taskId: 42, description: 'Focus' },
    { taskId: 'task-1', description: 42 },
    { taskId: 'task-1', description: ' \n ' },
  ])('rejects malformed rename input %#', (input) => {
    expect(validateRenameTaskInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_TASK_RENAME',
        message: 'Task rename input is invalid.',
      },
    });
  });

  it('accepts 500 Unicode code points and rejects 501', () => {
    const emoji = '🐮';

    expect(
      validateRenameTaskInput({
        taskId: 'task-1',
        description: emoji.repeat(500),
      }).ok,
    ).toBe(true);
    expect(
      validateRenameTaskInput({
        taskId: 'task-1',
        description: emoji.repeat(501),
      }).ok,
    ).toBe(false);
  });
});

describe('validateDeleteTaskInput', () => {
  it('validates the exact task-id input', () => {
    expect(validateDeleteTaskInput({ taskId: 'task-1' })).toEqual({
      ok: true,
      value: { taskId: 'task-1' },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { id: 'task-1' },
    { taskId: '' },
    { taskId: '   ' },
    { taskId: ' task-1' },
    { taskId: 'task-1 ' },
    { taskId: 42 },
    { taskId: 'task-1', extra: true },
  ])('rejects malformed delete input %#', (input) => {
    expect(validateDeleteTaskInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_TASK_DELETE',
        message: 'Task delete input is invalid.',
      },
    });
  });
});

describe('validateTaskDeletionSummaryInput', () => {
  it('validates the exact task-id input', () => {
    expect(validateTaskDeletionSummaryInput({ taskId: 'task-1' })).toEqual({
      ok: true,
      value: { taskId: 'task-1' },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { id: 'task-1' },
    { taskId: '' },
    { taskId: '   ' },
    { taskId: ' task-1' },
    { taskId: 'task-1 ' },
    { taskId: 42 },
    { taskId: 'task-1', extra: true },
  ])('rejects malformed deletion-summary input %#', (input) => {
    expect(validateTaskDeletionSummaryInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_TASK_DELETE',
        message: 'Task delete input is invalid.',
      },
    });
  });
});
