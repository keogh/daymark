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
