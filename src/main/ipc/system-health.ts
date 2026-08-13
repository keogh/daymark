import type { SystemHealthService } from '@/main/services/system-health';
import {
  SYSTEM_HEALTH_CHECK_CHANNEL,
  type SystemHealth,
} from '@/shared/contracts/system-health';

export interface SystemHealthIpcRegistrar {
  handle(channel: string, listener: (event: unknown) => SystemHealth): void;
}

export const registerSystemHealthHandler = (
  ipc: SystemHealthIpcRegistrar,
  healthService: Pick<SystemHealthService, 'healthCheck'>,
): void => {
  ipc.handle(SYSTEM_HEALTH_CHECK_CHANNEL, (): SystemHealth => {
    try {
      return healthService.healthCheck();
    } catch {
      return { status: 'error', database: 'unavailable' };
    }
  });
};
