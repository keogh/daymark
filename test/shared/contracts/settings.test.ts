import { describe, expect, it } from 'vitest';

import { APP_ERROR_CODES } from '@/shared/contracts/app-result';
import {
  THEME_PREFERENCES,
  WEEK_STARTS_ON_VALUES,
} from '@/shared/contracts/settings';

describe('settings contracts', () => {
  it('defines the complete supported preference values', () => {
    expect(WEEK_STARTS_ON_VALUES).toEqual(['monday', 'sunday']);
    expect(THEME_PREFERENCES).toEqual(['system', 'light', 'dark']);
  });

  it('registers distinct controlled setting validation errors', () => {
    expect(APP_ERROR_CODES).toContain('INVALID_WEEK_START');
    expect(APP_ERROR_CODES).toContain('INVALID_THEME');
  });
});
