import type { ThemePreference } from '@/shared/contracts/settings';

export type EffectiveAppearance = 'light' | 'dark';

export const resolveEffectiveAppearance = (
  preference: ThemePreference,
  systemPrefersDark: boolean,
): EffectiveAppearance =>
  preference === 'dark' || (preference === 'system' && systemPrefersDark)
    ? 'dark'
    : 'light';

export const applyAppearance = (
  root: HTMLElement,
  preference: ThemePreference,
  systemPrefersDark: boolean,
) => {
  const effectiveAppearance = resolveEffectiveAppearance(
    preference,
    systemPrefersDark,
  );

  root.dataset.theme = effectiveAppearance;
  root.dataset.themePreference = preference;
  root.classList.toggle('dark', effectiveAppearance === 'dark');
  root.style.colorScheme = effectiveAppearance;
};
