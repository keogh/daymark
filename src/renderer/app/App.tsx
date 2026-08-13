import { useEffect, useState } from 'react';

type HealthState = 'loading' | 'ready' | 'error';

export const App = () => {
  const [healthState, setHealthState] = useState<HealthState>('loading');

  useEffect(() => {
    let isActive = true;

    const checkHealth = async () => {
      try {
        const health = await window.timeTracker.system.healthCheck();

        if (isActive) {
          setHealthState(
            health.status === 'ok' && health.database === 'ready'
              ? 'ready'
              : 'error',
          );
        }
      } catch {
        if (isActive) {
          setHealthState('error');
        }
      }
    };

    void checkHealth();

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <main className="app-shell">
      <section aria-labelledby="app-title" className="app-shell__panel">
        <h1 id="app-title">Time Tracker</h1>

        {healthState === 'loading' && (
          <p aria-live="polite" className="app-shell__status" role="status">
            Checking application health…
          </p>
        )}

        {healthState === 'ready' && (
          <div aria-live="polite" className="app-shell__status" role="status">
            <p>Application ready.</p>
            <p>Local database connected.</p>
          </div>
        )}

        {healthState === 'error' && (
          <p
            className="app-shell__status app-shell__status--error"
            role="alert"
          >
            Application initialization failed.
          </p>
        )}
      </section>
    </main>
  );
};
