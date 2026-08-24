import { useCallback, useRef, useState } from 'react';

import type { AppError } from '@/shared/contracts/app-result';
import type { TaskSuggestion } from '@/shared/contracts/tasks';

const suggestionUnavailable: AppError = {
  code: 'TASK_SUGGESTIONS_UNAVAILABLE',
  message: 'Task suggestions are temporarily unavailable.',
};

export interface TaskSuggestionsController {
  readonly suggestions: readonly TaskSuggestion[];
  readonly highlightedIndex: number | null;
  readonly isOpen: boolean;
  readonly isLoading: boolean;
  readonly error: AppError | null;
  readonly load: (query: string) => Promise<void>;
  readonly close: () => void;
  readonly moveHighlight: (direction: 1 | -1) => void;
}

export const useTaskSuggestions = (): TaskSuggestionsController => {
  const [suggestions, setSuggestions] = useState<readonly TaskSuggestion[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const requestGeneration = useRef(0);

  const load = useCallback(async (query: string): Promise<void> => {
    const generation = ++requestGeneration.current;
    setIsOpen(true);
    setIsLoading(true);
    setSuggestions([]);
    setHighlightedIndex(null);
    setError(null);

    try {
      const result = await window.daymark.tasks.getSuggestions({ query });
      if (generation !== requestGeneration.current) {
        return;
      }

      if (result.ok) {
        const nextSuggestions = result.value.suggestions.slice(0, 5);
        setSuggestions(nextSuggestions);
        setHighlightedIndex(nextSuggestions.length === 0 ? null : 0);
      } else {
        setError(result.error);
      }
    } catch {
      if (generation === requestGeneration.current) {
        setError(suggestionUnavailable);
      }
    } finally {
      if (generation === requestGeneration.current) {
        setIsLoading(false);
      }
    }
  }, []);

  const close = useCallback(() => {
    requestGeneration.current += 1;
    setIsOpen(false);
    setIsLoading(false);
    setSuggestions([]);
    setHighlightedIndex(null);
    setError(null);
  }, []);

  const moveHighlight = useCallback(
    (direction: 1 | -1) => {
      if (!isOpen || suggestions.length === 0) {
        return;
      }
      setHighlightedIndex((current) => {
        const index = current ?? (direction === 1 ? -1 : 0);
        return (index + direction + suggestions.length) % suggestions.length;
      });
    },
    [isOpen, suggestions.length],
  );

  return {
    suggestions,
    highlightedIndex,
    isOpen,
    isLoading,
    error,
    load,
    close,
    moveHighlight,
  };
};
