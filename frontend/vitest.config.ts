import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()] as any,
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
      '~backend/client': path.resolve(__dirname, './client.ts'),
      '~backend': path.resolve(__dirname, '../backend'),
      '~encore': path.resolve(__dirname, '../backend/encore.gen'),
    },
  },
});
