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

export const useAnalyticsController = (): AnalyticsController => {
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

  useEffect(() => {
    loadStateRef.current = loadState;
  }, [loadState]);

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
        setLoadState({ status: 'ready', summary: result.value });
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
        setLoadState(
          result.ok
            ? { status: 'ready', summary: result.value }
            : { status: 'error' },
        );
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
