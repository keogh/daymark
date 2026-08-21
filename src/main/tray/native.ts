import { Menu, Tray, type MenuItemConstructorOptions } from 'electron';

import type { TrayPresentation } from './presentation';

export interface NativeTrayMenuItem {
  readonly type: 'normal' | 'separator';
  readonly label?: string;
  readonly enabled?: boolean;
  readonly click?: () => void;
}

export interface NativeTrayHandle {
  setContextMenu(menu: unknown): void;
  setTitle(title: string): void;
  setToolTip(tooltip: string): void;
  destroy(): void;
  onDoubleClick?(listener: () => void): void;
}

export interface NativeTrayAdapter {
  createTray(): NativeTrayHandle;
  buildMenu(items: readonly NativeTrayMenuItem[]): unknown;
}

export class ElectronTrayAdapter implements NativeTrayAdapter {
  readonly #iconPath: string;

  constructor(iconPath: string) {
    this.#iconPath = iconPath;
  }

  createTray(): NativeTrayHandle {
    const tray = new Tray(this.#iconPath);
    return {
      setContextMenu: (menu) => tray.setContextMenu(menu as Menu),
      setTitle: (title) => tray.setTitle(title),
      setToolTip: (tooltip) => tray.setToolTip(tooltip),
      destroy: () => tray.destroy(),
      onDoubleClick: (listener) => tray.on('double-click', listener),
    };
  }

  buildMenu(items: readonly NativeTrayMenuItem[]): unknown {
    return Menu.buildFromTemplate(
      items.map((item): MenuItemConstructorOptions =>
        item.type === 'separator'
          ? { type: 'separator' }
          : {
              type: 'normal',
              label: item.label,
              enabled: item.enabled,
              click: item.click,
            },
      ),
    );
  }
}

export const applyTrayIdentity = (
  tray: NativeTrayHandle,
  presentation: TrayPresentation,
): void => {
  tray.setTitle(presentation.title);
  tray.setToolTip(presentation.tooltip);
};
