import { useState, type SubmitEvent } from 'react';

import { Button } from '@/renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog';
import {
  Field,
  FieldError,
  FieldLabel,
  FieldTitle,
} from '@/renderer/components/ui/field';
import { Input } from '@/renderer/components/ui/input';
import type { AppError } from '@/shared/contracts/app-result';
import type { HistoryInterval } from '@/shared/contracts/history';
import type { UpdateIntervalInput } from '@/shared/contracts/intervals';
import { validateUpdateIntervalInput } from '@/shared/validation/interval-correction-input';
import {
  formatLocalDateInput,
  formatLocalTimeInput,
} from './local-date-format';

const editErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'INVALID_INTERVAL_UPDATE':
      return 'Enter a valid range whose end is after its start.';
    case 'TIME_INTERVAL_OVERLAP':
      return 'This time overlaps an existing entry. Choose a different range.';
    case 'TIME_INTERVAL_NOT_FOUND':
      return 'This time entry no longer exists. Close the dialog and refresh history.';
    case 'OPEN_INTERVAL_NOT_EDITABLE':
      return 'A running time entry cannot be edited.';
    default:
      return 'The time entry could not be saved. Please try again.';
  }
};

export const EditIntervalDialog = ({
  interval,
  onOpenChange,
  onSaved,
  open,
  taskDescription,
}: {
  readonly interval: HistoryInterval;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => Promise<void>;
  readonly open: boolean;
  readonly taskDescription: string;
}) => {
  const completeEnd = interval.endedAt;
  if (completeEnd === null) {
    return null;
  }

  return (
    <EditIntervalForm
      initialInput={{
        intervalId: interval.id,
        startDate: formatLocalDateInput(interval.startedAt),
        startTime: formatLocalTimeInput(interval.startedAt),
        endDate: formatLocalDateInput(completeEnd),
        endTime: formatLocalTimeInput(completeEnd),
      }}
      onOpenChange={onOpenChange}
      onSaved={onSaved}
      open={open}
      taskDescription={taskDescription}
    />
  );
};

const EditIntervalForm = ({
  initialInput,
  onOpenChange,
  onSaved,
  open,
  taskDescription,
}: {
  readonly initialInput: UpdateIntervalInput;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => Promise<void>;
  readonly open: boolean;
  readonly taskDescription: string;
}) => {
  const [startDate, setStartDate] = useState(initialInput.startDate);
  const [startTime, setStartTime] = useState(initialInput.startTime);
  const [endDate, setEndDate] = useState(initialInput.endDate);
  const [endTime, setEndTime] = useState(initialInput.endTime);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = { ...initialInput, startDate, startTime, endDate, endTime };
  const validation = validateUpdateIntervalInput(input);
  const hasCompleteShape =
    startDate.length > 0 &&
    startTime.length > 0 &&
    endDate.length > 0 &&
    endTime.length > 0;
  const hasInvalidRange = hasCompleteShape && !validation.ok;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.ok || isPending) return;

    setIsPending(true);
    setError(null);
    try {
      const result = await window.timeTracker.intervals.update(input);
      if (!result.ok) {
        setError(editErrorMessage(result.error));
        return;
      }
      await onSaved();
      onOpenChange(false);
    } catch {
      setError('The time entry could not be saved. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}
      open={open}
    >
      <DialogContent aria-describedby="edit-time-description">
        <DialogHeader>
          <DialogTitle>Edit time</DialogTitle>
          <DialogDescription id="edit-time-description">
            Correct one completed block of work.
          </DialogDescription>
        </DialogHeader>
        <form
          className="edit-interval-form"
          onSubmit={(event) => void submit(event)}
        >
          <Field>
            <FieldTitle>Task</FieldTitle>
            <p className="edit-interval-form__task">{taskDescription}</p>
          </Field>
          <div className="edit-interval-form__row">
            <Field>
              <FieldLabel htmlFor="edit-start-date">Start date</FieldLabel>
              <Input
                disabled={isPending}
                id="edit-start-date"
                onChange={(event) => setStartDate(event.target.value)}
                required
                type="date"
                value={startDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-start-time">Start time</FieldLabel>
              <Input
                disabled={isPending}
                id="edit-start-time"
                onChange={(event) => setStartTime(event.target.value)}
                required
                type="time"
                value={startTime}
              />
            </Field>
          </div>
          <div className="edit-interval-form__row">
            <Field>
              <FieldLabel htmlFor="edit-end-date">End date</FieldLabel>
              <Input
                aria-describedby={
                  hasInvalidRange ? 'edit-range-error' : undefined
                }
                aria-invalid={hasInvalidRange}
                disabled={isPending}
                id="edit-end-date"
                onChange={(event) => setEndDate(event.target.value)}
                required
                type="date"
                value={endDate}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="edit-end-time">End time</FieldLabel>
              <Input
                aria-describedby={
                  hasInvalidRange ? 'edit-range-error' : undefined
                }
                aria-invalid={hasInvalidRange}
                disabled={isPending}
                id="edit-end-time"
                onChange={(event) => setEndTime(event.target.value)}
                required
                type="time"
                value={endTime}
              />
            </Field>
          </div>
          {hasInvalidRange && (
            <FieldError id="edit-range-error">
              Enter valid dates and times with the end after the start.
            </FieldError>
          )}
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
            <Button disabled={!validation.ok || isPending} type="submit">
              {isPending ? 'Saving…' : 'Save'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
