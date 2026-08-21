import { describe, expect, it } from 'vitest';

import { ANALYTICS_RANGES } from '@/shared/contracts/analytics';

describe('analytics contracts', () => {
  it('defines only the two supported ranges', () => {
    expect(ANALYTICS_RANGES).toEqual(['last-7-days', 'last-30-days']);
  });
});
