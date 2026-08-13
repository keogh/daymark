import { describe, expect, it } from 'vitest';

import { createMainWindowOptions } from '../../../src/main/app/window-options';

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
});
