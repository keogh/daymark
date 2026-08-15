import { useCallback, useEffect, useRef, useState } from 'react';

import type { HistoryPage } from '@/shared/contracts/history';

export type HistoryLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | {
      readonly status: 'ready';
      readonly page: HistoryPage;
      readonly olderPageStatus: 'idle' | 'loading' | 'error';
      readonly reconciliationStatus: 'idle' | 'error';
    };

export interface HistoryController {
  readonly loadState: HistoryLoadState;
  readonly loadOlder: () => Promise<void>;
  readonly retry: () => Promise<void>;
  readonly reconcile: () => Promise<void>;
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

const mergeReconciledPage = (
  currentPage: HistoryPage,
  refreshedPage: HistoryPage,
): HistoryPage => {
  const refreshedDays = new Map(
    refreshedPage.days.map((day) => [day.dayStartedAt, day]),
  );
  for (const day of currentPage.days) {
    if (!refreshedDays.has(day.dayStartedAt)) {
      refreshedDays.set(day.dayStartedAt, day);
    }
  }

  return {
    days: [...refreshedDays.values()].sort(
      (left, right) => right.dayStartedAt - left.dayStartedAt,
    ),
    nextBeforeDayStartedAt: currentPage.nextBeforeDayStartedAt,
    now: refreshedPage.now,
  };
};

export const useHistoryController = (
  refreshRevision = 0,
): HistoryController => {
  const [loadState, setLoadState] = useState<HistoryLoadState>({
    status: 'loading',
  });
  const requestVersion = useRef(0);
  const olderRequestPending = useRef(false);
  const nextOlderCursor = useRef<number | null>(null);
  const initialRefreshRevision = useRef(refreshRevision);

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
                  reconciliationStatus: 'idle',
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
                reconciliationStatus: 'idle',
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

  const reconcile = useCallback(async (): Promise<void> => {
    const version = ++requestVersion.current;
    try {
      const result = await window.timeTracker.history.getPage({});
      if (version !== requestVersion.current) {
        return;
      }
      setLoadState((current) => {
        if (current.status !== 'ready') {
          return current;
        }
        if (!result.ok) {
          return { ...current, reconciliationStatus: 'error' };
        }
        return {
          ...current,
          page: mergeReconciledPage(current.page, result.value),
          reconciliationStatus: 'idle',
        };
      });
    } catch {
      if (version === requestVersion.current) {
        setLoadState((current) =>
          current.status === 'ready'
            ? { ...current, reconciliationStatus: 'error' }
            : current,
        );
      }
    }
  }, []);

  useEffect(() => {
    if (refreshRevision === initialRefreshRevision.current) {
      return;
    }
    initialRefreshRevision.current = refreshRevision;
    void reconcile();
  }, [reconcile, refreshRevision]);

  useEffect(() => {
    const handleFocus = () => void reconcile();
    window.addEventListener('focus', handleFocus);

    let midnightTimeout: number;
    const scheduleMidnightRefresh = () => {
      const now = new Date();
      const nextMidnight = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() + 1,
      ).getTime();
      midnightTimeout = window.setTimeout(
        () => {
          void reconcile();
          scheduleMidnightRefresh();
        },
        Math.max(0, nextMidnight - now.getTime()),
      );
    };
    scheduleMidnightRefresh();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearTimeout(midnightTimeout);
    };
  }, [reconcile]);

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
          reconciliationStatus: current.reconciliationStatus,
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

  return { loadOlder, loadState, reconcile, retry };
};
