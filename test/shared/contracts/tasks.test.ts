import { describe, expect, it } from 'vitest';

import {
  TASKS_GET_SUGGESTIONS_CHANNEL,
  TASK_SUGGESTION_LIMIT,
} from '@/shared/contracts/tasks';

describe('task suggestion contracts', () => {
  it('owns the bounded result limit and explicit IPC channel', () => {
    expect(TASK_SUGGESTION_LIMIT).toBe(5);
    expect(TASKS_GET_SUGGESTIONS_CHANNEL).toBe('tasks:get-suggestions');
  });
});
