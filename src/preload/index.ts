import { contextBridge, ipcRenderer } from 'electron';

import { ANALYTICS_GET_SUMMARY_CHANNEL } from '@/shared/contracts/analytics';
import { HISTORY_GET_PAGE_CHANNEL } from '@/shared/contracts/history';
import {
  INTERVALS_DELETE_CHANNEL,
  INTERVALS_UPDATE_CHANNEL,
} from '@/shared/contracts/intervals';
import { MANUAL_TIME_CREATE_INTERVAL_CHANNEL } from '@/shared/contracts/manual-time';
import {
  SETTINGS_GET_CHANNEL,
  SETTINGS_SET_THEME_CHANNEL,
  SETTINGS_SET_WEEK_START_CHANNEL,
} from '@/shared/contracts/settings';
import {
  TASKS_DELETE_CHANNEL,
  TASKS_GET_DELETION_SUMMARY_CHANNEL,
  TASKS_GET_SUGGESTIONS_CHANNEL,
  TASKS_RENAME_CHANNEL,
} from '@/shared/contracts/tasks';
import {
  SYSTEM_HEALTH_CHECK_CHANNEL,
  type TimeTrackerAPI,
} from '@/shared/contracts/system-health';
import {
  TIMER_GET_STATE_CHANNEL,
  TIMER_PAUSE_CHANNEL,
  TIMER_RESUME_CHANNEL,
  TIMER_START_CHANNEL,
  TIMER_STOP_CHANNEL,
  TIMER_STATE_CHANGED_CHANNEL,
  TIMER_SWITCH_TO_TASK_CHANNEL,
} from '@/shared/contracts/timer';
import { productIdentity } from '@/shared/product-identity';

const timeTrackerApi: TimeTrackerAPI = {
  system: {
    healthCheck: () => ipcRenderer.invoke(SYSTEM_HEALTH_CHECK_CHANNEL),
  },
  timer: {
    getState: () => ipcRenderer.invoke(TIMER_GET_STATE_CHANNEL),
    start: (input) => ipcRenderer.invoke(TIMER_START_CHANNEL, input),
    switchToTask: (input) =>
      ipcRenderer.invoke(TIMER_SWITCH_TO_TASK_CHANNEL, input),
    pause: () => ipcRenderer.invoke(TIMER_PAUSE_CHANNEL),
    resume: () => ipcRenderer.invoke(TIMER_RESUME_CHANNEL),
    stop: () => ipcRenderer.invoke(TIMER_STOP_CHANNEL),
    onStateChanged: (listener) => {
      const wrappedListener = (_event: unknown, state: unknown) => {
        listener(state as Parameters<typeof listener>[0]);
      };
      ipcRenderer.on(TIMER_STATE_CHANGED_CHANNEL, wrappedListener);
      return () => {
        ipcRenderer.removeListener(
          TIMER_STATE_CHANGED_CHANNEL,
          wrappedListener,
        );
      };
    },
  },
  analytics: {
    getSummary: (input) =>
      ipcRenderer.invoke(ANALYTICS_GET_SUMMARY_CHANNEL, input),
  },
  settings: {
    get: () => ipcRenderer.invoke(SETTINGS_GET_CHANNEL),
    setWeekStartsOn: (input) =>
      ipcRenderer.invoke(SETTINGS_SET_WEEK_START_CHANNEL, input),
    setTheme: (input) => ipcRenderer.invoke(SETTINGS_SET_THEME_CHANNEL, input),
  },
  history: {
    getPage: (input) => ipcRenderer.invoke(HISTORY_GET_PAGE_CHANNEL, input),
  },
  intervals: {
    update: (input) => ipcRenderer.invoke(INTERVALS_UPDATE_CHANNEL, input),
    delete: (input) => ipcRenderer.invoke(INTERVALS_DELETE_CHANNEL, input),
  },
  manualTime: {
    createInterval: (input) =>
      ipcRenderer.invoke(MANUAL_TIME_CREATE_INTERVAL_CHANNEL, input),
  },
  tasks: {
    getSuggestions: (input) =>
      ipcRenderer.invoke(TASKS_GET_SUGGESTIONS_CHANNEL, input),
    rename: (input) => ipcRenderer.invoke(TASKS_RENAME_CHANNEL, input),
    delete: (input) => ipcRenderer.invoke(TASKS_DELETE_CHANNEL, input),
    getDeletionSummary: (input) =>
      ipcRenderer.invoke(TASKS_GET_DELETION_SUMMARY_CHANNEL, input),
  },
};

contextBridge.exposeInMainWorld(
  productIdentity.stable.preloadGlobal,
  timeTrackerApi,
);
