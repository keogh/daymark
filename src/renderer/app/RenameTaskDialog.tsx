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
import { Field, FieldError, FieldLabel } from '@/renderer/components/ui/field';
import { Input } from '@/renderer/components/ui/input';
import type { AppError } from '@/shared/contracts/app-result';
import type { TaskSummary } from '@/shared/contracts/tasks';
import { validateRenameTaskInput } from '@/shared/validation/task-management-input';

const renameErrorMessage = (error: AppError): string => {
  switch (error.code) {
    case 'INVALID_TASK_RENAME':
      return 'Enter a task description between 1 and 500 characters.';
    case 'TASK_DESCRIPTION_CONFLICT':
      return 'Another task already uses this description. Choose a different description.';
    case 'TASK_NOT_FOUND':
      return 'This task no longer exists. Close the dialog and refresh history.';
    default:
      return 'The task could not be renamed. Please try again.';
  }
};

export const RenameTaskDialog = ({
  onOpenChange,
  onRenamed,
  open,
  task,
}: {
  readonly onOpenChange: (open: boolean) => void;
  readonly onRenamed: () => Promise<void>;
  readonly open: boolean;
  readonly task: TaskSummary;
}) => {
  const [description, setDescription] = useState(task.description);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const input = { taskId: task.id, description };
  const validation = validateRenameTaskInput(input);
  const hasInvalidDescription = !validation.ok;

  const submit = async (event: SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!validation.ok || isPending) return;

    setIsPending(true);
    setError(null);
    try {
      const result = await window.daymark.tasks.rename({
        taskId: validation.value.taskId,
        description: validation.value.description,
      });
      if (!result.ok) {
        setError(renameErrorMessage(result.error));
        return;
      }
      await onRenamed();
      onOpenChange(false);
    } catch {
      setError('The task could not be renamed. Please try again.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog
      onOpenChange={(nextOpen) => !isPending && onOpenChange(nextOpen)}
      open={open}
    >
      <DialogContent aria-describedby="rename-task-description">
        <DialogHeader>
          <DialogTitle>Rename Task</DialogTitle>
          <DialogDescription id="rename-task-description">
            Update the description everywhere this task appears.
          </DialogDescription>
        </DialogHeader>
        <form
          className="rename-task-form"
          onSubmit={(event) => void submit(event)}
        >
          <Field data-invalid={hasInvalidDescription || error !== null}>
            <FieldLabel htmlFor={`rename-task-${task.id}`}>
              Task description
            </FieldLabel>
            <Input
              aria-describedby={
                hasInvalidDescription || error !== null
                  ? `rename-task-${task.id}-error`
                  : undefined
              }
              aria-invalid={hasInvalidDescription || error !== null}
              autoFocus
              disabled={isPending}
              id={`rename-task-${task.id}`}
              onChange={(event) => {
                setDescription(event.target.value);
                if (error !== null) setError(null);
              }}
              required
              value={description}
            />
            {hasInvalidDescription && (
              <FieldError id={`rename-task-${task.id}-error`}>
                Enter a task description between 1 and 500 characters.
              </FieldError>
            )}
            {error !== null && (
              <FieldError id={`rename-task-${task.id}-error`} role="alert">
                {error}
              </FieldError>
            )}
          </Field>
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
