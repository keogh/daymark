import type { SettingsRepository } from '@/main/database/repositories/settings-repository';
import type { Clock } from '@/main/domain/clock';
import type { AppResult } from '@/shared/contracts/app-result';
import type {
  ApplicationSettings,
  SetThemeInput,
  SetWeekStartsOnInput,
} from '@/shared/contracts/settings';

export interface SettingsServiceDependencies {
  readonly clock: Clock;
  readonly settings: Pick<
    SettingsRepository,
    'get' | 'setWeekStartsOn' | 'setTheme'
  >;
  readonly logger?: SettingsServiceLogger;
}

export interface SettingsServiceLogger {
  error(message: string, error: unknown): void;
}

export class SettingsService {
  readonly #clock: Clock;
  readonly #settings: SettingsServiceDependencies['settings'];
  readonly #logger: SettingsServiceLogger;

  constructor(dependencies: SettingsServiceDependencies) {
    this.#clock = dependencies.clock;
    this.#settings = dependencies.settings;
    this.#logger = dependencies.logger ?? console;
  }

  get(): AppResult<ApplicationSettings> {
    return this.#safely('Settings read failed.', () => this.#settings.get());
  }

  setWeekStartsOn(input: SetWeekStartsOnInput): AppResult<ApplicationSettings> {
    return this.#safely('Settings week-start update failed.', () => {
      const current = this.#settings.get();
      if (current.weekStartsOn === input.weekStartsOn) {
        return current;
      }

      return this.#settings.setWeekStartsOn(
        input.weekStartsOn,
        this.#clock.now(),
      );
    });
  }

  setTheme(input: SetThemeInput): AppResult<ApplicationSettings> {
    return this.#safely('Settings appearance update failed.', () => {
      const current = this.#settings.get();
      if (current.theme === input.theme) {
        return current;
      }

      return this.#settings.setTheme(input.theme, this.#clock.now());
    });
  }

  #safely(
    message: string,
    operation: () => ApplicationSettings,
  ): AppResult<ApplicationSettings> {
    try {
      return { ok: true, value: operation() };
    } catch (error: unknown) {
      this.#logger.error(message, error);
      return internalError();
    }
  }
}

const internalError = (): AppResult<never> => ({
  ok: false,
  error: {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  },
});
