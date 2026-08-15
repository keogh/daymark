import type { AppResult } from '@/shared/contracts/app-result';
import type { HistoryPageInput } from '@/shared/contracts/history';

const allowedKeys = new Set(['beforeDayStartedAt']);

export const validateHistoryPageInput = (
  input: unknown,
  now: number,
): AppResult<HistoryPageInput> => {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return invalidHistoryRange();
  }

  const candidate = input as Record<string, unknown>;
  if (Object.keys(candidate).some((key) => !allowedKeys.has(key))) {
    return invalidHistoryRange();
  }

  if (!Object.hasOwn(candidate, 'beforeDayStartedAt')) {
    return { ok: true, value: {} };
  }

  const cursor = candidate.beforeDayStartedAt;
  if (
    typeof cursor !== 'number' ||
    !Number.isSafeInteger(cursor) ||
    !isLocalDayStart(cursor) ||
    cursor > getLocalDayStartedAt(now)
  ) {
    return invalidHistoryRange();
  }

  return { ok: true, value: { beforeDayStartedAt: cursor } };
};

const getLocalDayStartedAt = (timestamp: number): number => {
  const date = new Date(timestamp);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};

const isLocalDayStart = (timestamp: number): boolean =>
  getLocalDayStartedAt(timestamp) === timestamp;

const invalidHistoryRange = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_HISTORY_RANGE',
    message: 'The requested history range is invalid.',
  },
});
