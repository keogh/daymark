import { describe, expect, it } from 'vitest';

import {
  formatLocalDateInput,
  formatLocalTimeInput,
} from '@/renderer/app/local-date-format';

describe('local date and time input formatting', () => {
  it('formats complete local calendar values without clipping them to a projected day', () => {
    const timestamp = new Date(2026, 7, 13, 23, 7).getTime();

    expect(formatLocalDateInput(timestamp)).toBe('2026-08-13');
    expect(formatLocalTimeInput(timestamp)).toBe('23:07');
  });
});
