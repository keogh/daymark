import { useId, useState, type KeyboardEvent, type SubmitEvent } from 'react';

import { Button } from '@/renderer/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/renderer/components/ui/dialog';
import { Field, FieldError, FieldLabel } from '@/renderer/components/ui/field';
import { Input } from '@/renderer/components/ui/input';
import type { AppError } from '@/shared/contracts/app-result';
import type { CreateManualIntervalInput } from '@/shared/contracts/manual-time';
import { useTaskSuggestions } from './use-task-suggestions';

interface SelectedTask {
  readonly id: string;
  readonly description: string;
}

const manualErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'INVALID_MANUAL_INTERVAL':
      return 'Enter a valid task and a time range whose end is after its start.';
    case 'TIME_INTERVAL_OVERLAP':
      return 'This time overlaps an existing entry. Choose a different time range.';
    case 'TASK_NOT_FOUND':
      return 'That task no longer exists. Select it again or use the typed description.';
    default:
      return 'The time entry could not be saved. Please try again.';
  }
};

export const ManualTimeEntryDialog = ({
  initialDate,
  onOpenChange,
  onSaved,
  open,
}: {
  readonly initialDate: string;
  readonly onOpenChange: (open: boolean) => void;
  readonly onSaved: () => Promise<void>;
  readonly open: boolean;
}) => {
  const [taskDescription, setTaskDescription] = useState('');
  const [selectedTask, setSelectedTask] = useState<SelectedTask | null>(null);
  const [date, setDate] = useState(initialDate);
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const suggestions = useTaskSuggestions();
  const listboxId = useId();
  const listIsVisible =
    suggestions.isOpen &&
    !suggestions.isLoading &&
    suggestions.error === null &&
    suggestions.suggestions.length > 0;
  const highlighted =
    suggestions.highlightedIndex === null
      ? undefined
      : suggestions.suggestions[suggestions.highlightedIndex];
  const hasValidShape =
    taskDescription.trim().length > 0 &&
    date.length > 0 &&
    startTime.length > 0 &&
    endTime.length > 0 &&
    endTime > startTime;

  const chooseTask = (task: SelectedTask) => {
    setSelectedTask(task);
    setTaskDescription(task.description);
    setError(null);
    suggestions.close();
  };

  const handleTaskKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (
      (event.key === 'ArrowDown' || event.key === 'ArrowUp') &&
      listIsVisible
    ) {
      event.preventDefault();
      suggestions.moveHighlight(event.key === 'ArrowDown' ? 1 : -1);
    } else if (event.key === 'Enter' && highlighted !== undefined) {
      event.preventDefault();
      chooseTask(highlighted.task);
    } else if (event.key === 'Escape' && suggestions.isOpen) {
      event.preventDefault();
      suggestions.close();
    }
  };

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!hasValidShape || isPending) return;

    const taskSource: Pick<
      CreateManualIntervalInput,
      'taskId' | 'taskDescription'
    > =
      selectedTask === null
        ? { taskDescription: taskDescription.trim() }
        : { taskId: selectedTask.id };
    setIsPending(true);
    setError(null);
    try {
      const result = await window.timeTracker.manualTime.createInterval({
        ...taskSource,
        date,
        startTime,
        endTime,
      });
      if (!result.ok) {
        setError(manualErrorMessage(result.error));
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
      <DialogContent aria-describedby="manual-entry-description">
        <DialogHeader>
          <DialogTitle>Add time</DialogTitle>
          <DialogDescription id="manual-entry-description">
            Record one completed block of work.
          </DialogDescription>
        </DialogHeader>
        <form
          className="manual-entry-form"
          onSubmit={(event) => void submit(event)}
        >
          <Field>
            <FieldLabel htmlFor="manual-task">Task</FieldLabel>
            <div className="task-combobox">
              <Input
                aria-activedescendant={
                  listIsVisible && suggestions.highlightedIndex !== null
                    ? `${listboxId}-option-${suggestions.highlightedIndex}`
                    : undefined
                }
                aria-autocomplete="list"
                aria-controls={listboxId}
                aria-expanded={listIsVisible}
                autoComplete="off"
                disabled={isPending}
                id="manual-task"
                onBlur={suggestions.close}
                onChange={(event) => {
                  const value = event.target.value;
                  setTaskDescription(value);
                  setSelectedTask(null);
                  setError(null);
                  void suggestions.load(value);
                }}
                onFocus={() => void suggestions.load(taskDescription)}
                onKeyDown={handleTaskKeyDown}
                role="combobox"
                value={taskDescription}
              />
              {listIsVisible && (
                <div
                  aria-label="Task suggestions"
                  className="task-suggestions"
                  id={listboxId}
                  role="listbox"
                >
                  {suggestions.suggestions.map((suggestion, index) => (
                    <button
                      aria-selected={suggestions.highlightedIndex === index}
                      className="task-suggestion"
                      id={`${listboxId}-option-${index}`}
                      key={suggestion.task.id}
                      onClick={() => chooseTask(suggestion.task)}
                      onMouseDown={(event) => event.preventDefault()}
                      role="option"
                      tabIndex={-1}
                      type="button"
                    >
                      {suggestion.task.description}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p className="manual-entry-form__hint">
              {selectedTask === null
                ? 'A matching task will be reused, or a new task will be created.'
                : `Using existing task: ${selectedTask.description}`}
            </p>
          </Field>
          <Field>
            <FieldLabel htmlFor="manual-date">Date</FieldLabel>
            <Input
              disabled={isPending}
              id="manual-date"
              onChange={(event) => setDate(event.target.value)}
              required
              type="date"
              value={date}
            />
          </Field>
          <div className="manual-entry-form__times">
            <Field>
              <FieldLabel htmlFor="manual-start-time">Start time</FieldLabel>
              <Input
                disabled={isPending}
                id="manual-start-time"
                onChange={(event) => setStartTime(event.target.value)}
                required
                type="time"
                value={startTime}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor="manual-end-time">End time</FieldLabel>
              <Input
                aria-describedby={
                  endTime.length > 0 && endTime <= startTime
                    ? 'manual-range-error'
                    : undefined
                }
                aria-invalid={endTime.length > 0 && endTime <= startTime}
                disabled={isPending}
                id="manual-end-time"
                onChange={(event) => setEndTime(event.target.value)}
                required
                type="time"
                value={endTime}
              />
            </Field>
          </div>
          {endTime.length > 0 && endTime <= startTime && (
            <FieldError id="manual-range-error">
              End time must be later than start time.
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
            <Button disabled={!hasValidShape || isPending} type="submit">
              {isPending ? 'Saving…' : 'Save time'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
