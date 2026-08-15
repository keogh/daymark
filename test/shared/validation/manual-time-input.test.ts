import { describe, expect, it } from 'vitest';

import { validateCreateManualIntervalInput } from '@/shared/validation/manual-time-input';

describe('validateCreateManualIntervalInput', () => {
  it('accepts an existing-task manual interval with trimmed fields', () => {
    expect(
      validateCreateManualIntervalInput({
        taskId: '  task-123  ',
        date: ' 2026-08-14 ',
        startTime: ' 09:15 ',
        endTime: ' 10:45 ',
      }),
    ).toEqual({
      ok: true,
      value: {
        taskSource: 'existing-task',
        taskId: 'task-123',
        date: '2026-08-14',
        startTime: '09:15',
        endTime: '10:45',
        startedAt: new Date(2026, 7, 14, 9, 15).getTime(),
        endedAt: new Date(2026, 7, 14, 10, 45).getTime(),
      },
    });
  });

  it('accepts and normalizes a typed task description', () => {
    expect(
      validateCreateManualIntervalInput({
        taskDescription: '  Implement   Authentication  ',
        date: '2026-08-14',
        startTime: '09:15',
        endTime: '10:45',
      }),
    ).toEqual({
      ok: true,
      value: {
        taskSource: 'description',
        taskDescription: 'Implement   Authentication',
        normalizedTaskDescription: 'implement authentication',
        date: '2026-08-14',
        startTime: '09:15',
        endTime: '10:45',
        startedAt: new Date(2026, 7, 14, 9, 15).getTime(),
        endedAt: new Date(2026, 7, 14, 10, 45).getTime(),
      },
    });
  });

  it.each([
    undefined,
    null,
    [],
    {},
    { date: '2026-08-14', startTime: '09:00', endTime: '10:00' },
    {
      taskId: 'task-1',
      taskDescription: 'Focus',
      date: '2026-08-14',
      startTime: '09:00',
      endTime: '10:00',
    },
    {
      taskId: 'task-1',
      date: '2026-08-14',
      startTime: '09:00',
      endTime: '10:00',
      extra: true,
    },
    {
      taskId: '   ',
      date: '2026-08-14',
      startTime: '09:00',
      endTime: '10:00',
    },
    {
      taskDescription: '   ',
      date: '2026-08-14',
      startTime: '09:00',
      endTime: '10:00',
    },
    {
      taskDescription: 'Focus',
      date: '2026-02-30',
      startTime: '09:00',
      endTime: '10:00',
    },
    {
      taskDescription: 'Focus',
      date: '2026-08-14',
      startTime: '24:00',
      endTime: '10:00',
    },
    {
      taskDescription: 'Focus',
      date: '2026-08-14',
      startTime: '10:00',
      endTime: '10:00',
    },
    {
      taskDescription: 'Focus',
      date: '2026-08-14',
      startTime: '10:00',
      endTime: '09:59',
    },
  ])('rejects malformed or incomplete manual interval input %#', (input) => {
    expect(validateCreateManualIntervalInput(input)).toEqual({
      ok: false,
      error: {
        code: 'INVALID_MANUAL_INTERVAL',
        message: 'Manual interval input is invalid.',
      },
    });
  });

  it('accepts 500 Unicode code points and rejects 501 for task descriptions', () => {
    const emoji = '🐮';

    expect(
      validateCreateManualIntervalInput({
        taskDescription: emoji.repeat(500),
        date: '2026-08-14',
        startTime: '09:00',
        endTime: '10:00',
      }).ok,
    ).toBe(true);
    expect(
      validateCreateManualIntervalInput({
        taskDescription: emoji.repeat(501),
        date: '2026-08-14',
        startTime: '09:00',
        endTime: '10:00',
      }),
    ).toEqual({
      ok: false,
      error: {
        code: 'INVALID_MANUAL_INTERVAL',
        message: 'Manual interval input is invalid.',
      },
    });
  });
});
