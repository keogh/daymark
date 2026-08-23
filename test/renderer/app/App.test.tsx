import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/renderer/app/App';
import type { AppResult } from '@/shared/contracts/app-result';
import type { HistoryPage } from '@/shared/contracts/history';
import type { TimeTrackerAPI } from '@/shared/contracts/system-health';
import type { ApplicationSettings } from '@/shared/contracts/settings';
import type { TaskSuggestionPage } from '@/shared/contracts/tasks';
import type { TimerState } from '@/shared/contracts/timer';

const idleState: TimerState = {
  status: 'idle',
  currentTask: null,
  sessionStartedAt: null,
  sessionDurationMs: 0,
  taskTodayDurationMs: 0,
  taskLifetimeDurationMs: 0,
  activeIntervalStartedAt: null,
  now: 1_000,
};

const runningState: TimerState = {
  status: 'running',
  currentTask: { id: 'task-1', description: 'Implement authentication' },
  sessionStartedAt: 1_000,
  sessionDurationMs: 500,
  taskTodayDurationMs: 500,
  taskLifetimeDurationMs: 500,
  activeIntervalStartedAt: 1_000,
  now: Date.now(),
};

const pausedState: TimerState = {
  ...runningState,
  status: 'paused',
  sessionDurationMs: 3_900_000,
  taskTodayDurationMs: 7_500_000,
  taskLifetimeDurationMs: 18_900_000,
  activeIntervalStartedAt: null,
};

const defaultSettings: ApplicationSettings = {
  weekStartsOn: 'monday',
  theme: 'system',
  updatedAt: 0,
};

const historyPageWithTask = (
  description = 'Implement authentication',
): HistoryPage => ({
  days: [
    {
      dayStartedAt: new Date(1_000).setHours(0, 0, 0, 0),
      dayEndedAt: new Date(1_000).setHours(24, 0, 0, 0),
      totalDurationMs: 1_800_000,
      tasks: [
        {
          task: { id: 'task-1', description },
          dayDurationMs: 1_800_000,
          lifetimeDurationMs: 5_400_000,
          mostRecentActivityAt: 1_000,
          intervals: [
            {
              id: 'interval-1',
              startedAt: 1_000,
              endedAt: 1_800_000,
              projectedStartedAt: 1_000,
              projectedEndedAt: 1_800_000,
              durationMs: 1_799_000,
              isRunning: false,
            },
          ],
        },
      ],
    },
  ],
  nextBeforeDayStartedAt: null,
  now: 1_000,
});

