import type { AppResult } from '@/shared/contracts/app-result';
import type {
  DeleteIntervalInput,
  UpdateIntervalInput,
} from '@/shared/contracts/intervals';
import { hasExactKeys } from '@/shared/validation/object-shape';

export interface ValidatedUpdateIntervalInput extends UpdateIntervalInput {
  readonly startedAt: number;
  readonly endedAt: number;
}

export type ValidatedDeleteIntervalInput = DeleteIntervalInput;

const UPDATE_KEYS = [
  'intervalId',
  'startDate',
  'startTime',
  'endDate',
  'endTime',
] as const;
const DELETE_KEYS = ['intervalId'] as const;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/u;

export const validateUpdateIntervalInput = (
  input: unknown,
): AppResult<ValidatedUpdateIntervalInput> => {
  if (!isPlainObject(input) || !hasExactKeys(input, UPDATE_KEYS)) {
    return invalidIntervalUpdate();
  }

  const { intervalId, startDate, startTime, endDate, endTime } = input;
  if (
    !isTrimmedNonEmptyString(intervalId) ||
    !isTrimmedNonEmptyString(startDate) ||
    !isTrimmedNonEmptyString(startTime) ||
    !isTrimmedNonEmptyString(endDate) ||
    !isTrimmedNonEmptyString(endTime) ||
    !isValidLocalDate(startDate) ||
    !TIME_PATTERN.test(startTime) ||
    !isValidLocalDate(endDate) ||
    !TIME_PATTERN.test(endTime)
  ) {
    return invalidIntervalUpdate();
  }

  const startedAt = localDateTimeToEpochMs(startDate, startTime);
  const endedAt = localDateTimeToEpochMs(endDate, endTime);
  if (
    startedAt === undefined ||
    endedAt === undefined ||
    endedAt <= startedAt
  ) {
    return invalidIntervalUpdate();
  }

  return {
    ok: true,
    value: {
      intervalId,
      startDate,
      startTime,
      endDate,
      endTime,
      startedAt,
      endedAt,
    },
  };
};

export const validateDeleteIntervalInput = (
  input: unknown,
): AppResult<ValidatedDeleteIntervalInput> => {
  if (
    !isPlainObject(input) ||
    !hasExactKeys(input, DELETE_KEYS) ||
    !isTrimmedNonEmptyString(input.intervalId)
  ) {
    return invalidIntervalDelete();
  }

  return { ok: true, value: { intervalId: input.intervalId } };
};

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
};

const isTrimmedNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value === value.trim();

const isValidLocalDate = (value: string): boolean => {
  if (!DATE_PATTERN.test(value)) {
    return false;
  }

  const [year, month, day] = parseDate(value);
  const candidate = new Date(year, month - 1, day);
  return (
    candidate.getFullYear() === year &&
    candidate.getMonth() === month - 1 &&
    candidate.getDate() === day
  );
};

const localDateTimeToEpochMs = (
  date: string,
  time: string,
): number | undefined => {
  const [year, month, day] = parseDate(date);
  const [hourString, minuteString] = time.split(':');
  const hour = Number(hourString);
  const minute = Number(minuteString);
  const candidate = new Date(year, month - 1, day, hour, minute);

  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day ||
    candidate.getHours() !== hour ||
    candidate.getMinutes() !== minute
  ) {
    return undefined;
  }

  const epochMs = candidate.getTime();
  return Number.isSafeInteger(epochMs) ? epochMs : undefined;
};

const parseDate = (value: string): readonly [number, number, number] => {
  return [
    Number(value.slice(0, 4)),
    Number(value.slice(5, 7)),
    Number(value.slice(8, 10)),
  ];
};

const invalidIntervalUpdate = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_INTERVAL_UPDATE',
    message: 'Interval update input is invalid.',
  },
});

const invalidIntervalDelete = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_INTERVAL_DELETE',
    message: 'Interval delete input is invalid.',
  },
});
