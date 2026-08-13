import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { sourceAliases } from './vite.aliases.ts';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: sourceAliases,
  },
});
