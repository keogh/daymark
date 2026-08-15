import { useCallback, useEffect, useRef, useState } from 'react';

import type { HistoryPage } from '@/shared/contracts/history';

export type HistoryLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly page: HistoryPage;
      readonly olderPageStatus: 'idle' | 'loading' | 'error';
    };

export interface HistoryController {
  readonly loadState: HistoryLoadState;
  readonly loadOlder: () => Promise<void>;
  readonly retry: () => Promise<void>;
}

const mergeHistoryPages = (
  currentPage: HistoryPage,
  olderPage: HistoryPage,
): HistoryPage => {
  const daysByStart = new Map(
    currentPage.days.map((day) => [day.dayStartedAt, day]),
  );
  for (const day of olderPage.days) {
    if (!daysByStart.has(day.dayStartedAt)) {
      daysByStart.set(day.dayStartedAt, day);
    }
  }

  return {
    days: [...daysByStart.values()].sort(
      (left, right) => right.dayStartedAt - left.dayStartedAt,
    ),
    nextBeforeDayStartedAt: olderPage.nextBeforeDayStartedAt,
    now: olderPage.now,
  };
};

export const useHistoryController = (): HistoryController => {
  const [loadState, setLoadState] = useState<HistoryLoadState>({
    status: 'loading',
  });
  const requestVersion = useRef(0);
  const olderRequestPending = useRef(false);
  const nextOlderCursor = useRef<number | null>(null);

  useEffect(() => {
    let isActive = true;

    const loadInitialPage = async () => {
      try {
        const result = await window.timeTracker.history.getPage({});
        if (isActive) {
          if (result.ok) {
            nextOlderCursor.current = result.value.nextBeforeDayStartedAt;
          }
          setLoadState(
            result.ok
              ? {
                  status: 'ready',
                  page: result.value,
                  olderPageStatus: 'idle',
                }
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
        if (result.ok) {
          nextOlderCursor.current = result.value.nextBeforeDayStartedAt;
        }
        setLoadState(
          result.ok
            ? {
                status: 'ready',
                page: result.value,
                olderPageStatus: 'idle',
              }
            : { status: 'error' },
        );
      }
    } catch {
      if (version === requestVersion.current) {
        setLoadState({ status: 'error' });
      }
    }
  }, []);

  const loadOlder = useCallback(async (): Promise<void> => {
    if (olderRequestPending.current) {
      return;
    }

    const cursor = nextOlderCursor.current;
    if (cursor === null) {
      return;
    }

    olderRequestPending.current = true;
    setLoadState((current) => {
      if (current.status !== 'ready') {
        return current;
      }
      return { ...current, olderPageStatus: 'loading' };
    });

    try {
      const result = await window.timeTracker.history.getPage({
        beforeDayStartedAt: cursor,
      });
      olderRequestPending.current = false;
      if (result.ok) {
        nextOlderCursor.current = result.value.nextBeforeDayStartedAt;
      }
      setLoadState((current) => {
        if (current.status !== 'ready') {
          return current;
        }
        if (!result.ok) {
          return { ...current, olderPageStatus: 'error' };
        }
        return {
          status: 'ready',
          page: mergeHistoryPages(current.page, result.value),
          olderPageStatus: 'idle',
        };
      });
    } catch {
      olderRequestPending.current = false;
      setLoadState((current) =>
        current.status === 'ready'
          ? { ...current, olderPageStatus: 'error' }
          : current,
      );
    }
  }, []);

  return { loadOlder, loadState, retry };
};
