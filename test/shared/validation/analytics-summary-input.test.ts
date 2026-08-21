import { describe, expect, it } from 'vitest';

import { validateAnalyticsSummaryInput } from '@/shared/validation/analytics-summary-input';

describe('validateAnalyticsSummaryInput', () => {
  it.each(['last-7-days', 'last-30-days'] as const)(
    'accepts the exact %s range input',
    (range) => {
      expect(validateAnalyticsSummaryInput({ range })).toEqual({
        ok: true,
        value: { range },
      });
    },
  );

  it.each([
    undefined,
    null,
    true,
    7,
    'last-7-days',
    [],
    {},
    { range: 'last-14-days' },
    { range: 'last-7-days', extra: true },
    Object.create({ range: 'last-7-days' }),
  ])('rejects malformed or non-exact input %#', (input) => {
    expect(validateAnalyticsSummaryInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_ANALYTICS_RANGE',
        message: 'The requested analytics range is invalid.',
      },
    });
  });
});
