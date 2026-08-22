import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  ApplicationSettings,
  ThemePreference,
  WeekStartsOn,
} from '@/shared/contracts/settings';

type SettingsLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly settings: ApplicationSettings };

type PendingPreference = 'theme' | 'week-start' | null;

export interface SettingsController {
  readonly loadState: SettingsLoadState;
  readonly pendingPreference: PendingPreference;
  readonly mutationError: string | null;
  readonly retry: () => void;
  readonly setTheme: (theme: ThemePreference) => void;
  readonly setWeekStartsOn: (weekStartsOn: WeekStartsOn) => void;
}

const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)';
const LOAD_ERROR = 'Settings could not be loaded.';
const SAVE_ERROR = 'This setting was not saved. Please try again.';

const applyTheme = (theme: ThemePreference, systemPrefersDark: boolean) => {
  const useDark = theme === 'dark' || (theme === 'system' && systemPrefersDark);
  document.documentElement.classList.toggle('dark', useDark);
  document.documentElement.style.colorScheme = useDark ? 'dark' : 'light';
};

export const useSettingsController = (
  onWeekStartConfirmed: () => void,
): SettingsController => {
  const [loadState, setLoadState] = useState<SettingsLoadState>({
    status: 'loading',
  });
  const [pendingPreference, setPendingPreference] =
    useState<PendingPreference>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const confirmedSettings = useRef<ApplicationSettings | null>(null);
  const pendingPreferenceRef = useRef<PendingPreference>(null);
  const activeTheme = useRef<ThemePreference>('system');
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  const onWeekStartConfirmedRef = useRef(onWeekStartConfirmed);

  useEffect(() => {
    onWeekStartConfirmedRef.current = onWeekStartConfirmed;
  }, [onWeekStartConfirmed]);

  const systemPrefersDark = useCallback(
    () => window.matchMedia(SYSTEM_THEME_QUERY).matches,
    [],
  );

  const showTheme = useCallback(
    (theme: ThemePreference) => {
      activeTheme.current = theme;
      applyTheme(theme, systemPrefersDark());
    },
    [systemPrefersDark],
  );

  const load = useCallback(async () => {
    const requestId = ++requestSequence.current;
    setLoadState({ status: 'loading' });
    setMutationError(null);

    try {
      const result = await window.timeTracker.settings.get();
      if (!mounted.current || requestId !== requestSequence.current) return;
      if (result.ok) {
        confirmedSettings.current = result.value;
        showTheme(result.value.theme);
        setLoadState({ status: 'ready', settings: result.value });
        return;
      }
    } catch {
      // The controlled renderer state below intentionally hides boundary detail.
    }

    if (!mounted.current || requestId !== requestSequence.current) return;
    confirmedSettings.current = null;
    showTheme('system');
    setLoadState({ status: 'error' });
  }, [showTheme]);

  useEffect(() => {
    mounted.current = true;
    const loadInitialSettings = async () => {
      await Promise.resolve();
      if (mounted.current) void load();
    };
    void loadInitialSettings();
    return () => {
      mounted.current = false;
      requestSequence.current += 1;
    };
  }, [load]);

  useEffect(() => {
    const media = window.matchMedia(SYSTEM_THEME_QUERY);
    const handleChange = () => {
      if (activeTheme.current === 'system') applyTheme('system', media.matches);
    };
    media.addEventListener('change', handleChange);
    return () => media.removeEventListener('change', handleChange);
  }, []);

  const commit = useCallback(
    async (
      preference: Exclude<PendingPreference, null>,
      request: () => ReturnType<Window['timeTracker']['settings']['get']>,
      optimisticTheme?: ThemePreference,
    ) => {
      const previous = confirmedSettings.current;
      if (previous === null || pendingPreferenceRef.current !== null) return;

      const requestId = ++requestSequence.current;
      pendingPreferenceRef.current = preference;
      setPendingPreference(preference);
      setMutationError(null);
      if (optimisticTheme !== undefined) showTheme(optimisticTheme);

      try {
        const result = await request();
        if (!mounted.current || requestId !== requestSequence.current) return;
        if (result.ok) {
          confirmedSettings.current = result.value;
          showTheme(result.value.theme);
          setLoadState({ status: 'ready', settings: result.value });
          pendingPreferenceRef.current = null;
          setPendingPreference(null);
          if (preference === 'week-start') {
            onWeekStartConfirmedRef.current();
          }
          return;
        }
      } catch {
        // The controlled renderer state below intentionally hides boundary detail.
      }

      if (!mounted.current || requestId !== requestSequence.current) return;
      showTheme(previous.theme);
      setLoadState({ status: 'ready', settings: previous });
      pendingPreferenceRef.current = null;
      setPendingPreference(null);
      setMutationError(SAVE_ERROR);
    },
    [showTheme],
  );

  const setWeekStartsOn = (weekStartsOn: WeekStartsOn) => {
    const settings = confirmedSettings.current;
    if (
      settings === null ||
      pendingPreferenceRef.current !== null ||
      settings.weekStartsOn === weekStartsOn
    ) {
      return;
    }
    void commit('week-start', () =>
      window.timeTracker.settings.setWeekStartsOn({ weekStartsOn }),
    );
  };

  const setTheme = (theme: ThemePreference) => {
    const settings = confirmedSettings.current;
    if (
      settings === null ||
      pendingPreferenceRef.current !== null ||
      settings.theme === theme
    ) {
      return;
    }
    void commit(
      'theme',
      () => window.timeTracker.settings.setTheme({ theme }),
      theme,
    );
  };

  return {
    loadState,
    pendingPreference,
    mutationError,
    retry: () => void load(),
    setTheme,
    setWeekStartsOn,
  };
};

export const settingsLoadErrorMessage = LOAD_ERROR;