describe('App', () => {
  it('presents Daymark as the product heading', async () => {
    setTimerApi();
    render(<App />);

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Daymark' }),
    ).toBeVisible();
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('opens on Timer with semantic, focusable three-destination navigation', async () => {
    setTimerApi();
    render(<App />);

    const navigation = screen.getByRole('navigation', { name: 'Primary' });
    const timer = screen.getByRole('button', { name: 'Timer' });
    const analytics = screen.getByRole('button', { name: 'Analytics' });
    const settings = screen.getByRole('button', { name: 'Settings' });

    expect(navigation).toContainElement(timer);
    expect(navigation).toContainElement(analytics);
    expect(navigation).toContainElement(settings);
    expect(navigation.querySelectorAll('button')).toHaveLength(3);
    expect(timer).toHaveAttribute('aria-current', 'page');
    expect(analytics).not.toHaveAttribute('aria-current');
    expect(await screen.findByRole('region', { name: 'Timer' })).toBeVisible();

    analytics.focus();
    expect(analytics).toHaveFocus();
    fireEvent.click(analytics);

    expect(analytics).toHaveAttribute('aria-current', 'page');
    expect(timer).not.toHaveAttribute('aria-current');
    expect(screen.getByRole('heading', { name: 'Analytics' })).toBeVisible();
    expect(
      screen.queryByRole('region', { name: 'Timer' }),
    ).not.toBeInTheDocument();
  });

  it('shows semantic Settings preferences with no Save action', async () => {
    setTimerApi();
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));

    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeVisible();
    expect(screen.getByRole('group', { name: 'Calendar' })).toBeVisible();
    expect(screen.getByRole('group', { name: 'Appearance' })).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Monday' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(screen.getByText(/follow.*computer.*appearance/i)).toBeVisible();
    expect(screen.getByText(/apply automatically/i)).toBeVisible();
    expect(
      screen.queryByRole('button', { name: /save/i }),
    ).not.toBeInTheDocument();
  });

  it('serializes immediate preference updates and invalidates Analytics after week-start success', async () => {
    const weekStart = deferred<AppResult<ApplicationSettings>>();
    const api = setTimerApi({
      setWeekStartsOn: vi.fn(() => weekStart.promise),
    });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByRole('radio', { name: 'Sunday' });

    fireEvent.click(screen.getByRole('radio', { name: 'Sunday' }));

    expect(api.settings.setWeekStartsOn).toHaveBeenCalledOnce();
    expect(api.settings.setWeekStartsOn).toHaveBeenCalledWith({
      weekStartsOn: 'sunday',
    });
    expect(screen.getByText('Saving preference…')).toBeVisible();
    expect(screen.getByRole('radio', { name: 'Dark' })).toBeDisabled();
    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(api.settings.setTheme).not.toHaveBeenCalled();

    weekStart.resolve({
      ok: true,
      value: { ...defaultSettings, weekStartsOn: 'sunday', updatedAt: 1 },
    });
    expect(await screen.findByRole('radio', { name: 'Sunday' })).toBeChecked();

    fireEvent.click(screen.getByRole('button', { name: 'Analytics' }));
    await waitFor(() => expect(api.analytics.getSummary).toHaveBeenCalled());
  });

  it('applies appearance optimistically and restores the confirmed appearance after failure', async () => {
    const theme = deferred<AppResult<ApplicationSettings>>();
    const api = setTimerApi({ setTheme: vi.fn(() => theme.promise) });
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    await screen.findByRole('radio', { name: 'Dark' });

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(document.documentElement).toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute(
      'data-theme-preference',
      'dark',
    );

    theme.resolve({
      ok: false,
      error: { code: 'INTERNAL_ERROR', message: 'sensitive detail' },
    });

    expect(await screen.findByRole('alert')).toHaveTextContent('not saved');
    expect(screen.getByRole('radio', { name: 'System' })).toBeChecked();
    expect(document.documentElement).not.toHaveClass('dark');
    expect(document.documentElement).toHaveAttribute('data-theme', 'light');
    expect(document.documentElement).toHaveAttribute(
      'data-theme-preference',
      'system',
    );
    expect(api.settings.setTheme).toHaveBeenCalledOnce();
  });

  it('resolves the persisted appearance before revealing primary content', async () => {
    const settings = deferred<AppResult<ApplicationSettings>>();
    setTimerApi({ getSettings: vi.fn(() => settings.promise) });
    render(<App />);

    expect(screen.getByRole('status')).toHaveTextContent('Loading Daymark');
    expect(
      screen.queryByRole('region', { name: 'Timer' }),
    ).not.toBeInTheDocument();

    settings.resolve({
      ok: true,
      value: { ...defaultSettings, theme: 'dark' },
    });

    expect(await screen.findByRole('region', { name: 'Timer' })).toBeVisible();
    expect(document.documentElement).toHaveAttribute('data-theme', 'dark');
    expect(document.documentElement).toHaveAttribute(
      'data-theme-preference',
      'dark',
    );
    expect(document.documentElement.style.colorScheme).toBe('dark');
  });

  it('uses System fallback after load failure and retries without writing defaults', async () => {
    const retry = deferred<AppResult<ApplicationSettings>>();
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: { code: 'INTERNAL_ERROR', message: 'sensitive detail' },
      })
      .mockImplementationOnce(() => retry.promise);
    const api = setTimerApi({ getSettings: get });
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Settings could not be loaded',
    );
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    expect(api.settings.setTheme).not.toHaveBeenCalled();
    expect(api.settings.setWeekStartsOn).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    retry.resolve({ ok: true, value: defaultSettings });
    expect(await screen.findByRole('radio', { name: 'Monday' })).toBeChecked();
  });

  it('follows live system appearance only while System is confirmed', async () => {
    let systemIsDark = false;
    let notifyAppearanceChange: (() => void) | undefined;
    const removeAppearanceListener = vi.fn();
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({
        get matches() {
          return systemIsDark;
        },
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addEventListener: (_event: string, listener: () => void) => {
          notifyAppearanceChange = listener;
        },
        removeEventListener: removeAppearanceListener,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    );
    const api = setTimerApi({
      setTheme: vi.fn().mockResolvedValue({
        ok: true,
        value: { ...defaultSettings, theme: 'light', updatedAt: 1 },
      }),
    });
    const { unmount } = render(<App />);
    await screen.findByRole('region', { name: 'Timer' });

    systemIsDark = true;
    act(() => notifyAppearanceChange?.());
    expect(document.documentElement).toHaveClass('dark');
    expect(api.settings.setTheme).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(await screen.findByRole('radio', { name: 'Light' }));
    expect(await screen.findByRole('radio', { name: 'Light' })).toBeChecked();
    expect(document.documentElement).not.toHaveClass('dark');

    systemIsDark = false;
    act(() => notifyAppearanceChange?.());
    expect(document.documentElement).not.toHaveClass('dark');
    expect(api.settings.setTheme).toHaveBeenCalledOnce();
    expect(api.timer.start).not.toHaveBeenCalled();
    expect(api.timer.pause).not.toHaveBeenCalled();
    expect(api.timer.resume).not.toHaveBeenCalled();
    expect(api.timer.stop).not.toHaveBeenCalled();

    unmount();
    expect(removeAppearanceListener).toHaveBeenCalledOnce();
    expect(removeAppearanceListener).toHaveBeenCalledWith(
      'change',
      notifyAppearanceChange,
    );
  });

  it('does not issue a Timer command while navigating in either direction', async () => {
    const api = setTimerApi();
    render(<App />);
    await screen.findByRole('combobox', { name: 'Task description' });

    fireEvent.click(screen.getByRole('button', { name: 'Analytics' }));
    fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
    fireEvent.click(screen.getByRole('button', { name: 'Timer' }));

    expect(api.timer.start).not.toHaveBeenCalled();
    expect(api.timer.switchToTask).not.toHaveBeenCalled();
    expect(api.timer.pause).not.toHaveBeenCalled();
    expect(api.timer.resume).not.toHaveBeenCalled();
    expect(api.timer.stop).not.toHaveBeenCalled();
    expect(api.timer.getState).toHaveBeenCalledOnce();
  });

  it.each([
    ['running', runningState, '00:00:00'],
    ['paused', pausedState, '01:05:00'],
  ] as const)(
    'keeps the authoritative %s Timer presentation while Analytics is displayed',
    async (_status, timerState, expectedDuration) => {
      vi.useFakeTimers({ toFake: ['Date', 'setInterval', 'clearInterval'] });
      vi.setSystemTime(timerState.now);
      setTimerApi({
        getState: vi.fn().mockResolvedValue({ ok: true, value: timerState }),
      });
      render(<App />);

      expect(
        await screen.findByRole('region', {
          name: `${timerState.status} timer`,
        }),
      ).toBeVisible();
      fireEvent.click(screen.getByRole('button', { name: 'Analytics' }));
      fireEvent.click(screen.getByRole('button', { name: 'Timer' }));

      expect(
        screen.getByRole('region', { name: `${timerState.status} timer` }),
      ).toBeVisible();
      expect(
        screen.getByLabelText('Current session duration'),
      ).toHaveTextContent(expectedDuration);
      expect(screen.queryByText('Loading timer…')).not.toBeInTheDocument();
    },
  );

  it('loads authoritative timer state before showing the focused idle form', async () => {
    const state = deferred<AppResult<TimerState>>();
    const api = setTimerApi({ getState: vi.fn(() => state.promise) });

    render(<App />);

    expect(api.timer.getState).toHaveBeenCalledOnce();
    expect(await screen.findByText('Loading timer…')).toBeVisible();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    state.resolve({ ok: true, value: idleState });

    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    expect(input).toHaveFocus();
    expect(input).toHaveAttribute('data-slot', 'input');
    const startButton = screen.getByRole('button', { name: 'Start' });
    expect(startButton).toHaveAttribute('data-slot', 'button');
    expect(startButton).toHaveAttribute('data-variant', 'default');
    expect(startButton).toBeDisabled();
  });

  it('opens the global manual-entry dialog with an accessible local-day form', async () => {
    const expectedDate = new Date();
    const expectedDateValue = `${expectedDate.getFullYear()}-${String(expectedDate.getMonth() + 1).padStart(2, '0')}-${String(expectedDate.getDate()).padStart(2, '0')}`;
    setTimerApi();
    render(<App />);

    const addTime = await screen.findByRole('button', { name: 'Add time' });
    fireEvent.click(addTime);

    const dialog = screen.getByRole('dialog', { name: 'Add time' });
    expect(dialog).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Task' })).toHaveFocus();
    expect(screen.getByLabelText('Date')).toHaveValue(expectedDateValue);
    expect(screen.getByLabelText('Start time')).toBeVisible();
    expect(screen.getByLabelText('End time')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save time' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();

    fireEvent.keyDown(dialog, { key: 'Escape' });
    await waitFor(() => expect(addTime).toHaveFocus());
  });

  it('prefills a history day and closes with Escape without saving', async () => {
    const api = setTimerApi({
      getHistoryPage: vi.fn().mockResolvedValue({
        ok: true,
        value: historyPageWithTask(),
      }),
    });
    render(<App />);

    const dayAction = await screen.findByRole('button', {
      name: /Add time for/,
    });
    fireEvent.click(dayAction);
    const selectedDay = new Date(new Date(1_000).setHours(0, 0, 0, 0));
    const selectedDateValue = `${selectedDay.getFullYear()}-${String(selectedDay.getMonth() + 1).padStart(2, '0')}-${String(selectedDay.getDate()).padStart(2, '0')}`;
    expect(screen.getByLabelText('Date')).toHaveValue(selectedDateValue);

    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await waitFor(() => expect(dayAction).toHaveFocus());
    expect(api.manualTime.createInterval).not.toHaveBeenCalled();
  });

  it('saves a selected existing task once and refreshes timer and history authoritatively', async () => {
    const save = deferred<AppResult<{ intervalId: string }>>();
    const api = setTimerApi({
      createManualInterval: vi.fn(() => save.promise),
      getSuggestions: vi.fn().mockResolvedValue({
        ok: true,
        value: suggestionPage([suggestion('task-a', 'Alpha')]),
      }),
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add time' }));
    const task = screen.getByRole('combobox', { name: 'Task' });
    fireEvent.change(task, { target: { value: 'Al' } });
    await screen.findByRole('option', { name: 'Alpha' });
    fireEvent.keyDown(task, { key: 'Enter' });
    expect(task).toHaveValue('Alpha');
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '10:00' },
    });
    const selectedDate = screen.getByLabelText<HTMLInputElement>('Date').value;

    const saveButton = screen.getByRole('button', { name: 'Save time' });
    fireEvent.click(saveButton);
    fireEvent.click(saveButton);
    expect(api.manualTime.createInterval).toHaveBeenCalledOnce();
    expect(api.manualTime.createInterval).toHaveBeenCalledWith({
      taskId: 'task-a',
      date: selectedDate,
      startTime: '09:00',
      endTime: '10:00',
    });
    expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();

    save.resolve({ ok: true, value: { intervalId: 'manual-1' } });
    expect(
      await screen.findByRole('button', { name: 'Add time' }),
    ).toBeVisible();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(api.history.getPage).toHaveBeenCalledTimes(2);
  });

  it('preserves typed values and shows a controlled overlap error', async () => {
    const api = setTimerApi({
      createManualInterval: vi.fn().mockResolvedValue({
        ok: false,
        error: { code: 'TIME_INTERVAL_OVERLAP', message: 'Internal detail' },
      }),
    });
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Add time' }));
    fireEvent.change(screen.getByRole('combobox', { name: 'Task' }), {
      target: { value: 'Planning' },
    });
    fireEvent.change(screen.getByLabelText('Start time'), {
      target: { value: '09:00' },
    });
    fireEvent.change(screen.getByLabelText('End time'), {
      target: { value: '10:00' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save time' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'overlaps an existing entry',
    );
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Task' })).toHaveValue(
      'Planning',
    );
    expect(screen.getByLabelText('Start time')).toHaveValue('09:00');
    expect(screen.getByLabelText('End time')).toHaveValue('10:00');
    expect(api.manualTime.createInterval).toHaveBeenCalledWith(
      expect.objectContaining({ taskDescription: 'Planning' }),
    );
  });

  it('starts a trimmed description with the Start button and shows pending state', async () => {
    const start = deferred<AppResult<TimerState>>();
    const api = setTimerApi({ start: vi.fn(() => start.promise) });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });

    fireEvent.change(input, {
      target: { value: '  Implement authentication  ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'description',
      description: 'Implement authentication',
    });
    expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();
    expect(input).toBeDisabled();

    start.resolve({ ok: true, value: runningState });

    expect(
      await screen.findByRole('region', { name: 'running timer' }),
    ).toHaveTextContent('Implement authentication');
    await act(async () => Promise.resolve());
    expect(api.history.getPage).toHaveBeenCalledTimes(2);
  });

  it('starts with Enter from the task input', async () => {
    const api = setTimerApi();
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });

    fireEvent.change(input, { target: { value: 'Code review' } });
    fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'description',
      description: 'Code review',
    });
  });

  it('loads five recent tasks on focus with accessible highlighted suggestions and totals', async () => {
    const page = suggestionPage(
      Array.from({ length: 6 }, (_, index) => ({
        task: { id: `task-${index}`, description: `Task ${index}` },
        todayDurationMs: index === 0 ? 6_300_000 : 0,
        lifetimeDurationMs: index === 0 ? 18_900_000 : 0,
        mostRecentActivityAt: 900 - index,
      })),
    );
    const api = setTimerApi({
      getSuggestions: vi.fn().mockResolvedValue({ ok: true, value: page }),
    });

    render(<App />);

    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    const listbox = await screen.findByRole('listbox', {
      name: 'Task suggestions',
    });
    const options = screen.getAllByRole('option');
    expect(api.tasks.getSuggestions).toHaveBeenCalledWith({ query: '' });
    expect(options).toHaveLength(5);
    expect(options[0]).toHaveTextContent('Task 0Today 1h 45m · Total 5h 15m');
    expect(options[1]).toHaveTextContent('Today 0m · Total 0m');
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-expanded', 'true');
    expect(input).toHaveAttribute('aria-controls', listbox.id);
    expect(input).toHaveAttribute('aria-activedescendant', options[0]?.id);
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
    expect(input).toHaveFocus();
    expect(screen.getByText('5 task suggestions available.')).toHaveClass(
      'visually-hidden',
    );
  });

  it('keeps typing and typed Start available while a newer search is pending', async () => {
    const search = deferred<AppResult<TaskSuggestionPage>>();
    const getSuggestions = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: suggestionPage([]) })
      .mockReturnValueOnce(search.promise);
    setTimerApi({ getSuggestions });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    await act(async () => Promise.resolve());

    fireEvent.change(input, { target: { value: 'Auth' } });

    expect(input).toHaveValue('Auth');
    expect(input).toHaveAttribute('aria-busy', 'true');
    expect(input).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();

    search.resolve({
      ok: true,
      value: suggestionPage([suggestion('auth', 'Authentication')]),
    });
    expect(await screen.findByRole('option')).toHaveTextContent(
      'Authentication',
    );
  });

  it('wraps keyboard highlight and starts the highlighted task by ID', async () => {
    const api = setTimerApi({
      getSuggestions: vi.fn().mockResolvedValue({
        ok: true,
        value: suggestionPage([
          suggestion('task-a', 'Alpha'),
          suggestion('task-b', 'Beta'),
        ]),
      }),
    });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    const options = await screen.findAllByRole('option');

    fireEvent.keyDown(input, { key: 'ArrowUp' });
    expect(options[1]).toHaveAttribute('aria-selected', 'true');
    expect(input).toHaveAttribute('aria-activedescendant', options[1]?.id);
    expect(input).toHaveFocus();

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    expect(options[0]).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'existing-task',
      taskId: 'task-a',
    });
    expect(
      await screen.findByRole('region', { name: 'running timer' }),
    ).toBeVisible();
    await act(async () => Promise.resolve());
    expect(api.history.getPage).toHaveBeenCalledTimes(2);
  });

  it('starts a clicked suggestion while keeping focus in the input until Start', async () => {
    const api = setTimerApi({
      getSuggestions: vi.fn().mockResolvedValue({
        ok: true,
        value: suggestionPage([suggestion('task-b', 'Beta')]),
      }),
    });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    const option = await screen.findByRole('option', { name: /Beta/ });

    fireEvent.mouseDown(option);
    expect(input).toHaveFocus();
    fireEvent.click(option);

    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'existing-task',
      taskId: 'task-b',
    });
  });

  it('keeps the Start button bound to typed text instead of the highlight', async () => {
    const api = setTimerApi({
      getSuggestions: vi.fn().mockResolvedValue({
        ok: true,
        value: suggestionPage([suggestion('existing', 'Existing Task')]),
      }),
    });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    fireEvent.change(input, { target: { value: 'New task' } });
    await screen.findByRole('option');

    fireEvent.click(screen.getByRole('button', { name: 'Start' }));

    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'description',
      description: 'New task',
    });
  });

  it('closes on Escape and blur, then reopens when text changes', async () => {
    const getSuggestions = vi.fn().mockResolvedValue({
      ok: true,
      value: suggestionPage([suggestion('task-a', 'Alpha')]),
    });
    setTimerApi({ getSuggestions });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    await screen.findByRole('listbox');

    fireEvent.keyDown(input, { key: 'Escape' });
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toHaveValue('');

    fireEvent.change(input, { target: { value: 'A' } });
    expect(await screen.findByRole('listbox')).toBeVisible();
    fireEvent.blur(input);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });

  it('does not render an older suggestion response that resolves last', async () => {
    const older = deferred<AppResult<TaskSuggestionPage>>();
    const newer = deferred<AppResult<TaskSuggestionPage>>();
    const getSuggestions = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: suggestionPage([]) })
      .mockReturnValueOnce(older.promise)
      .mockReturnValueOnce(newer.promise);
    setTimerApi({ getSuggestions });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    await act(async () => Promise.resolve());

    fireEvent.change(input, { target: { value: 'old' } });
    fireEvent.change(input, { target: { value: 'new' } });
    newer.resolve({
      ok: true,
      value: suggestionPage([suggestion('new', 'New result')]),
    });
    expect(await screen.findByRole('option')).toHaveTextContent('New result');

    older.resolve({
      ok: true,
      value: suggestionPage([suggestion('old', 'Old result')]),
    });
    await act(async () => Promise.resolve());
    expect(screen.getByRole('option')).toHaveTextContent('New result');
    expect(screen.queryByText('Old result')).not.toBeInTheDocument();
  });

  it('shows a recoverable suggestion error without blocking typed Start and retries', async () => {
    const getSuggestions = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        error: {
          code: 'TASK_SUGGESTIONS_UNAVAILABLE',
          message: 'Task suggestions are temporarily unavailable.',
        },
      })
      .mockResolvedValueOnce({
        ok: true,
        value: suggestionPage([suggestion('retry', 'Retry result')]),
      });
    setTimerApi({ getSuggestions });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });

    expect(
      await screen.findByText('Task suggestions are temporarily unavailable.'),
    ).toHaveTextContent('Task suggestions are temporarily unavailable.');
    expect(input).toBeEnabled();
    fireEvent.change(input, { target: { value: 'retry' } });
    expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();
    expect(await screen.findByRole('option')).toHaveTextContent('Retry result');
    expect(getSuggestions).toHaveBeenLastCalledWith({ query: 'retry' });
  });

  it('keeps empty results silent and permits a new typed task', async () => {
    const api = setTimerApi({
      getSuggestions: vi.fn().mockResolvedValue({
        ok: true,
        value: suggestionPage([]),
      }),
    });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    await act(async () => Promise.resolve());
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(screen.queryByText(/No .*suggest/i)).not.toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'Brand new task' } });
    fireEvent.click(screen.getByRole('button', { name: 'Start' }));
    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'description',
      description: 'Brand new task',
    });
  });

  it('closes a stale selection, shows TASK_NOT_FOUND inline, and retries on focus', async () => {
    const getSuggestions = vi.fn().mockResolvedValue({
      ok: true,
      value: suggestionPage([suggestion('deleted', 'Deleted task')]),
    });
    const api = setTimerApi({
      getSuggestions,
      start: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: 'TASK_NOT_FOUND',
          message: 'The selected task no longer exists.',
        },
      }),
    });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });
    fireEvent.click(await screen.findByRole('option'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The selected task no longer exists.',
    );
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    expect(input).toBeEnabled();
    expect(api.timer.start).toHaveBeenCalledWith({
      source: 'existing-task',
      taskId: 'deleted',
    });

    fireEvent.blur(input);
    fireEvent.focus(input);
    expect(getSuggestions).toHaveBeenCalledTimes(2);
  });

  it('shows validation feedback and returns focus for an overlong description', async () => {
    const api = setTimerApi();
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });

    fireEvent.change(input, { target: { value: 'a'.repeat(501) } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Task description must contain between 1 and 500 characters.',
    );
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input.closest('[data-slot="field"]')).toHaveAttribute(
      'data-invalid',
      'true',
    );
    expect(input).toHaveFocus();
    expect(api.timer.start).not.toHaveBeenCalled();
  });

  it('shows application errors, preserves input, and clears feedback on edit', async () => {
    const api = setTimerApi({
      start: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: 'TIMER_NOT_IDLE',
          message: 'The timer must be idle before starting a task.',
        },
      }),
    });
    render(<App />);
    const input = await screen.findByRole('combobox', {
      name: 'Task description',
    });

    fireEvent.change(input, { target: { value: 'Planning' } });
    fireEvent.submit(input.closest('form') as HTMLFormElement);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The timer must be idle before starting a task.',
    );
    expect(input).toHaveValue('Planning');
    expect(input).toHaveFocus();

    fireEvent.change(input, { target: { value: 'Planning notes' } });
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(api.timer.start).toHaveBeenCalledOnce();
  });

  it.each([
    ['running', runningState],
    [
      'paused',
      {
        ...runningState,
        status: 'paused' as const,
        activeIntervalStartedAt: null,
      },
    ],
  ])(
    'restores a %s snapshot into its active presentation branch',
    async (status, state) => {
      const api = setTimerApi({
        getState: vi.fn().mockResolvedValue({ ok: true, value: state }),
      });

      render(<App />);

      const region = await screen.findByRole('region', {
        name: `${status} timer`,
      });
      expect(region).toHaveTextContent('Implement authentication');
      expect(region).toHaveTextContent(
        status === 'running' ? 'Current session' : 'Paused',
      );
      expect(api.timer.start).not.toHaveBeenCalled();
      expect(api.timer.pause).not.toHaveBeenCalled();
      expect(api.timer.resume).not.toHaveBeenCalled();
      expect(api.timer.stop).not.toHaveBeenCalled();
    },
  );

  it('shows a safe load error when state loading fails', async () => {
    setTimerApi({
      getState: vi.fn().mockRejectedValue(new Error('IPC failed')),
    });

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The timer could not be loaded. Please restart the application.',
    );
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  });

  it('renders active durations and applies Pause, Resume, and Stop responses', async () => {
    const nextRunningState: TimerState = {
      ...pausedState,
      status: 'running',
      activeIntervalStartedAt: pausedState.now,
    };
    const pauseResult = deferred<AppResult<TimerState>>();
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({
        ok: true,
        value: { ...runningState, now: Date.now() },
      }),
      pause: vi.fn(() => pauseResult.promise),
      resume: vi.fn().mockResolvedValue({ ok: true, value: nextRunningState }),
      stop: vi.fn().mockResolvedValue({ ok: true, value: idleState }),
    });
    render(<App />);

    expect(await screen.findByRole('button', { name: 'Pause' })).toBeEnabled();
    const stopButton = screen.getByRole('button', { name: 'Stop' });
    expect(stopButton).toHaveAttribute('data-variant', 'outline');
    expect(stopButton).toBeEnabled();
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:00:00',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(screen.getByRole('button', { name: 'Pausing…' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeDisabled();
    pauseResult.resolve({ ok: true, value: pausedState });

    expect(await screen.findByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '01:05:00',
    );
    expect(screen.getByText(/Today 2h 05m/)).toHaveTextContent(
      'Today 2h 05m · Total 5h 15m',
    );

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    expect(await screen.findByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(api.timer.resume).toHaveBeenCalledOnce();

    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(
      await screen.findByRole('combobox', { name: 'Task description' }),
    ).toHaveFocus();
    expect(api.timer.pause).toHaveBeenCalledOnce();
    expect(api.timer.stop).toHaveBeenCalledOnce();
    await act(async () => Promise.resolve());
    expect(api.history.getPage).toHaveBeenCalledTimes(4);
  });

  it('shows a safe command error and re-enables active controls', async () => {
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      pause: vi.fn().mockResolvedValue({
        ok: false,
        error: {
          code: 'NO_ACTIVE_TIMER',
          message: 'There is no active timer to pause.',
        },
      }),
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Pause' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'There is no active timer to pause.',
    );
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    expect(api.timer.pause).toHaveBeenCalledOnce();
  });

  it('switches from a history row without disabling timer controls and refreshes history', async () => {
    const switchResult = deferred<AppResult<TimerState>>();
    const nextState: TimerState = {
      ...runningState,
      currentTask: { id: 'task-1', description: 'Implement authentication' },
    };
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: pausedState }),
      getHistoryPage: vi
        .fn()
        .mockResolvedValue({ ok: true, value: historyPageWithTask() }),
      switchToTask: vi.fn(() => switchResult.promise),
    });
    render(<App />);

    const playButton = await screen.findByRole('button', {
      name: 'Resume Implement authentication',
    });
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();

    fireEvent.click(playButton);

    expect(api.timer.switchToTask).toHaveBeenCalledWith({ taskId: 'task-1' });
    expect(
      screen.getByRole('button', {
        name: 'Resuming… Implement authentication',
      }),
    ).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Resume' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();

    switchResult.resolve({ ok: true, value: nextState });

    expect(
      await screen.findByRole('button', {
        name: 'Already running Implement authentication',
      }),
    ).toBeDisabled();
    await act(async () => Promise.resolve());
    expect(api.history.getPage).toHaveBeenCalledTimes(2);
  });

  it('renames the active task and refreshes the timer plus every loaded history occurrence', async () => {
    const renamedDescription = 'Implement secure authentication';
    const firstDay = historyPageWithTask();
    const secondDay = {
      ...firstDay.days[0]!,
      dayStartedAt: firstDay.days[0]!.dayStartedAt - 86_400_000,
      dayEndedAt: firstDay.days[0]!.dayEndedAt - 86_400_000,
    };
    const initialHistory: HistoryPage = {
      ...firstDay,
      days: [firstDay.days[0]!, secondDay],
    };
    const renamedHistory: HistoryPage = {
      ...initialHistory,
      days: initialHistory.days.map((day) => ({
        ...day,
        tasks: day.tasks.map((historyTask) => ({
          ...historyTask,
          task: { ...historyTask.task, description: renamedDescription },
        })),
      })),
    };
    const renamedTimer = {
      ...runningState,
      currentTask: {
        ...runningState.currentTask!,
        description: renamedDescription,
      },
    };
    const api = setTimerApi({
      getState: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: runningState })
        .mockResolvedValueOnce({ ok: true, value: renamedTimer }),
      getHistoryPage: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: initialHistory })
        .mockResolvedValueOnce({ ok: true, value: renamedHistory }),
      renameTask: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          task: { id: 'task-1', description: renamedDescription },
        },
      }),
    });
    render(<App />);

    const actions = (
      await screen.findAllByRole('button', {
        name: 'Task actions for Implement authentication',
      })
    )[0]!;
    fireEvent.keyDown(actions, { key: 'ArrowDown' });
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.change(screen.getByLabelText('Task description'), {
      target: { value: renamedDescription },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(api.tasks.rename).toHaveBeenCalledWith({
      taskId: 'task-1',
      description: renamedDescription,
    });
    expect(
      await screen.findByRole('region', { name: 'running timer' }),
    ).toHaveTextContent(renamedDescription);
    await waitFor(() =>
      expect(
        screen.getAllByRole('button', { name: renamedDescription }),
      ).toHaveLength(2),
    );
    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(api.history.getPage).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('deletes an inactive task and refreshes the timer plus every loaded history occurrence', async () => {
    const firstDay = historyPageWithTask();
    const secondDay = {
      ...firstDay.days[0]!,
      dayStartedAt: firstDay.days[0]!.dayStartedAt - 86_400_000,
      dayEndedAt: firstDay.days[0]!.dayEndedAt - 86_400_000,
    };
    const initialHistory: HistoryPage = {
      ...firstDay,
      days: [firstDay.days[0]!, secondDay],
    };
    const deletedHistory: HistoryPage = {
      ...initialHistory,
      days: initialHistory.days.map((day) => ({
        ...day,
        totalDurationMs: 0,
        tasks: [],
      })),
    };
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: idleState }),
      getHistoryPage: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: initialHistory })
        .mockResolvedValueOnce({ ok: true, value: deletedHistory }),
      deleteTask: vi.fn().mockResolvedValue({
        ok: true,
        value: { taskId: 'task-1' },
      }),
      getTaskDeletionSummary: vi.fn().mockResolvedValue({
        ok: true,
        value: {
          task: { id: 'task-1', description: 'Implement authentication' },
          intervalCount: 2,
          lifetimeDurationMs: 5_400_000,
        },
      }),
    });
    render(<App />);

    const actions = (
      await screen.findAllByRole('button', {
        name: 'Task actions for Implement authentication',
      })
    )[0]!;
    fireEvent.keyDown(actions, { key: 'ArrowDown' });
    fireEvent.click(
      await screen.findByRole('menuitem', { name: 'Delete task' }),
    );
    expect(
      await screen.findByRole('dialog', {
        name: 'Delete "Implement authentication"?',
      }),
    ).toHaveTextContent('2 recorded time intervals (1h 30m)');
    expect(api.tasks.delete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));

    expect(api.tasks.delete).toHaveBeenCalledWith({ taskId: 'task-1' });
    await waitFor(() =>
      expect(
        screen.queryAllByRole('button', {
          name: 'Implement authentication',
        }),
      ).toHaveLength(0),
    );
    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(api.history.getPage).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('keeps the active view usable when a command promise rejects', async () => {
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      stop: vi.fn().mockRejectedValue(new Error('IPC disconnected')),
    });
    render(<App />);

    fireEvent.click(await screen.findByRole('button', { name: 'Stop' }));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The timer could not be updated. Please try again.',
    );
    expect(
      screen.getByRole('region', { name: 'running timer' }),
    ).toHaveTextContent('Implement authentication');
    expect(screen.getByRole('button', { name: 'Pause' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Stop' })).toBeEnabled();
    expect(api.timer.stop).toHaveBeenCalledOnce();
  });

  it('restores authoritative elapsed time after the renderer remounts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const restoredState: TimerState = {
      ...runningState,
      sessionDurationMs: 125_000,
      now: 1_005_000,
    };
    const getState = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        value: { ...runningState, sessionDurationMs: 120_000, now: 1_000_000 },
      })
      .mockResolvedValueOnce({ ok: true, value: restoredState });
    setTimerApi({ getState });

    const firstRenderer = render(<App />);
    await act(async () => Promise.resolve());
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:02:00',
    );

    await act(() => vi.advanceTimersByTime(5_000));
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:02:05',
    );
    firstRenderer.unmount();

    render(<App />);
    await act(async () => Promise.resolve());
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:02:05',
    );
    expect(getState).toHaveBeenCalledTimes(2);
  });

  it('reconciles published state, rejects stale requests, refreshes history, and unsubscribes', async () => {
    const initial = deferred<AppResult<TimerState>>();
    let publish: ((state: TimerState) => void) | undefined;
    const unsubscribe = vi.fn();
    const onStateChanged = vi.fn((listener: (state: TimerState) => void) => {
      publish = listener;
      return unsubscribe;
    });
    const api = setTimerApi({
      getState: vi.fn(() => initial.promise),
      onStateChanged,
    });

    const renderer = render(<App />);
    expect(onStateChanged).toHaveBeenCalledOnce();
    await waitFor(() => expect(api.history.getPage).toHaveBeenCalledOnce());

    act(() => publish?.(pausedState));
    expect(screen.getByRole('region', { name: 'paused timer' })).toBeVisible();
    expect(api.timer.pause).not.toHaveBeenCalled();

    initial.resolve({ ok: true, value: idleState });
    await act(async () => Promise.resolve());
    expect(screen.getByRole('region', { name: 'paused timer' })).toBeVisible();
    await waitFor(() => expect(api.history.getPage).toHaveBeenCalledTimes(2));

    act(() =>
      publish?.({
        ...pausedState,
        status: 'invalid',
      } as unknown as TimerState),
    );
    expect(screen.getByRole('region', { name: 'paused timer' })).toBeVisible();

    renderer.unmount();
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it('refreshes the authoritative timer snapshot when the window regains focus', async () => {
    const getState = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, value: idleState })
      .mockResolvedValueOnce({ ok: true, value: pausedState });
    setTimerApi({ getState });
    render(<App />);
    await screen.findByRole('combobox', { name: 'Task description' });

    fireEvent.focus(window);

    expect(
      await screen.findByRole('region', { name: 'paused timer' }),
    ).toBeVisible();
    expect(getState).toHaveBeenCalledTimes(2);
  });

  it('periodically refreshes an active snapshot without issuing commands', async () => {
    vi.useFakeTimers();
    const api = setTimerApi({
      getState: vi.fn().mockResolvedValue({ ok: true, value: pausedState }),
    });
    render(<App />);
    await act(async () => Promise.resolve());
    expect(api.timer.getState).toHaveBeenCalledOnce();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(api.timer.pause).not.toHaveBeenCalled();
    expect(api.timer.resume).not.toHaveBeenCalled();
    expect(api.timer.stop).not.toHaveBeenCalled();
  });

  it('corrects local display drift from the periodic authoritative snapshot', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(1_000_000);
    const initialState: TimerState = {
      ...runningState,
      sessionDurationMs: 600_000,
      now: 1_000_000,
    };
    const correctedState: TimerState = {
      ...initialState,
      sessionDurationMs: 630_000,
      now: 1_060_000,
    };
    const api = setTimerApi({
      getState: vi
        .fn()
        .mockResolvedValueOnce({ ok: true, value: initialState })
        .mockResolvedValueOnce({ ok: true, value: correctedState }),
    });
    render(<App />);
    await act(async () => Promise.resolve());
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:10:00',
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000);
    });

    expect(api.timer.getState).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText('Current session duration')).toHaveTextContent(
      '00:10:30',
    );
  });
});

