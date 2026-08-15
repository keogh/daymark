export const APP_ERROR_CODES = [
  'INVALID_TASK_DESCRIPTION',
  'INVALID_TASK_SEARCH',
  'INVALID_START_TASK',
  'INVALID_SWITCH_TASK',
  'INVALID_HISTORY_RANGE',
  'INVALID_MANUAL_INTERVAL',
  'TASK_NOT_FOUND',
  'TASK_SUGGESTIONS_UNAVAILABLE',
  'TIME_INTERVAL_OVERLAP',
  'TIMER_NOT_IDLE',
  'NO_ACTIVE_TIMER',
  'TIMER_ALREADY_PAUSED',
  'NO_CURRENT_TASK',
  'TIMER_ALREADY_RUNNING',
  'INTERNAL_ERROR',
] as const;

export type AppErrorCode = (typeof APP_ERROR_CODES)[number];

export interface AppError {
  readonly code: AppErrorCode;
  readonly message: string;
}

export type AppResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: AppError };

const appErrorCodes = new Set<string>(APP_ERROR_CODES);

export const isAppError = (value: unknown): value is AppError => {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.code === 'string' &&
    appErrorCodes.has(candidate.code) &&
    typeof candidate.message === 'string'
  );
};

export const toRendererSafeError = (error: unknown): AppError => {
  if (isAppError(error)) {
    return { code: error.code, message: error.message };
  }

  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
  };
};
