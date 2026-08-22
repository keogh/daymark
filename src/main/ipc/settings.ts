import type { SettingsService } from '@/main/services/settings-service';
import {
  toRendererSafeError,
  type AppResult,
} from '@/shared/contracts/app-result';
import {
  SETTINGS_GET_CHANNEL,
  SETTINGS_SET_THEME_CHANNEL,
  SETTINGS_SET_WEEK_START_CHANNEL,
  type ApplicationSettings,
} from '@/shared/contracts/settings';
import {
  validateSetThemeInput,
  validateSetWeekStartsOnInput,
} from '@/shared/validation/settings-input';

type SettingsHandler = (
  event: unknown,
  input?: unknown,
) => AppResult<ApplicationSettings>;

export interface SettingsIpcRegistrar {
  handle(channel: string, listener: SettingsHandler): void;
  removeHandler(channel: string): void;
}

export interface SettingsIpcLogger {
  error(message: string, error: unknown): void;
}

export const registerSettingsHandlers = (
  ipc: SettingsIpcRegistrar,
  settingsService: Pick<
    SettingsService,
    'get' | 'setWeekStartsOn' | 'setTheme'
  >,
  logger: SettingsIpcLogger,
): (() => void) => {
  ipc.handle(SETTINGS_GET_CHANNEL, () => {
    try {
      return sanitizeResult(settingsService.get());
    } catch (error: unknown) {
      return unexpectedFailure(
        logger,
        'Unexpected settings read IPC failure.',
        error,
      );
    }
  });

  ipc.handle(SETTINGS_SET_WEEK_START_CHANNEL, (_event, input) => {
    try {
      const validation = validateSetWeekStartsOnInput(input);
      if (!validation.ok) {
        return validation;
      }

      return sanitizeResult(settingsService.setWeekStartsOn(validation.value));
    } catch (error: unknown) {
      return unexpectedFailure(
        logger,
        'Unexpected settings week-start IPC failure.',
        error,
      );
    }
  });

  ipc.handle(SETTINGS_SET_THEME_CHANNEL, (_event, input) => {
    try {
      const validation = validateSetThemeInput(input);
      if (!validation.ok) {
        return validation;
      }

      return sanitizeResult(settingsService.setTheme(validation.value));
    } catch (error: unknown) {
      return unexpectedFailure(
        logger,
        'Unexpected settings appearance IPC failure.',
        error,
      );
    }
  });

  return () => {
    ipc.removeHandler(SETTINGS_GET_CHANNEL);
    ipc.removeHandler(SETTINGS_SET_WEEK_START_CHANNEL);
    ipc.removeHandler(SETTINGS_SET_THEME_CHANNEL);
  };
};

const sanitizeResult = (
  result: AppResult<ApplicationSettings>,
): AppResult<ApplicationSettings> =>
  result.ok ? result : { ok: false, error: toRendererSafeError(result.error) };

const unexpectedFailure = (
  logger: SettingsIpcLogger,
  message: string,
  error: unknown,
): AppResult<never> => {
  logger.error(message, error);
  return { ok: false, error: toRendererSafeError(undefined) };
};
