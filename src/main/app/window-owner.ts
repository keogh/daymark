export interface WindowCloseEvent {
  preventDefault(): void;
}

export interface OwnedWindow {
  isDestroyed(): boolean;
  isMinimized(): boolean;
  restore(): void;
  show(): void;
  focus(): void;
  hide(): void;
  on(event: 'close', listener: (event: WindowCloseEvent) => void): void;
  on(event: 'closed', listener: () => void): void;
  off(event: 'close', listener: (event: WindowCloseEvent) => void): void;
  off(event: 'closed', listener: () => void): void;
}

export interface MainWindowOwnerDependencies {
  readonly createWindow: () => OwnedWindow;
  readonly isQuitting: () => boolean;
  readonly requestForegroundAttention?: () => void;
}

export class MainWindowOwner {
  private window: OwnedWindow | undefined;
  private closeListener: ((event: WindowCloseEvent) => void) | undefined;
  private closedListener: (() => void) | undefined;
  private disposed = false;

  constructor(private readonly dependencies: MainWindowOwnerDependencies) {}

  open(): OwnedWindow | undefined {
    if (this.disposed || this.dependencies.isQuitting()) {
      return undefined;
    }

    const window = this.getUsableWindow() ?? this.createOwnedWindow();

    if (window.isMinimized()) {
      window.restore();
    }

    window.show();
    this.dependencies.requestForegroundAttention?.();
    window.focus();
    return window;
  }

  handleApplicationActivation(): void {
    this.open();
  }

  handleTrayDoubleClick(): void {
    this.open();
  }

  getWindow(): OwnedWindow | undefined {
    return this.getUsableWindow();
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }

    this.disposed = true;
    this.releaseWindow();
  }

  private createOwnedWindow(): OwnedWindow {
    const window = this.dependencies.createWindow();
    this.window = window;

    this.closeListener = (event) => {
      if (this.dependencies.isQuitting()) {
        return;
      }

      event.preventDefault();
      window.hide();
    };
    this.closedListener = () => {
      if (this.window === window) {
        this.releaseWindow();
      }
    };

    window.on('close', this.closeListener);
    window.on('closed', this.closedListener);
    return window;
  }

  private getUsableWindow(): OwnedWindow | undefined {
    if (this.window?.isDestroyed()) {
      this.releaseWindow();
    }

    return this.window;
  }

  private releaseWindow(): void {
    if (this.window && this.closeListener && this.closedListener) {
      this.window.off('close', this.closeListener);
      this.window.off('closed', this.closedListener);
    }

    this.window = undefined;
    this.closeListener = undefined;
    this.closedListener = undefined;
  }
}
