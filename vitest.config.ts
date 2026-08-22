import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';
import { sourceAliases } from './vite.aliases.ts';

export default defineConfig({
  test: {
    passWithNoTests: true,
    projects: [
      {
        resolve: {
          alias: sourceAliases,
        },
        test: {
          name: 'node',
          environment: 'node',
          include: ['test/{main,preload,shared,scripts}/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: sourceAliases,
        },
        test: {
          name: 'renderer',
          environment: 'jsdom',
          include: ['test/renderer/**/*.test.{ts,tsx}'],
          setupFiles: ['./test/renderer/setup.ts'],
        },
      },
    ],
  },
});
