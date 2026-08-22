import { eq } from 'drizzle-orm';

import type { ApplicationDatabase } from '@/main/database/database';
import { applicationSettings } from '@/main/database/schema';
import {
  THEME_PREFERENCES,
  type ApplicationSettings,
  type ThemePreference,
  WEEK_STARTS_ON_VALUES,
  type WeekStartsOn,
} from '@/shared/contracts/settings';

const APPLICATION_SETTINGS_ID = 1;
const weekStartsOnValues = new Set<string>(WEEK_STARTS_ON_VALUES);
const themePreferences = new Set<string>(THEME_PREFERENCES);

export class SettingsRepository {
  readonly #db: ApplicationDatabase;

  constructor(db: ApplicationDatabase) {
    this.#db = db;
  }

  get(): ApplicationSettings {
    return toApplicationSettings(this.#readSingleton());
  }

  setWeekStartsOn(
    weekStartsOn: WeekStartsOn,
    updatedAt: number,
  ): ApplicationSettings {
    const row = this.#db
      .update(applicationSettings)
      .set({ weekStartsOn, updatedAt })
      .where(eq(applicationSettings.id, APPLICATION_SETTINGS_ID))
      .returning()
      .get();

    return toApplicationSettings(requireSingleton(row));
  }

  setTheme(theme: ThemePreference, updatedAt: number): ApplicationSettings {
    const row = this.#db
      .update(applicationSettings)
      .set({ theme, updatedAt })
      .where(eq(applicationSettings.id, APPLICATION_SETTINGS_ID))
      .returning()
      .get();

    return toApplicationSettings(requireSingleton(row));
  }

  #readSingleton(): typeof applicationSettings.$inferSelect {
    return requireSingleton(
      this.#db
        .select()
        .from(applicationSettings)
        .where(eq(applicationSettings.id, APPLICATION_SETTINGS_ID))
        .get(),
    );
  }
}

const requireSingleton = (
  row: typeof applicationSettings.$inferSelect | undefined,
): typeof applicationSettings.$inferSelect => {
  if (row === undefined) {
    throw new Error('Singleton ApplicationSettings row is missing.');
  }

  return row;
};

const toApplicationSettings = (
  row: typeof applicationSettings.$inferSelect,
): ApplicationSettings => {
  if (
    row.id !== APPLICATION_SETTINGS_ID ||
    !weekStartsOnValues.has(row.weekStartsOn) ||
    !themePreferences.has(row.theme) ||
    !Number.isSafeInteger(row.updatedAt)
  ) {
    throw new Error('Singleton ApplicationSettings row is invalid.');
  }

  return {
    weekStartsOn: row.weekStartsOn,
    theme: row.theme,
    updatedAt: row.updatedAt,
  };
};
