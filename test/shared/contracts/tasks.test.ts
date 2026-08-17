import { describe, expect, it } from 'vitest';

import {
  TASKS_DELETE_CHANNEL,
  TASKS_GET_DELETION_SUMMARY_CHANNEL,
  TASKS_GET_SUGGESTIONS_CHANNEL,
  TASKS_RENAME_CHANNEL,
  TASK_SUGGESTION_LIMIT,
} from '@/shared/contracts/tasks';

describe('task suggestion contracts', () => {
  it('owns the bounded result limit and explicit IPC channel', () => {
    expect(TASK_SUGGESTION_LIMIT).toBe(5);
    expect(TASKS_GET_SUGGESTIONS_CHANNEL).toBe('tasks:get-suggestions');
  });
});

describe('task management contracts', () => {
  it('owns explicit rename, delete, and deletion-summary IPC channels', () => {
    expect(TASKS_RENAME_CHANNEL).toBe('tasks:rename');
    expect(TASKS_DELETE_CHANNEL).toBe('tasks:delete');
    expect(TASKS_GET_DELETION_SUMMARY_CHANNEL).toBe(
      'tasks:get-deletion-summary',
    );
  });
});
