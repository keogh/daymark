export const formatClockDuration = (durationMs: number): string => {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

export const formatHoursAndMinutes = (durationMs: number): string => {
  const totalMinutes = Math.floor(Math.max(0, durationMs) / 60_000);
  return `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}m`;
};
