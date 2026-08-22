import { describe, expect, it } from 'vitest';

import {
  validateSetThemeInput,
  validateSetWeekStartsOnInput,
} from '@/shared/validation/settings-input';

describe('settings input validation', () => {
  it.each(['monday', 'sunday'] as const)(
    'accepts the exact %s week-start input',
    (weekStartsOn) => {
      expect(validateSetWeekStartsOnInput({ weekStartsOn })).toEqual({
        ok: true,
        value: { weekStartsOn },
      });
    },
  );

  it.each(['system', 'light', 'dark'] as const)(
    'accepts the exact %s theme input',
    (theme) => {
      expect(validateSetThemeInput({ theme })).toEqual({
        ok: true,
        value: { theme },
      });
    },
  );

  it.each([
    undefined,
    null,
    true,
    1,
    'monday',
    () => undefined,
    [],
    {},
    { weekStartsOn: 'friday' },
    { weekStartsOn: 1 },
    { weekStartsOn: 'monday', extra: true },
    Object.create({ weekStartsOn: 'monday' }),
    Object.assign(Object.create({ extra: true }), { weekStartsOn: 'monday' }),
  ])('rejects malformed or non-exact week-start input %#', (input) => {
    expect(validateSetWeekStartsOnInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_WEEK_START',
        message: 'The requested week start is invalid.',
      },
    });
  });

  it.each([
    undefined,
    null,
    true,
    1,
    'system',
    () => undefined,
    [],
    {},
    { theme: 'sepia' },
    { theme: 1 },
    { theme: 'system', extra: true },
    Object.create({ theme: 'system' }),
    Object.assign(Object.create({ extra: true }), { theme: 'system' }),
  ])('rejects malformed or non-exact theme input %#', (input) => {
    expect(validateSetThemeInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_THEME',
        message: 'The requested appearance is invalid.',
      },
    });
  });
});
