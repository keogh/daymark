import { defineConfig } from 'vite';
import { sourceAliases } from './vite.aliases.ts';

export default defineConfig({
  resolve: {
    alias: sourceAliases,
  },
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'preload.cjs',
      },
    },
  },
});
