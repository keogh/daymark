import { describe, expect, it, vi } from 'vitest';

import type { TaskSuggestionQueries } from '@/main/database/repositories/task-suggestion-query-repository';
import { TaskService } from '@/main/services/task-service';

import { FakeClock } from '../domain/support/fake-clock';

describe('TaskService', () => {
  it('normalizes input and returns repository results with one Clock snapshot', () => {
    const now = 1_765_000_000_000;
    const clock = new FakeClock(now);
    const suggestions = [
      {
        task: { id: 'task-1', description: 'Implement Authentication' },
        todayDurationMs: 10,
        lifetimeDurationMs: 20,
        mostRecentActivityAt: now - 100,
      },
    ];
    const findSuggestions = vi.fn(() => suggestions);
    const suggestionQueries: TaskSuggestionQueries = { findSuggestions };
    const nowSpy = vi.spyOn(clock, 'now');
    const service = new TaskService({ clock, suggestionQueries });

    expect(service.getSuggestions({ query: '  IMPLEMENT   AUTH  ' })).toEqual({
      ok: true,
      value: { suggestions, now },
    });
    expect(findSuggestions).toHaveBeenCalledWith('implement auth', now);
    expect(nowSpy).toHaveBeenCalledTimes(1);
  });

  it('rejects invalid input before reading the Clock or querying', () => {
    const clock = new FakeClock(123);
    const findSuggestions = vi.fn();
    const suggestionQueries: TaskSuggestionQueries = { findSuggestions };
    const nowSpy = vi.spyOn(clock, 'now');
    const service = new TaskService({ clock, suggestionQueries });

    expect(service.getSuggestions({ query: '', extra: true })).toMatchObject({
      ok: false,
      error: { code: 'INVALID_TASK_SEARCH' },
    });
    expect(nowSpy).not.toHaveBeenCalled();
    expect(findSuggestions).not.toHaveBeenCalled();
  });
});