interface TimerApiOverrides {
  readonly getState?: TimeTrackerAPI['timer']['getState'];
  readonly start?: TimeTrackerAPI['timer']['start'];
  readonly switchToTask?: TimeTrackerAPI['timer']['switchToTask'];
  readonly pause?: TimeTrackerAPI['timer']['pause'];
  readonly resume?: TimeTrackerAPI['timer']['resume'];
  readonly stop?: TimeTrackerAPI['timer']['stop'];
  readonly onStateChanged?: TimeTrackerAPI['timer']['onStateChanged'];
  readonly getHistoryPage?: TimeTrackerAPI['history']['getPage'];
  readonly createManualInterval?: TimeTrackerAPI['manualTime']['createInterval'];
  readonly getSuggestions?: TimeTrackerAPI['tasks']['getSuggestions'];
  readonly renameTask?: TimeTrackerAPI['tasks']['rename'];
  readonly deleteTask?: TimeTrackerAPI['tasks']['delete'];
  readonly getTaskDeletionSummary?: TimeTrackerAPI['tasks']['getDeletionSummary'];
  readonly getSettings?: TimeTrackerAPI['settings']['get'];
  readonly setWeekStartsOn?: TimeTrackerAPI['settings']['setWeekStartsOn'];
  readonly setTheme?: TimeTrackerAPI['settings']['setTheme'];
}

