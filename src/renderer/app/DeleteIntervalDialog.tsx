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
import type { HistoryInterval } from '@/shared/contracts/history';
import { formatHistoryDuration } from './history-format';

const rangeFormatter = new Intl.DateTimeFormat('en-US', {
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit',
});

const formatCompleteRange = (startedAt: number, endedAt: number): string =>
  `${rangeFormatter.format(startedAt)} → ${rangeFormatter.format(endedAt)}`;

const deleteErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'TIME_INTERVAL_NOT_FOUND':
      return 'This time entry no longer exists. Close the dialog and refresh history.';
    case 'OPEN_INTERVAL_NOT_EDITABLE':
      return 'A running time entry cannot be deleted.';
    default:
      return 'The time entry could not be deleted. Please try again.';
  }
};

export const DeleteIntervalDialog = ({
  interval,
  onDeleted,
  onOpenChange,
  open,
  taskDescription,
}: {
  readonly interval: HistoryInterval;
  readonly onDeleted: () => Promise<void>;
  readonly onOpenChange: (open: boolean) => void;
  readonly open: boolean;
  readonly taskDescription: string;
}) => {
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endedAt = interval.endedAt;

  if (endedAt === null) return null;

  const remove = async () => {
    if (isPending) return;

    setIsPending(true);
    setError(null);
    try {
      const result = await window.timeTracker.intervals.delete({
        intervalId: interval.id,
      });
      if (!result.ok) {
        setError(deleteErrorMessage(result.error));
        return;
      }
      await onDeleted();
      onOpenChange(false);
    } catch {
      setError('The time entry could not be deleted. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}
      open={open}
    >
      <DialogContent aria-describedby="delete-time-description">
        <DialogHeader>
          <DialogTitle>Delete this time entry?</DialogTitle>
          <DialogDescription id="delete-time-description">
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <div className="delete-interval-summary">
          <p>{formatCompleteRange(interval.startedAt, endedAt)}</p>
          <p className="delete-interval-summary__task">{taskDescription}</p>
          <p>
            This removes{' '}
            <strong>
              {formatHistoryDuration(endedAt - interval.startedAt, true)}
            </strong>{' '}
            from your tracked time.
          </p>
        </div>
        {error !== null && <FieldError role="alert">{error}</FieldError>}
        <DialogFooter>
          <Button
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
