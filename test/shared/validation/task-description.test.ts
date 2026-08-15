import { describe, expect, it } from 'vitest';

import { validateStartTaskInput } from '@/shared/validation/task-description';

describe('validateStartTaskInput', () => {
  it('validates and normalizes the exact description variant', () => {
    expect(
      validateStartTaskInput({
        source: 'description',
        description: '  Implement   Authentication  ',
      }),
    ).toEqual({
      ok: true,
      value: {
        source: 'description',
        description: 'Implement   Authentication',
        normalizedDescription: 'implement authentication',
      },
    });
  });

  it('validates the exact existing-task variant without changing its ID', () => {
    expect(
      validateStartTaskInput({ source: 'existing-task', taskId: 'task-123' }),
    ).toEqual({
      ok: true,
      value: { source: 'existing-task', taskId: 'task-123' },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { description: 'Focus' },
    { source: 'unknown', description: 'Focus' },
    { source: 'description', description: 'Focus', taskId: 'task-1' },
    { source: 'existing-task', taskId: 'task-1', extra: true },
    { source: 'existing-task', taskId: '' },
    { source: 'existing-task', taskId: '   ' },
    { source: 'existing-task', taskId: 42 },
  ])('rejects malformed Start input %#', (input) => {
    expect(validateStartTaskInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_START_TASK',
        message: 'Start task input is invalid.',
      },
    });
  });

  it.each([
    { source: 'description', description: 42 },
    { source: 'description', description: ' \n ' },
  ])('rejects invalid description values %#', (input) => {
    expect(validateStartTaskInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_TASK_DESCRIPTION',
        message: 'Task description must contain between 1 and 500 characters.',
      },
    });
  });

  it('accepts 500 Unicode code points and rejects 501', () => {
    const emoji = '🐮';

    expect(
      validateStartTaskInput({
        source: 'description',
        description: emoji.repeat(500),
      }).ok,
    ).toBe(true);
    expect(
      validateStartTaskInput({
        source: 'description',
        description: emoji.repeat(501),
      }).ok,
    ).toBe(false);
  });
});
