import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RenameTaskDialog } from '@/renderer/app/RenameTaskDialog';
import type { AppResult } from '@/shared/contracts/app-result';
import type { TaskMutationResult } from '@/shared/contracts/tasks';

const task = { id: 'task-1', description: 'Implement authentication' };

describe('RenameTaskDialog', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('prefills the complete description, focuses the field, and cancels without mutation', async () => {
    const rename = setRenameApi();
    const onOpenChange = vi.fn();

    render(
      <RenameTaskDialog
        onOpenChange={onOpenChange}
        onRenamed={vi.fn()}
        open
        task={task}
      />,
    );

    const input = screen.getByLabelText('Task description');
    expect(input).toHaveValue(task.description);
    await waitFor(() => expect(input).toHaveFocus());

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(rename).not.toHaveBeenCalled();
  });

  it('validates inline and prevents duplicate submissions while pending', () => {
    const result = deferred<AppResult<TaskMutationResult>>();
    const rename = setRenameApi(vi.fn(() => result.promise));
    render(
      <RenameTaskDialog
        onOpenChange={vi.fn()}
        onRenamed={vi.fn().mockResolvedValue(undefined)}
        open
        task={task}
      />,
    );

    const input = screen.getByLabelText('Task description');
    fireEvent.change(input, { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText(/between 1 and 500 characters/)).toBeVisible();

    fireEvent.change(input, { target: { value: '  Renamed task  ' } });
    const save = screen.getByRole('button', { name: 'Save' });
    fireEvent.click(save);
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(rename).toHaveBeenCalledOnce();
    expect(rename).toHaveBeenCalledWith({
      taskId: 'task-1',
      description: 'Renamed task',
    });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
    expect(input).toBeDisabled();

    result.resolve({
      ok: true,
      value: { task: { ...task, description: 'Renamed task' } },
    });
  });

  it('keeps the entered value and dialog open after a controlled collision', async () => {
    setRenameApi(
      vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: 'TASK_DESCRIPTION_CONFLICT',
          message: 'Internal collision detail',
        },
      }),
    );
    const onOpenChange = vi.fn();
    render(
      <RenameTaskDialog
        onOpenChange={onOpenChange}
        onRenamed={vi.fn()}
        open
        task={task}
      />,
    );

    const input = screen.getByLabelText('Task description');
    fireEvent.change(input, { target: { value: 'Existing task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another task already uses this description',
    );
    expect(input).toHaveValue('Existing task');
    expect(screen.getByRole('dialog', { name: 'Rename Task' })).toBeVisible();
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('refreshes authoritatively before closing after success', async () => {
    const rename = setRenameApi();
    const onRenamed = vi.fn().mockResolvedValue(undefined);
    const onOpenChange = vi.fn();
    render(
      <RenameTaskDialog
        onOpenChange={onOpenChange}
        onRenamed={onRenamed}
        open
        task={task}
      />,
    );

    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: 'Renamed task' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => expect(onRenamed).toHaveBeenCalledOnce());
    expect(rename).toHaveBeenCalledOnce();
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

const setRenameApi = (
  rename = vi.fn().mockResolvedValue({
    ok: true,
    value: { task: { ...task, description: 'Renamed task' } },
  }),
) => {
  Object.defineProperty(window, 'daymark', {
    configurable: true,
    value: { tasks: { rename } },
  });
  return rename;
};

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};
