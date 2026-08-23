import type { Clock } from '@/main/domain/clock';
import type { TimerState } from '@/shared/contracts/timer';
import { productIdentity } from '@/shared/product-identity';

export const TRAY_TITLE = productIdentity.displayName;
export const TRAY_TOOLTIP = productIdentity.displayName;

export type TrayCommand = 'open' | 'pause' | 'resume' | 'stop' | 'quit';

export type TrayMenuItem =
  | {
      readonly kind: 'information';
      readonly label: string;
    }
  | {
      readonly kind: 'separator';
    }
  | {
      readonly kind: 'command';
      readonly command: TrayCommand;
      readonly label: string;
    };

export interface TrayPresentation {
  readonly title: typeof TRAY_TITLE;
  readonly tooltip: typeof TRAY_TOOLTIP;
  readonly items: readonly TrayMenuItem[];
}

export const formatTrayDuration = (durationMs: number): string => {
  const totalSeconds = Math.floor(Math.max(0, durationMs) / 1_000);
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;

  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, '0'))
    .join(':');
};

export const formatTrayTaskDescription = (description: string): string => {
  const normalized = description.replace(/\p{White_Space}+/gu, ' ').trim();
  const codePoints = Array.from(normalized);

  return codePoints.length <= 80
    ? normalized
    : `${codePoints.slice(0, 79).join('')}…`;
};

export const getTraySessionDurationMs = (
  state: TimerState,
  clock: Clock,
): number => {
  const snapshotDurationMs = Math.max(0, state.sessionDurationMs);

  if (state.status !== 'running') {
    return snapshotDurationMs;
  }

  return snapshotDurationMs + Math.max(0, clock.now() - state.now);
};

const information = (label: string): TrayMenuItem => ({
  kind: 'information',
  label,
});

const command = (label: string, trayCommand: TrayCommand): TrayMenuItem => ({
  kind: 'command',
  command: trayCommand,
  label,
});

const separator: TrayMenuItem = { kind: 'separator' };

export const createTrayPresentation = (
  state: TimerState,
  clock: Clock,
): TrayPresentation => {
  const commonEnding: readonly TrayMenuItem[] = [
    separator,
    command(`Open ${productIdentity.displayName}`, 'open'),
    separator,
    command('Quit', 'quit'),
  ];

  if (state.status === 'idle') {
    return {
      title: TRAY_TITLE,
      tooltip: TRAY_TOOLTIP,
      items: [
        information(TRAY_TITLE),
        information('No active timer'),
        ...commonEnding,
      ],
    };
  }

  const duration = formatTrayDuration(getTraySessionDurationMs(state, clock));
  const stateCommand =
    state.status === 'running'
      ? command('Pause', 'pause')
      : command('Resume', 'resume');
  const durationLabel =
    state.status === 'running' ? duration : `Paused · ${duration}`;

  return {
    title: TRAY_TITLE,
    tooltip: TRAY_TOOLTIP,
    items: [
      information(TRAY_TITLE),
      information(
        formatTrayTaskDescription(state.currentTask?.description ?? ''),
      ),
      information(durationLabel),
      separator,
      stateCommand,
      command('Stop', 'stop'),
      ...commonEnding,
    ],
  };
};
