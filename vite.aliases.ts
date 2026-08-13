import { fileURLToPath } from 'node:url';

export const sourceAliases = {
  '@': fileURLToPath(new URL('./src', import.meta.url)),
};
