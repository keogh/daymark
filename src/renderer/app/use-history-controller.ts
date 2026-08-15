import { useCallback, useEffect, useRef, useState } from 'react';

import type { HistoryPage } from '@/shared/contracts/history';

export type HistoryLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly page: HistoryPage };

export interface HistoryController {
  readonly loadState: HistoryLoadState;
  readonly retry: () => Promise<void>;
}

export const useHistoryController = (): HistoryController => {
  const [loadState, setLoadState] = useState<HistoryLoadState>({
    status: 'loading',
  });
  const requestVersion = useRef(0);

  useEffect(() => {
    let isActive = true;

    const loadInitialPage = async () => {
      try {
        const result = await window.timeTracker.history.getPage({});
        if (isActive) {
          setLoadState(
            result.ok
              ? { status: 'ready', page: result.value }
              : { status: 'error' },
          );
        }
      } catch {
        if (isActive) {
          setLoadState({ status: 'error' });
        }
      }
    };

    void loadInitialPage();
    return () => {
      isActive = false;
    };
  }, []);

  const retry = useCallback(async (): Promise<void> => {
    const version = ++requestVersion.current;
    setLoadState({ status: 'loading' });
    try {
      const result = await window.timeTracker.history.getPage({});
      if (version === requestVersion.current) {
        setLoadState(
          result.ok
            ? { status: 'ready', page: result.value }
            : { status: 'error' },
        );
      }
    } catch {
      if (version === requestVersion.current) {
        setLoadState({ status: 'error' });
      }
    }
  }, []);

  return { loadState, retry };
};
