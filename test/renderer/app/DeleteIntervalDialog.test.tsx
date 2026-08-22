import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteIntervalDialog } from '@/renderer/app/DeleteIntervalDialog';
import type { AppResult } from '@/shared/contracts/app-result';
import type { HistoryInterval } from '@/shared/contracts/history';
import type { IntervalMutationResult } from '@/shared/contracts/intervals';

const interval: HistoryInterval = {
  id: 'interval-1',
  startedAt: new Date(2026, 7, 13, 23, 30).getTime(),
  endedAt: new Date(2026, 7, 15, 1, 15).getTime(),
  projectedStartedAt: new Date(2026, 7, 14).getTime(),
  projectedEndedAt: new Date(2026, 7, 15).getTime(),
  durationMs: 86_400_000,
  isRunning: false,
};

describe('DeleteIntervalDialog', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows complete cross-day range, Task, and complete duration', () => {
    setDeleteApi(vi.fn());
    renderDialog();

    const dialog = screen.getByRole('dialog', {
      name: 'Delete this time entry?',
    });
    expect(dialog).toBeVisible();
    expect(dialog).toHaveClass('max-h-[calc(100dvh-2rem)]', 'overflow-y-auto');
    expect(
      screen.getByText(/Aug 13, 11:30 PM → Aug 15, 1:15 AM/),
    ).toBeVisible();
    expect(screen.getByText('Implement authentication')).toBeVisible();
    expect(screen.getByText(/This removes/)).toHaveTextContent('25h 45m');
  });

  it('cancels without mutation and supports Escape', async () => {
    const remove = setDeleteApi(vi.fn());
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(remove).not.toHaveBeenCalled();
  });

  it('submits once, stays pending, refreshes authoritatively, and closes', async () => {
    const pending = deferred<AppResult<IntervalMutationResult>>();
    const remove = setDeleteApi(vi.fn(() => pending.promise));
    const onDeleted = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    renderDialog({ onDeleted, onOpenChange });

    const button = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(button);
    fireEvent.click(button);
    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith({ intervalId: 'interval-1' });
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();

    pending.resolve({ ok: true, value: { intervalId: 'interval-1' } });
    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('keeps the dialog actionable for a stale target', async () => {
    setDeleteApi(
      vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'TIME_INTERVAL_NOT_FOUND', message: 'Hidden detail' },
      }),
    );
    renderDialog();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'no longer exists',
    );
    expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
  });
});

const renderDialog = ({
  onDeleted = vi.fn().mockResolvedValue(undefined),
  onOpenChange = vi.fn(),
}: {
  onDeleted?: () => Promise<void>;
  onOpenChange?: (open: boolean) => void;
} = {}) =>
  render(
    <DeleteIntervalDialog
      interval={interval}
      onDeleted={onDeleted}
      onOpenChange={onOpenChange}
      open
      taskDescription="Implement authentication"
    />,
  );

const setDeleteApi = (remove: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: { intervals: { delete: remove } },
  });
  return remove;
};

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};
