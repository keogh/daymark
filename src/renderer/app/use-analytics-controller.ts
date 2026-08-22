import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AnalyticsRange,
  AnalyticsSummary,
} from '@/shared/contracts/analytics';

type AnalyticsLoadState =
  | { readonly status: 'loading' }
  | { readonly status: 'error' }
  | { readonly status: 'ready'; readonly summary: AnalyticsSummary };

export interface AnalyticsController {
  readonly loadState: AnalyticsLoadState;
  readonly selectedRange: AnalyticsRange;
  readonly pendingRange: AnalyticsRange | null;
  readonly refreshError: boolean;
  readonly selectRange: (range: AnalyticsRange) => void;
  readonly retry: () => void;
}

const AUTHORITATIVE_SYNC_MS = 60_000;

export const useAnalyticsController = (
  refreshRevision = 0,
): AnalyticsController => {
  const [loadState, setLoadState] = useState<AnalyticsLoadState>({
    status: 'loading',
  });
  const [selectedRange, setSelectedRange] =
    useState<AnalyticsRange>('last-7-days');
  const [pendingRange, setPendingRange] = useState<AnalyticsRange | null>(
    'last-7-days',
  );
  const [refreshError, setRefreshError] = useState(false);
  const requestSequence = useRef(0);
  const loadStateRef = useRef(loadState);
  const pendingRangeRef = useRef(pendingRange);
  const selectedRangeRef = useRef(selectedRange);
  const initialRefreshRevision = useRef(refreshRevision);

  useEffect(() => {
    loadStateRef.current = loadState;
  }, [loadState]);

  useEffect(() => {
    selectedRangeRef.current = selectedRange;
  }, [selectedRange]);

  const request = useCallback(async (range: AnalyticsRange) => {
    const requestId = ++requestSequence.current;
    pendingRangeRef.current = range;
    setPendingRange(range);
    setRefreshError(false);

    try {
      const result = await window.timeTracker.analytics.getSummary({ range });
      if (requestId !== requestSequence.current) return;

      pendingRangeRef.current = null;
      setPendingRange(null);
      if (result.ok) {
        const nextLoadState = {
          status: 'ready',
          summary: result.value,
        } as const;
        loadStateRef.current = nextLoadState;
        setLoadState(nextLoadState);
        return;
      }

      if (loadStateRef.current.status === 'ready') {
        setRefreshError(true);
      } else {
        setLoadState({ status: 'error' });
      }
    } catch {
      if (requestId !== requestSequence.current) return;
      pendingRangeRef.current = null;
      setPendingRange(null);
      if (loadStateRef.current.status === 'ready') {
        setRefreshError(true);
      } else {
        setLoadState({ status: 'error' });
      }
    }
  }, []);

  const reconcile = useCallback(() => {
    void request(selectedRangeRef.current);
  }, [request]);

  useEffect(() => {
    let isActive = true;
    const requestId = ++requestSequence.current;

    const loadInitialSummary = async () => {
      try {
        const result = await window.timeTracker.analytics.getSummary({
          range: 'last-7-days',
        });
        if (!isActive || requestId !== requestSequence.current) return;
        pendingRangeRef.current = null;
        setPendingRange(null);
        const nextLoadState = result.ok
          ? ({ status: 'ready', summary: result.value } as const)
          : ({ status: 'error' } as const);
        loadStateRef.current = nextLoadState;
        setLoadState(nextLoadState);
      } catch {
        if (isActive && requestId === requestSequence.current) {
          pendingRangeRef.current = null;
          setPendingRange(null);
          setLoadState({ status: 'error' });
        }
      }
    };

    void loadInitialSummary();
    return () => {
      isActive = false;
    };
  }, []);

  useEffect(() => {
    if (refreshRevision === initialRefreshRevision.current) return;
    initialRefreshRevision.current = refreshRevision;
    reconcile();
  }, [reconcile, refreshRevision]);

  useEffect(() => {
    const handleFocus = () => reconcile();
    window.addEventListener('focus', handleFocus);
    const reconciliationInterval = window.setInterval(
      reconcile,
      AUTHORITATIVE_SYNC_MS,
    );

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
          reconcile();
          scheduleMidnightRefresh();
        },
        Math.max(0, nextMidnight - now.getTime()),
      );
    };
    scheduleMidnightRefresh();

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.clearInterval(reconciliationInterval);
      window.clearTimeout(midnightTimeout);
    };
  }, [reconcile]);

  const selectRange = (range: AnalyticsRange) => {
    if (range === pendingRangeRef.current) return;
    if (
      pendingRangeRef.current === null &&
      loadStateRef.current.status === 'ready' &&
      range === loadStateRef.current.summary.range &&
      !refreshError
    ) {
      return;
    }
    selectedRangeRef.current = range;
    setSelectedRange(range);
    void request(range);
  };

  return {
    loadState,
    selectedRange,
    pendingRange,
    refreshError,
    selectRange,
    retry: () => void request(selectedRange),
  };
};
