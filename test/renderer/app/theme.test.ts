import { afterEach, describe, expect, it } from 'vitest';

import {
  applyAppearance,
  resolveEffectiveAppearance,
} from '@/renderer/app/theme';

describe('renderer appearance', () => {
  afterEach(() => {
    document.documentElement.classList.remove('dark');
    delete document.documentElement.dataset.theme;
    delete document.documentElement.dataset.themePreference;
    document.documentElement.style.colorScheme = '';
  });

  it.each([
    ['light', false, 'light'],
    ['light', true, 'light'],
    ['dark', false, 'dark'],
    ['dark', true, 'dark'],
    ['system', false, 'light'],
    ['system', true, 'dark'],
  ] as const)(
    'resolves %s with system dark=%s to %s',
    (preference, systemPrefersDark, expected) => {
      expect(resolveEffectiveAppearance(preference, systemPrefersDark)).toBe(
        expected,
      );
    },
  );

  it('exposes the preference and effective appearance on the renderer root', () => {
    applyAppearance(document.documentElement, 'system', true);

    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute(
      'data-theme-preference',
      'system',
    );
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });
});
