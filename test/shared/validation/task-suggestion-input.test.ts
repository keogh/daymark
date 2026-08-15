import { describe, expect, it } from 'vitest';

import { validateTaskSuggestionInput } from '@/shared/validation/task-suggestion-input';

describe('validateTaskSuggestionInput', () => {
  it.each(['', '   ', '\n\t'])(
    'accepts an empty normalized query %#',
    (query) => {
      expect(validateTaskSuggestionInput({ query })).toEqual({
        ok: true,
        value: { query, normalizedQuery: '' },
      });
    },
  );

  it('normalizes casing and consecutive whitespace for matching', () => {
    expect(validateTaskSuggestionInput({ query: '  IMPL\t  Auth  ' })).toEqual({
      ok: true,
      value: {
        query: '  IMPL\t  Auth  ',
        normalizedQuery: 'impl auth',
      },
    });
  });

  it.each([undefined, null, [], {}, { query: 42 }, { query: '', extra: true }])(
    'rejects malformed or non-exact input %#',
    (input) => {
      expect(validateTaskSuggestionInput(input)).toMatchObject({
        ok: false,
        error: { code: 'INVALID_TASK_SEARCH' },
      });
    },
  );

  it('accepts 500 trimmed Unicode code points and rejects 501', () => {
    const emoji = '🐮';

    expect(validateTaskSuggestionInput({ query: emoji.repeat(500) }).ok).toBe(
      true,
    );
    expect(validateTaskSuggestionInput({ query: emoji.repeat(501) }).ok).toBe(
      false,
    );
  });
});
