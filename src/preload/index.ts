import { contextBridge, ipcRenderer } from 'electron';

import { HISTORY_GET_PAGE_CHANNEL } from '@/shared/contracts/history';
import {
  INTERVALS_DELETE_CHANNEL,
  INTERVALS_UPDATE_CHANNEL,
} from '@/shared/contracts/intervals';
import { MANUAL_TIME_CREATE_INTERVAL_CHANNEL } from '@/shared/contracts/manual-time';
import { TASKS_GET_SUGGESTIONS_CHANNEL } from '@/shared/contracts/tasks';
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
  TIMER_SWITCH_TO_TASK_CHANNEL,
} from '@/shared/contracts/timer';

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
  },
};

contextBridge.exposeInMainWorld('timeTracker', timeTrackerApi);