const setTimerApi = (overrides: TimerApiOverrides = {}): TimeTrackerAPI => {
  const api: TimeTrackerAPI = {
    system: { healthCheck: vi.fn() },
    timer: {
      getState:
        overrides.getState ??
        vi.fn().mockResolvedValue({ ok: true, value: idleState }),
      start:
        overrides.start ??
        vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      switchToTask:
        overrides.switchToTask ??
        vi.fn().mockResolvedValue({ ok: true, value: runningState }),
      pause: overrides.pause ?? vi.fn(),
      resume: overrides.resume ?? vi.fn(),
      stop: overrides.stop ?? vi.fn(),
      onStateChanged: overrides.onStateChanged ?? vi.fn(() => () => undefined),
    },
    analytics: {
      getSummary: vi.fn(),
    },
    settings: {
      get:
        overrides.getSettings ??
        vi.fn().mockResolvedValue({ ok: true, value: defaultSettings }),
      setWeekStartsOn:
        overrides.setWeekStartsOn ??
        vi.fn().mockResolvedValue({ ok: true, value: defaultSettings }),
      setTheme:
        overrides.setTheme ??
        vi.fn().mockResolvedValue({ ok: true, value: defaultSettings }),
    },
    history: {
      getPage:
        overrides.getHistoryPage ??
        vi.fn().mockResolvedValue({
          ok: true,
          value: {
            days: [
              {
                dayStartedAt: new Date(1_000).setHours(0, 0, 0, 0),
                dayEndedAt: new Date(1_000).setHours(24, 0, 0, 0),
                totalDurationMs: 0,
                tasks: [],
              },
            ],
            nextBeforeDayStartedAt: null,
            now: 1_000,
          },
        }),
    },
    intervals: {
      update: vi.fn().mockResolvedValue({
        ok: true,
        value: { intervalId: 'interval-1' },
      }),
      delete: vi.fn().mockResolvedValue({
        ok: true,
        value: { intervalId: 'interval-1' },
      }),
    },
    manualTime: {
      createInterval:
        overrides.createManualInterval ??
        vi.fn().mockResolvedValue({
          ok: true,
          value: { intervalId: 'interval-1' },
        }),
    },
    tasks: {
      getSuggestions:
        overrides.getSuggestions ??
        vi.fn().mockResolvedValue({
          ok: true,
          value: { suggestions: [], now: 1_000 },
        }),
      rename:
        overrides.renameTask ??
        vi.fn().mockResolvedValue({
          ok: true,
          value: { task: { id: 'task-1', description: 'Renamed task' } },
        }),
      delete:
        overrides.deleteTask ??
        vi.fn().mockResolvedValue({
          ok: true,
          value: { taskId: 'task-1' },
        }),
      getDeletionSummary:
        overrides.getTaskDeletionSummary ??
        vi.fn().mockResolvedValue({
          ok: true,
          value: {
            task: { id: 'task-1', description: 'Task' },
            intervalCount: 0,
            lifetimeDurationMs: 0,
          },
        }),
    },
  };

  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: api,
  });
  return api;
};

const suggestion = (id: string, description: string) => ({
  task: { id, description },
  todayDurationMs: 0,
  lifetimeDurationMs: 0,
  mostRecentActivityAt: 900,
});

const suggestionPage = (
  suggestions: TaskSuggestionPage['suggestions'],
): TaskSuggestionPage => ({ suggestions, now: 1_000 });

const deferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  const promise = new Promise<Value>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
};
