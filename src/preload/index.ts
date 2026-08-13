import { contextBridge, ipcRenderer } from 'electron';

import {
  SYSTEM_HEALTH_CHECK_CHANNEL,
  type TimeTrackerAPI,
} from '@/shared/contracts/system-health';

const timeTrackerApi: TimeTrackerAPI = {
  system: {
    healthCheck: () => ipcRenderer.invoke(SYSTEM_HEALTH_CHECK_CHANNEL),
  },
};

contextBridge.exposeInMainWorld('timeTracker', timeTrackerApi);
