import { describe, expect, it, vi } from 'vitest';

import {
  squirrelLifecycleArguments,
  startMainProcess,
} from '@/main/app/windows-startup';

describe('Windows main-process startup', () => {
  it.each(squirrelLifecycleArguments)(
    'short-circuits %s before normal initialization',
    (argument) => {
      const registerNormalLifecycle = vi.fn();
      vi.stubGlobal('process', { ...process, platform: 'win32' });

      expect(
        startMainProcess(
          ['Time Tracker.exe', argument],
          registerNormalLifecycle,
        ),
      ).toBe(false);
      expect(registerNormalLifecycle).not.toHaveBeenCalled();

      vi.unstubAllGlobals();
    },
  );

  it('continues through ordinary Windows launch', () => {
    const registerNormalLifecycle = vi.fn();
    vi.stubGlobal('process', { ...process, platform: 'win32' });

    expect(
      startMainProcess(['Time Tracker.exe'], registerNormalLifecycle),
    ).toBe(true);
    expect(registerNormalLifecycle).toHaveBeenCalledOnce();

    vi.unstubAllGlobals();
  });
});
