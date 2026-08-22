import type { AppResult } from './app-result';

export const SETTINGS_GET_CHANNEL = 'settings:get';
export const SETTINGS_SET_WEEK_START_CHANNEL = 'settings:set-week-start';
export const SETTINGS_SET_THEME_CHANNEL = 'settings:set-theme';

export const WEEK_STARTS_ON_VALUES = ['monday', 'sunday'] as const;
export type WeekStartsOn = (typeof WEEK_STARTS_ON_VALUES)[number];

export const THEME_PREFERENCES = ['system', 'light', 'dark'] as const;
export type ThemePreference = (typeof THEME_PREFERENCES)[number];

export interface ApplicationSettings {
  readonly weekStartsOn: WeekStartsOn;
  readonly theme: ThemePreference;
  readonly updatedAt: number;
}

export interface SetWeekStartsOnInput {
  readonly weekStartsOn: WeekStartsOn;
}

export interface SetThemeInput {
  readonly theme: ThemePreference;
}

export interface SettingsAPI {
  get(this: void): Promise<AppResult<ApplicationSettings>>;
  setWeekStartsOn(
    this: void,
    input: SetWeekStartsOnInput,
  ): Promise<AppResult<ApplicationSettings>>;
  setTheme(
    this: void,
    input: SetThemeInput,
  ): Promise<AppResult<ApplicationSettings>>;
}
