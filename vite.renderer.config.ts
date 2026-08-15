import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';
import { sourceAliases } from './vite.aliases.ts';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: sourceAliases,
  },
});
