import { describe, expect, it } from 'vitest';

import {
  HISTORY_ACTIVITY_DAY_LIMIT,
  HISTORY_GET_PAGE_CHANNEL,
} from '@/shared/contracts/history';

describe('history contracts', () => {
  it('owns a fixed page limit and explicit IPC channel', () => {
    expect(HISTORY_ACTIVITY_DAY_LIMIT).toBe(30);
    expect(HISTORY_GET_PAGE_CHANNEL).toBe('history:get-page');
  });
});
