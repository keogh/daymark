import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DeleteTaskDialog } from '@/renderer/app/DeleteTaskDialog';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TaskDeletionResult } from '@/shared/contracts/tasks';

const summary = {
  task: { id: 'task-1', description: 'Implement authentication' },
  intervalCount: 17,
  lifetimeDurationMs: 30_600_000,
};

describe('DeleteTaskDialog', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('identifies the task, interval count, and lifetime duration and cancels without mutation', async () => {
    const remove = setDeleteApi();
    const onOpenChange = vi.fn();
    renderDialog({ onOpenChange });

    expect(
      screen.getByRole('dialog', {
        name: 'Delete "Implement authentication"?',
      }),
    ).toBeVisible();
    expect(screen.getByRole('dialog')).toHaveTextContent(
      '17 recorded time intervals (8h 30m)',
    );
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Cancel' })).toHaveFocus(),
    );

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(remove).not.toHaveBeenCalled();
  });

  it('prevents duplicate confirmation while deletion is pending', () => {
    const result = deferred<AppResult<TaskDeletionResult>>();
    const remove = setDeleteApi(vi.fn(() => result.promise));
    renderDialog();

    const button = screen.getByRole('button', { name: 'Delete' });
    fireEvent.click(button);
    fireEvent.click(button);

    expect(remove).toHaveBeenCalledOnce();
    expect(remove).toHaveBeenCalledWith({ taskId: 'task-1' });
    expect(screen.getByRole('button', { name: 'Deleting…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();

    result.resolve({ ok: true, value: { taskId: 'task-1' } });
  });

  it.each([
    {
      code: 'TASK_NOT_FOUND' as const,
      expected: 'This task no longer exists',
    },
    {
      code: 'ACTIVE_TASK_CANNOT_BE_DELETED' as const,
      expected: 'Stop this task before deleting it',
    },
    {
      code: 'INTERNAL_ERROR' as const,
      expected: 'The task could not be deleted',
    },
  ])(
    'keeps the dialog actionable after a $code failure',
    async ({ code, expected }) => {
      setDeleteApi(
        vi.fn().mockResolvedValue({
          ok: false,
          error: { code, message: 'Internal detail' },
        }),
      );
      const onOpenChange = vi.fn();
      renderDialog({ onOpenChange });

      fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

      expect(await screen.findByRole('alert')).toHaveTextContent(expected);
      expect(screen.getByRole('button', { name: 'Delete' })).toBeEnabled();
      expect(onOpenChange).not.toHaveBeenCalled();
    },
  );

  it('refreshes authoritatively before closing after success', async () => {
    setDeleteApi();
    const onDeleted = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    renderDialog({ onDeleted, onOpenChange });

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    await waitFor(() => expect(onDeleted).toHaveBeenCalledOnce());
    expect(onOpenChange).toHaveBeenCalledWith(false);
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
    <DeleteTaskDialog
      onDeleted={onDeleted}
      onOpenChange={onOpenChange}
      open
      summary={summary}
    />,
  );

const setDeleteApi = (
  remove = vi.fn().mockResolvedValue({
    ok: true,
    value: { taskId: 'task-1' },
  }),
) => {
  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: { tasks: { delete: remove } },
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
