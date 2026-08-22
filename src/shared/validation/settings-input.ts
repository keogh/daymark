import type { AppResult } from '@/shared/contracts/app-result';
import {
  THEME_PREFERENCES,
  type SetThemeInput,
  type SetWeekStartsOnInput,
  type ThemePreference,
  WEEK_STARTS_ON_VALUES,
  type WeekStartsOn,
} from '@/shared/contracts/settings';
import { hasExactKeys, isRecord } from '@/shared/validation/object-shape';

const weekStartsOnValues = new Set<string>(WEEK_STARTS_ON_VALUES);
const themePreferences = new Set<string>(THEME_PREFERENCES);

export const validateSetWeekStartsOnInput = (
  input: unknown,
): AppResult<SetWeekStartsOnInput> => {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, ['weekStartsOn']) ||
    !Object.hasOwn(input, 'weekStartsOn') ||
    typeof input.weekStartsOn !== 'string' ||
    !weekStartsOnValues.has(input.weekStartsOn)
  ) {
    return invalidWeekStart();
  }

  return {
    ok: true,
    value: { weekStartsOn: input.weekStartsOn as WeekStartsOn },
  };
};

export const validateSetThemeInput = (
  input: unknown,
): AppResult<SetThemeInput> => {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, ['theme']) ||
    !Object.hasOwn(input, 'theme') ||
    typeof input.theme !== 'string' ||
    !themePreferences.has(input.theme)
  ) {
    return invalidTheme();
  }

  return {
    ok: true,
    value: { theme: input.theme as ThemePreference },
  };
};

const invalidWeekStart = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_WEEK_START',
    message: 'The requested week start is invalid.',
  },
});

const invalidTheme = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_THEME',
    message: 'The requested appearance is invalid.',
  },
});
