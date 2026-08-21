import { useState } from 'react';

import { Button } from '@/renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog';
import { FieldError } from '@/renderer/components/ui/field';
import type { AppError } from '@/shared/contracts/app-result';
import type { TaskDeletionSummary } from '@/shared/contracts/tasks';
import { formatHistoryDuration } from './history-format';

const deleteErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'TASK_NOT_FOUND':
      return 'This task no longer exists. Close the dialog and refresh history.';
    case 'ACTIVE_TASK_CANNOT_BE_DELETED':
      return 'Stop this task before deleting it.';
    default:
      return 'The task could not be deleted. Please try again.';
  }
};

export const DeleteTaskDialog = ({
  onDeleted,
  onOpenChange,
  open,
  summary,
}: {
  readonly onDeleted: () => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly summary: TaskDeletionSummary;
}) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalLabel =
    summary.intervalCount === 1
      ? 'recorded time interval'
      : 'recorded time intervals';

  const remove = async () => {
    if (isPending) return;

    setIsPending(true);
    setError(null);
    try {
      const result = await window.timeTracker.tasks.delete({
        taskId: summary.task.id,
      });
      if (!result.ok) {
        setError(deleteErrorMessage(result.error));
        return;
      }
      await onDeleted();
      onOpenChange(false);
    } catch {
      setError('The task could not be deleted. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}
      open={open}
    >
      <DialogContent aria-describedby="delete-task-description">
        <DialogHeader>
          <DialogTitle>
            Delete &quot;{summary.task.description}&quot;?
          </DialogTitle>
          <DialogDescription id="delete-task-description">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="delete-task-summary">
          <p>
            This will permanently delete the task and its{' '}
            <strong>{summary.intervalCount}</strong> {intervalLabel} (
            {formatHistoryDuration(summary.lifetimeDurationMs, true)}).
          </p>
        </div>
        {error !== null && <FieldError role="alert">{error}</FieldError>}
        <DialogFooter>
          <Button
            autoFocus
            disabled={isPending}
            onClick={() => onOpenChange(false)}
            type="button"
            variant="outline"
          >
            Cancel
          </Button>
          <Button
            disabled={isPending}
            onClick={() => void remove()}
            type="button"
            variant="destructive"
          >
            {isPending ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
