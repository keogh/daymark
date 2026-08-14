import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { describe, expect, it } from 'vitest';

const rendererFiles = [
  'src/renderer/main.tsx',
  'src/renderer/vite-env.d.ts',
  'src/renderer/app/App.tsx',
  'src/renderer/app/duration-format.ts',
  'src/renderer/app/use-display-duration.ts',
  'src/renderer/app/use-timer-controller.ts',
];

const forbiddenPatterns = [
  { label: 'Electron', pattern: /(?:from\s+|import\s*)['"]electron['"]/u },
  { label: 'raw ipcRenderer', pattern: /\bipcRenderer\b/u },
  { label: 'better-sqlite3', pattern: /\bbetter-sqlite3\b/u },
  {
    label: 'Node built-in imports',
    pattern: /(?:from\s+|import\s*)['"]node:/u,
  },
  { label: 'CommonJS require', pattern: /\brequire\s*\(/u },
  { label: 'Node process global', pattern: /\bprocess\s*\./u },
];

describe('renderer architecture boundaries', () => {
  it.each(rendererFiles)('%s uses only renderer-safe dependencies', (file) => {
    const source = readFileSync(resolve(file), 'utf8');

    for (const forbidden of forbiddenPatterns) {
      expect(source, `${file} must not access ${forbidden.label}`).not.toMatch(
        forbidden.pattern,
      );
    }
  });
});
