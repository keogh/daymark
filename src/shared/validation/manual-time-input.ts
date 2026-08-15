import type { AppResult } from '@/shared/contracts/app-result';
import {
  MAX_TASK_DESCRIPTION_CODE_POINTS,
  normalizeTaskText,
} from '@/shared/validation/task-description';
import { isRecord } from '@/shared/validation/object-shape';

export type ValidatedCreateManualIntervalInput =
  | {
      readonly taskSource: 'existing-task';
      readonly taskId: string;
      readonly date: string;
      readonly startTime: string;
      readonly endTime: string;
      readonly startedAt: number;
      readonly endedAt: number;
    }
  | {
      readonly taskSource: 'description';
      readonly taskDescription: string;
      readonly normalizedTaskDescription: string;
      readonly date: string;
      readonly startTime: string;
      readonly endTime: string;
      readonly startedAt: number;
      readonly endedAt: number;
    };

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

export const validateCreateManualIntervalInput = (
  input: unknown,
): AppResult<ValidatedCreateManualIntervalInput> => {
  if (
    !isRecord(input) ||
    !hasOnlyManualIntervalKeys(input) ||
    typeof input.date !== 'string' ||
    typeof input.startTime !== 'string' ||
    typeof input.endTime !== 'string'
  ) {
    return invalidManualInterval();
  }

  const date = input.date.trim();
  const startTime = input.startTime.trim();
  const endTime = input.endTime.trim();

  if (!isValidDateString(date) || !isValidTimeString(startTime)) {
    return invalidManualInterval();
  }
  if (!isValidTimeString(endTime)) {
    return invalidManualInterval();
  }

  const startedAt = localDateTimeToEpochMs(date, startTime);
  const endedAt = localDateTimeToEpochMs(date, endTime);
  if (
    !Number.isSafeInteger(startedAt) ||
    !Number.isSafeInteger(endedAt) ||
    endedAt <= startedAt
  ) {
    return invalidManualInterval();
  }

  const taskIdValue = input.taskId;
  const taskDescriptionValue = input.taskDescription;
  const hasTaskId = typeof taskIdValue === 'string';
  const hasTaskDescription = typeof taskDescriptionValue === 'string';
  if (hasTaskId === hasTaskDescription) {
    return invalidManualInterval();
  }

  if (hasTaskId) {
    const taskId = taskIdValue.trim();
    if (taskId.length === 0) {
      return invalidManualInterval();
    }

    return {
      ok: true,
      value: {
        taskSource: 'existing-task',
        taskId,
        date,
        startTime,
        endTime,
        startedAt,
        endedAt,
      },
    };
  }

  if (!hasTaskDescription) {
    return invalidManualInterval();
  }

  const taskDescription = taskDescriptionValue.trim();
  const taskDescriptionLength = Array.from(taskDescription).length;
  if (
    taskDescriptionLength === 0 ||
    taskDescriptionLength > MAX_TASK_DESCRIPTION_CODE_POINTS
  ) {
    return invalidManualInterval();
  }

  return {
    ok: true,
    value: {
      taskSource: 'description',
      taskDescription,
      normalizedTaskDescription: normalizeTaskText(taskDescription),
      date,
      startTime,
      endTime,
      startedAt,
      endedAt,
    },
  };
};

const isValidDateString = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [yearString, monthString, dayString] = value.split('-');
  const year = Number(yearString);
  const month = Number(monthString);
  const day = Number(dayString);
  const candidate = new Date(year, month - 1, day);

  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
};

const isValidTimeString = (value: string): boolean => TIME_PATTERN.test(value);

const localDateTimeToEpochMs = (date: string, time: string): number => {
  const [yearString, monthString, dayString] = date.split('-');
  const [hourString, minuteString] = time.split(':');

  return new Date(
    Number(yearString),
    Number(monthString) - 1,
    Number(dayString),
    Number(hourString),
    Number(minuteString),
  ).getTime();
};

const hasOnlyManualIntervalKeys = (
  value: Record<string, unknown>,
): boolean => {
  const allowedKeys = new Set([
    'taskId',
    'taskDescription',
    'date',
    'startTime',
    'endTime',
  ]);

  return Object.keys(value).every((key) => allowedKeys.has(key));
};

const invalidManualInterval = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_MANUAL_INTERVAL',
    message: 'Manual interval input is invalid.',
  },
});
