import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { EditIntervalDialog } from '@/renderer/app/EditIntervalDialog';
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

describe('EditIntervalDialog', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('initializes independent fields from complete cross-day bounds and exposes read-only Task context', () => {
    setUpdateApi(vi.fn());
    renderDialog();

    expect(screen.getByRole('dialog', { name: 'Edit time' })).toBeVisible();
    expect(screen.getByText('Implement authentication')).toBeVisible();
    expect(screen.getByLabelText('Start date')).toHaveValue('2026-08-13');
    expect(screen.getByLabelText('Start time')).toHaveValue('23:30');
    expect(screen.getByLabelText('End date')).toHaveValue('2026-08-15');
    expect(screen.getByLabelText('End time')).toHaveValue('01:15');
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('cancels without mutation and supports Escape', async () => {
    const update = setUpdateApi(vi.fn());
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false));
    expect(update).not.toHaveBeenCalled();
  });

  it('disables Save for an invalid range and keeps entered values visible', () => {
    const update = setUpdateApi(vi.fn());
    renderDialog();

    fireEvent.change(screen.getByLabelText('End date'), {
      target: { value: '2026-08-13' },
    });
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '23:30' },
    });

    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(screen.getByText(/end after the start/i)).toBeVisible();
    expect(screen.getByLabelText('End time')).toHaveValue('23:30');
    expect(update).not.toHaveBeenCalled();
  });

  it('prevents duplicate pending submission and closes only after authoritative refresh', async () => {
    const pending = deferred<AppResult<IntervalMutationResult>>();
    const update = setUpdateApi(vi.fn(() => pending.promise));
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange, onSaved });

    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    fireEvent.click(save);

    expect(update).toHaveBeenCalledOnce();
    expect(update).toHaveBeenCalledWith({
      intervalId: 'interval-1',
      startDate: '2026-08-13',
      startTime: '23:30',
      endDate: '2026-08-15',
      endTime: '01:15',
    });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();

    pending.resolve({ ok: true, value: { intervalId: 'interval-1' } });
    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('treats valid overlapping values as a normal success without warning or confirmation', async () => {
    const update = setUpdateApi(
      vi.fn().mockResolvedValue({
        ok: true,
        value: { intervalId: 'interval-1' },
      }),
    );
    const onSaved = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange, onSaved });
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '22:45' },
    });
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '23:45' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onSaved).toHaveBeenCalledOnce());
    expect(update).toHaveBeenCalledWith(
      expect.objectContaining({ startTime: '22:45', endTime: '23:45' }),
    );
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it('does not expose edit-specific guidance for an unexpected overlap result', async () => {
    setUpdateApi(
      vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'TIME_INTERVAL_OVERLAP', message: 'Hidden detail' },
      }),
    );
    renderDialog();
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '22:45' },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'could not be saved',
    );
    expect(screen.getByRole('alert')).not.toHaveTextContent(/overlap/i);
    expect(screen.getByLabelText('Start time')).toHaveValue('22:45');
    expect(screen.getByRole('dialog')).toBeVisible();
  });
});

const renderDialog = ({
  onOpenChange = vi.fn(),
  onSaved = vi.fn().mockResolvedValue(undefined),
}: {
  onOpenChange?: (open: boolean) => void;
  onSaved?: () => Promise<void>;
} = {}) =>
  render(
    <EditIntervalDialog
      interval={interval}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      open
      taskDescription="Implement authentication"
    />,
  );

const setUpdateApi = (update: ReturnType<typeof vi.fn>) => {
  Object.defineProperty(window, 'daymark', {
    configurable: true,
    value: { intervals: { update } },
  });
  return update;
};

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};
