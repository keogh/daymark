import type { AppResult } from '@/shared/contracts/app-result';
import {
  ANALYTICS_RANGES,
  type AnalyticsRange,
  type AnalyticsSummaryInput,
} from '@/shared/contracts/analytics';
import { hasExactKeys, isRecord } from '@/shared/validation/object-shape';

const analyticsRanges = new Set<string>(ANALYTICS_RANGES);

export const validateAnalyticsSummaryInput = (
  input: unknown,
): AppResult<AnalyticsSummaryInput> => {
  if (
    !isRecord(input) ||
    !hasExactKeys(input, ['range']) ||
    !Object.hasOwn(input, 'range') ||
    typeof input.range !== 'string' ||
    !analyticsRanges.has(input.range)
  ) {
    return invalidAnalyticsRange();
  }

  return {
    ok: true,
    value: { range: input.range as AnalyticsRange },
  };
};

const invalidAnalyticsRange = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INVALID_ANALYTICS_RANGE',
    message: 'The requested analytics range is invalid.',
  },
});
