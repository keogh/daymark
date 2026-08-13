import { describe, expect, it } from 'vitest';

import { validateStartTaskInput } from '@/shared/validation/task-description';

describe('validateStartTaskInput', () => {
  it('trims display text and creates a case-folded exact-match value', () => {
    expect(
      validateStartTaskInput({ description: '  Implement Authentication  ' }),
    ).toEqual({
      ok: true,
      value: {
        description: 'Implement Authentication',
        normalizedDescription: 'implement authentication',
      },
    });
  });

  it.each([undefined, null, {}, { description: 42 }, { description: ' \n ' }])(
    'rejects invalid input %#',
    (input) => {
      expect(validateStartTaskInput(input)).toEqual({
        ok: false,
        error: {
          code: 'INVALID_TASK_DESCRIPTION',
          message:
            'Task description must contain between 1 and 500 characters.',
        },
      });
    },
  );

  it('accepts 500 Unicode code points and rejects 501', () => {
    const emoji = '🐮';

    expect(validateStartTaskInput({ description: emoji.repeat(500) }).ok).toBe(
      true,
    );
    expect(validateStartTaskInput({ description: emoji.repeat(501) }).ok).toBe(
      false,
    );
  });
});
