import { formatDuration } from './duration-format';

export const formatHistoryDuration = (
  durationMs: number,
  showLessThanMinute = false,
): string => {
  const positiveDuration = Math.max(0, durationMs);
  if (showLessThanMinute && positiveDuration > 0 && positiveDuration < 60_000) {
    return '<1m';
  }

  return formatDuration(positiveDuration);
};

export const formatHistoryDayLabel = (
  dayStartedAt: number,
  now: number,
): string => {
  const day = new Date(dayStartedAt);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  if (day.getTime() === today.getTime()) {
    return 'Today';
  }

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (day.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
  }).format(day);
};

export const formatIntervalTime = (
  timestamp: number,
  isEndAtDayBoundary: boolean,
): string => {
  if (isEndAtDayBoundary) {
    return 'midnight';
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(timestamp);
};
