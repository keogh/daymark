import { useEffect, useState } from 'react';

import type { TimerState } from '@/shared/contracts/timer';

const DISPLAY_TICK_MS = 1_000;

export const useDisplayDuration = (timer: TimerState): number => {
  const [rendererNow, setRendererNow] = useState(() => Date.now());

  useEffect(() => {
    if (timer.status !== 'running') {
      return;
    }

    const interval = window.setInterval(() => {
      setRendererNow(Date.now());
    }, DISPLAY_TICK_MS);

    return () => window.clearInterval(interval);
  }, [timer.status]);

  if (timer.status !== 'running') {
    return timer.sessionDurationMs;
  }

  return timer.sessionDurationMs + Math.max(0, rendererNow - timer.now);
};
