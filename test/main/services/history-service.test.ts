import { describe, expect, it, vi } from 'vitest';

import type {
  HistoryIntervalRecord,
  HistoryQueries,
} from '@/main/database/repositories/history-query-repository';
import { HistoryService } from '@/main/services/history-service';

import { FakeClock } from '../domain/support/fake-clock';

describe('HistoryService query behavior', () => {
  it('uses one overlap query and one lifetime query for many rendered tasks', () => {
    const now = new Date(2026, 7, 14, 12).getTime();
    const startedAt = new Date(2026, 7, 14, 9).getTime();
    const records = Array.from({ length: 50 }, (_, index) =>
      createRecord(index, startedAt),
    );
    const findActivityCandidatesBefore = vi.fn(() => [
      { id: 'interval-0', startedAt, endedAt: startedAt + 1_000 },
    ]);
    const findOverlappingRange = vi.fn(() => records);
    const sumLifetimeDurations = vi.fn((taskIds: readonly string[]) =>
      taskIds.map((taskId) => ({ taskId, durationMs: 1_000 })),
    );
    const queries: HistoryQueries = {
      findActivityCandidatesBefore,
      findOverlappingRange,
      sumLifetimeDurations,
    };

    const page = new HistoryService({
      clock: new FakeClock(now),
      historyQueries: queries,
    }).getPage({});

    expect(page.days[0]?.tasks).toHaveLength(50);
    expect(findActivityCandidatesBefore).toHaveBeenCalledTimes(1);
    expect(findOverlappingRange).toHaveBeenCalledTimes(1);
    expect(sumLifetimeDurations).toHaveBeenCalledTimes(1);
  });

  it('takes exactly one Clock snapshot for a response', () => {
    const now = new Date(2026, 7, 14, 12).getTime();
    const clock = { now: vi.fn(() => now) };
    const queries: HistoryQueries = {
      findActivityCandidatesBefore: () => [],
      findOverlappingRange: () => [],
      sumLifetimeDurations: () => [],
    };

    expect(
      new HistoryService({ clock, historyQueries: queries }).getPage({}),
    ).toMatchObject({
      now,
      days: [{ totalDurationMs: 0, tasks: [] }],
    });
    expect(clock.now).toHaveBeenCalledTimes(1);
  });
});

const createRecord = (
  index: number,
  startedAt: number,
): HistoryIntervalRecord => ({
  task: { id: `task-${index}`, description: `Task ${index}` },
  interval: {
    id: `interval-${index}`,
    taskId: `task-${index}`,
    startedAt,
    endedAt: startedAt + 1_000,
    createdAt: startedAt,
    updatedAt: startedAt,
  },
});
