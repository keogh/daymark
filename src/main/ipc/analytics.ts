import type { AnalyticsService } from '@/main/services/analytics-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  ANALYTICS_GET_SUMMARY_CHANNEL,
  type AnalyticsSummary,
} from '@/shared/contracts/analytics';
import { validateAnalyticsSummaryInput } from '@/shared/validation/analytics-summary-input';

type AnalyticsHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<AnalyticsSummary>;

export interface AnalyticsIpcRegistrar {
  handle(channel: string, listener: AnalyticsHandler): void;
  removeHandler(channel: string): void;
}

export interface AnalyticsIpcLogger {
  error(message: string, error: unknown): void;
}

export const registerAnalyticsHandler = (
  ipc: AnalyticsIpcRegistrar,
  analyticsService: Pick<AnalyticsService, 'getSummary'>,
  logger: AnalyticsIpcLogger,
): (() => void) => {
  ipc.handle(ANALYTICS_GET_SUMMARY_CHANNEL, (_event, input) => {
    try {
      const validation = validateAnalyticsSummaryInput(input);
      if (!validation.ok) {
        return validation;
      }

      return {
        ok: true,
        value: analyticsService.getSummary(validation.value),
      };
    } catch (error: unknown) {
      logger.error('Unexpected analytics IPC failure.', error);
      return { ok: false, error: toRendererSafeError(undefined) };
    }
  });

  return () => ipc.removeHandler(ANALYTICS_GET_SUMMARY_CHANNEL);
};
