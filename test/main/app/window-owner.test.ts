import { describe, expect, it, vi } from 'vitest';

import {
  MainWindowOwner,
  type OwnedWindow,
  type WindowCloseEvent,
} from '@/main/app/window-owner';

class FakeWindow implements OwnedWindow {
  destroyed = false;
  minimized = false;
  visible = false;
  readonly restore = vi.fn(() => {
    this.minimized = false;
  });
  readonly show = vi.fn(() => {
    this.visible = true;
  });
  readonly focus = vi.fn();
  readonly hide = vi.fn(() => {
    this.visible = false;
  });
  private closeListeners = new Set<(event: WindowCloseEvent) => void>();
  private closedListeners = new Set<() => void>();

  isDestroyed(): boolean {
    return this.destroyed;
  }

  isMinimized(): boolean {
    return this.minimized;
  }

  on(
    event: 'close' | 'closed',
    listener: ((event: WindowCloseEvent) => void) | (() => void),
  ): void {
    if (event === 'close') {
      this.closeListeners.add(listener);
    } else {
      // The correlated event/listener overload is intentionally represented as a union in this fake.
      this.closedListeners.add(listener as () => void);
    }
  }

  off(
    event: 'close' | 'closed',
    listener: ((event: WindowCloseEvent) => void) | (() => void),
  ): void {
    if (event === 'close') {
      this.closeListeners.delete(listener);
    } else {
      // The correlated event/listener overload is intentionally represented as a union in this fake.
      this.closedListeners.delete(listener as () => void);
    }
  }

  close(): ReturnType<typeof vi.fn> {
    const preventDefault = vi.fn();
    for (const listener of this.closeListeners) {
      listener({ preventDefault });
    }
    return preventDefault;
  }

  destroyExceptionally(): void {
    this.destroyed = true;
    for (const listener of this.closedListeners) {
      listener();
    }
  }
}

const createHarness = () => {
  let quitting = false;
  const windows: FakeWindow[] = [];
  const createWindow = vi.fn(() => {
    const window = new FakeWindow();
    windows.push(window);
    return window;
  });
  const requestForegroundAttention = vi.fn();
  const owner = new MainWindowOwner({
    createWindow,
    isQuitting: () => quitting,
    requestForegroundAttention,
  });

  return {
    createWindow,
    owner,
    requestForegroundAttention,
    setQuitting: (value: boolean) => {
      quitting = value;
    },
    windows,
  };
};

describe('main window owner', () => {
  it.each(['idle', 'running', 'paused'])(
    'hides a normal close while %s without replacing the window',
    () => {
      const harness = createHarness();
      const window = harness.owner.open() as FakeWindow;

      const preventDefault = window.close();

      expect(preventDefault).toHaveBeenCalledOnce();
      expect(window.hide).toHaveBeenCalledOnce();
      expect(harness.owner.getWindow()).toBe(window);
      expect(harness.createWindow).toHaveBeenCalledOnce();
    },
  );

  it('restores, shows, focuses, and foregrounds one retained window', () => {
    const harness = createHarness();
    const window = harness.owner.open() as FakeWindow;
    window.minimized = true;
    window.visible = false;

    harness.owner.open();
    harness.owner.open();

    expect(harness.createWindow).toHaveBeenCalledOnce();
    expect(window.restore).toHaveBeenCalledOnce();
    expect(window.show).toHaveBeenCalledTimes(3);
    expect(window.focus).toHaveBeenCalledTimes(3);
    expect(harness.requestForegroundAttention).toHaveBeenCalledTimes(3);
  });

  it('creates exactly one secure-factory replacement after exceptional destruction', () => {
    const harness = createHarness();
    const firstWindow = harness.owner.open() as FakeWindow;
    firstWindow.destroyExceptionally();

    const replacement = harness.owner.open();
    harness.owner.open();

    expect(replacement).not.toBe(firstWindow);
    expect(harness.createWindow).toHaveBeenCalledTimes(2);
  });

  it('uses the same restore path for application activation and tray double-click', () => {
    const harness = createHarness();
    const window = harness.owner.open() as FakeWindow;
    window.visible = false;

    harness.owner.handleApplicationActivation();
    harness.owner.handleTrayDoubleClick();

    expect(harness.createWindow).toHaveBeenCalledOnce();
    expect(window.show).toHaveBeenCalledTimes(3);
    expect(window.focus).toHaveBeenCalledTimes(3);
  });

  it('allows close destruction and refuses restoration after quitting begins', () => {
    const harness = createHarness();
    const window = harness.owner.open() as FakeWindow;
    harness.setQuitting(true);

    const preventDefault = window.close();

    expect(preventDefault).not.toHaveBeenCalled();
    expect(window.hide).not.toHaveBeenCalled();
    expect(harness.owner.open()).toBeUndefined();
    expect(harness.createWindow).toHaveBeenCalledOnce();
  });

  it('releases listeners and its window reference idempotently', () => {
    const harness = createHarness();
    const window = harness.owner.open() as FakeWindow;

    harness.owner.dispose();
    harness.owner.dispose();

    expect(harness.owner.getWindow()).toBeUndefined();
    expect(window.close()).not.toHaveBeenCalled();
    expect(harness.owner.open()).toBeUndefined();
  });
});
