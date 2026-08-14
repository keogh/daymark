import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '@/renderer/app/App';
import type {
  SystemHealth,
  TimeTrackerAPI,
} from '@/shared/contracts/system-health';

const setHealthCheck = (
  healthCheck: TimeTrackerAPI['system']['healthCheck'],
) => {
  Object.defineProperty(window, 'timeTracker', {
    configurable: true,
    value: {
      system: { healthCheck },
      timer: {
        getState: vi.fn(),
        start: vi.fn(),
        pause: vi.fn(),
        resume: vi.fn(),
        stop: vi.fn(),
      },
    } satisfies TimeTrackerAPI,
  });
};

const deferredHealth = () => {
  let resolve!: (health: SystemHealth) => void;
  const promise = new Promise<SystemHealth>((resolvePromise) => {
    resolve = resolvePromise;
  });

  return { promise, resolve };
};

describe('App', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows loading before rendering the ready database state', async () => {
    const health = deferredHealth();
    const healthCheck = vi.fn(() => health.promise);
    setHealthCheck(healthCheck);

    render(<App />);

    expect(healthCheck).toHaveBeenCalledOnce();
    expect(
      screen.getByRole('heading', { level: 1, name: 'Time Tracker' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking application health…',
    );

    health.resolve({ status: 'ok', database: 'ready' });

    expect(await screen.findByText('Application ready.')).toBeInTheDocument();
    expect(screen.getByText('Local database connected.')).toBeInTheDocument();
    expect(
      screen.queryByText('Checking application health…'),
    ).not.toBeInTheDocument();
  });

  it('shows an initialization failure for an unavailable database', async () => {
    const healthCheck = vi.fn().mockResolvedValue({
      status: 'error',
      database: 'unavailable',
    } satisfies SystemHealth);
    setHealthCheck(healthCheck);

    render(<App />);

    expect(healthCheck).toHaveBeenCalledOnce();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Application initialization failed.',
    );
    expect(
      screen.queryByText('Checking application health…'),
    ).not.toBeInTheDocument();
    expect(screen.queryByText('Application ready.')).not.toBeInTheDocument();
  });

  it('shows an initialization failure when the health check rejects', async () => {
    setHealthCheck(vi.fn().mockRejectedValue(new Error('IPC unavailable')));

    render(<App />);

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Application initialization failed.',
    );
  });
});
