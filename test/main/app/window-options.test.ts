import { describe, expect, it } from 'vitest';

import { createMainWindowOptions } from '@/main/app/window-options';

describe('main window security configuration', () => {
  it('isolates and sandboxes the renderer without Node.js integration', () => {
    const options = createMainWindowOptions('/application/preload.js');

    expect(options.webPreferences).toMatchObject({
      contextIsolation: true,
      nodeIntegration: false,
      preload: '/application/preload.js',
      sandbox: true,
    });
  });

  it('uses the Daymark native window title', () => {
    expect(createMainWindowOptions('/application/preload.js').title).toBe(
      'Daymark',
    );
  });
});
